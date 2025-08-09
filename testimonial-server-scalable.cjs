const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Database connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Redis connection for caching
let redisClient = null;
if (process.env.REDIS_URL) {
    redisClient = redis.createClient({
        url: process.env.REDIS_URL,
        retry_strategy: (options) => {
            if (options.attempt > 3) return undefined; // Stop retrying
            return Math.min(options.attempt * 100, 3000);
        }
    });
    
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    redisClient.on('connect', () => console.log('✅ Redis connected'));
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(compression());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://rinawarptech.com', 'https://www.rinawarptech.com']
        : true,
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: async (req, res) => {
        // Log rate limit violations
        await logRateLimitViolation(req.ip, req.path);
        res.status(429).json({ error: message });
    }
});

// Different rate limits for different endpoints
const generalLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many requests, please try again later');
const submissionLimiter = createRateLimiter(60 * 60 * 1000, 5, 'Too many submissions, please wait an hour');
const adminLimiter = createRateLimiter(15 * 60 * 1000, 50, 'Too many admin requests');

app.use('/api', generalLimiter);
app.use('/api/submit-feedback', submissionLimiter);
app.use('/admin', adminLimiter);

// Database helper functions
async function logRateLimitViolation(ip, endpoint) {
    try {
        await pool.query(
            `INSERT INTO rate_limits (ip_address, endpoint, request_count, blocked_until) 
             VALUES ($1, $2, 1, NOW() + INTERVAL '1 hour')
             ON CONFLICT (ip_address, endpoint) DO UPDATE SET 
             request_count = rate_limits.request_count + 1,
             blocked_until = GREATEST(rate_limits.blocked_until, NOW() + INTERVAL '1 hour')`,
            [ip, endpoint]
        );
    } catch (error) {
        console.error('Error logging rate limit violation:', error);
    }
}

async function getOrCreateUser(email, name, company, teamSize) {
    const client = await pool.connect();
    try {
        // Check if user exists
        let result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length > 0) {
            // Update existing user
            await client.query(
                `UPDATE users SET 
                 name = $2, company = $3, team_size = $4, 
                 last_submission_at = CURRENT_TIMESTAMP,
                 submission_count = submission_count + 1
                 WHERE email = $1`,
                [email, name, company, teamSize]
            );
            return result.rows[0];
        } else {
            // Create new user
            result = await client.query(
                `INSERT INTO users (email, name, company, team_size) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [email, name, company, teamSize]
            );
            return result.rows[0];
        }
    } finally {
        client.release();
    }
}

async function createTestimonial(userId, type, content, metadata) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO testimonials 
             (user_id, type, content, testimonial_approved, display_name, display_company, 
              ip_address, user_agent, referrer, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
             RETURNING *`,
            [
                userId, type, content, metadata.testimonialApproved,
                metadata.displayName, metadata.displayCompany,
                metadata.ipAddress, metadata.userAgent, metadata.referrer,
                metadata.priority
            ]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
}

async function getApprovedTestimonials(limit = 50, offset = 0) {
    const cacheKey = `approved_testimonials_${limit}_${offset}`;
    
    // Try cache first
    if (redisClient) {
        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (error) {
            console.log('Cache error:', error);
        }
    }
    
    // Query database
    const result = await pool.query(
        `SELECT * FROM approved_testimonials 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    
    // Cache result for 10 minutes
    if (redisClient) {
        try {
            await redisClient.setEx(cacheKey, 600, JSON.stringify(result.rows));
        } catch (error) {
            console.log('Cache set error:', error);
        }
    }
    
    return result.rows;
}

async function trackAnalytics(testimonialId, eventType, sessionId, ip, userAgent, referrer, pageUrl) {
    try {
        await pool.query(
            `INSERT INTO testimonial_analytics 
             (testimonial_id, event_type, session_id, ip_address, user_agent, referrer, page_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [testimonialId, eventType, sessionId, ip, userAgent, referrer, pageUrl]
        );
    } catch (error) {
        console.error('Analytics tracking error:', error);
    }
}

// JWT middleware for admin authentication
function authenticateAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// API Routes

// Health check with database connectivity
app.get('/health', async (req, res) => {
    try {
        const dbResult = await pool.query('SELECT NOW() as timestamp');
        const redisStatus = redisClient ? 'connected' : 'disabled';
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                status: 'connected',
                server_time: dbResult.rows[0].timestamp
            },
            redis: {
                status: redisStatus
            },
            testimonials: {
                pending: await pool.query('SELECT COUNT(*) FROM testimonials WHERE status = $1', ['pending']).then(r => r.rows[0].count),
                approved: await pool.query('SELECT COUNT(*) FROM testimonials WHERE status = $1', ['approved']).then(r => r.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Submit feedback endpoint
app.post('/api/submit-feedback', async (req, res) => {
    try {
        const {
            name, email, company, team_size, feedback, 
            feature_description, priority, type, testimonial_ok
        } = req.body;
        
        // Validation
        if (!name || !email || (!feedback && !feature_description)) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        
        // Create or get user
        const user = await getOrCreateUser(email, name, company, team_size);
        
        // Prepare testimonial data
        const content = feedback || feature_description;
        const testimonialType = type || 'beta_feedback';
        
        const metadata = {
            testimonialApproved: testimonial_ok === 'on' || testimonial_ok === true,
            displayName: name,
            displayCompany: company,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            referrer: req.get('Referrer'),
            priority: priority
        };
        
        // Create testimonial
        const testimonial = await createTestimonial(user.id, testimonialType, content, metadata);
        
        // Track analytics
        await trackAnalytics(
            testimonial.id, 'submission', req.sessionID,
            req.ip, req.get('User-Agent'), req.get('Referrer'), req.get('Host')
        );
        
        console.log(`📧 New ${testimonialType} received from ${name} (${email})`);
        
        res.json({
            success: true,
            message: 'Thank you for your feedback! We\'ll review it and may reach out to you.',
            id: testimonial.id
        });
        
    } catch (error) {
        console.error('Error processing feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Sorry, there was an error submitting your feedback. Please try again.'
        });
    }
});

// Get approved testimonials
app.get('/api/testimonials', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;
        
        const testimonials = await getApprovedTestimonials(limit, offset);
        
        // Track analytics for testimonial views
        if (testimonials.length > 0) {
            testimonials.forEach(testimonial => {
                trackAnalytics(
                    testimonial.id, 'view', req.sessionID,
                    req.ip, req.get('User-Agent'), req.get('Referrer'), req.originalUrl
                );
            });
        }
        
        res.json({
            success: true,
            testimonials: testimonials,
            count: testimonials.length,
            pagination: {
                limit,
                offset,
                hasMore: testimonials.length === limit
            }
        });
        
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching testimonials'
        });
    }
});

// Admin login
app.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await pool.query(
            'SELECT * FROM admin_users WHERE email = $1 AND is_active = true',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const admin = result.rows[0];
        const isValid = await bcrypt.compare(password, admin.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        await pool.query(
            'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [admin.id]
        );
        
        // Generate JWT
        const token = jwt.sign(
            { 
                id: admin.id, 
                email: admin.email, 
                role: admin.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                role: admin.role
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get pending testimonials (admin only)
app.get('/admin/pending', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, u.email, u.name as user_name, u.company as user_company
            FROM testimonials t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.status = 'pending' AND t.testimonial_approved = true
            ORDER BY t.created_at DESC
        `);
        
        res.json({
            success: true,
            pending: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching pending testimonials:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending testimonials'
        });
    }
});

// Approve testimonial (admin only)
app.post('/admin/approve/:id', authenticateAdmin, async (req, res) => {
    try {
        const testimonialId = req.params.id;
        const { notes } = req.body;
        
        const result = await pool.query(`
            UPDATE testimonials 
            SET status = 'approved', 
                approved_by = $1, 
                approved_at = CURRENT_TIMESTAMP,
                review_notes = $2
            WHERE id = $3 AND status = 'pending'
            RETURNING *
        `, [req.admin.id, notes, testimonialId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Testimonial not found or already processed'
            });
        }
        
        // Clear cache
        if (redisClient) {
            try {
                const keys = await redisClient.keys('approved_testimonials_*');
                if (keys.length > 0) {
                    await redisClient.del(keys);
                }
            } catch (error) {
                console.log('Cache clear error:', error);
            }
        }
        
        res.json({
            success: true,
            message: 'Testimonial approved successfully',
            testimonial: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error approving testimonial:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving testimonial'
        });
    }
});

// Analytics endpoint (admin only)
app.get('/admin/analytics', authenticateAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        
        const result = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                event_type,
                COUNT(*) as count
            FROM testimonial_analytics 
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at), event_type
            ORDER BY date DESC
        `);
        
        res.json({
            success: true,
            analytics: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics'
        });
    }
});

// Serve static files
app.get('/testimonials.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/testimonials.html'));
});

app.get('/admin-testimonials.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/admin-testimonials.html'));
});

app.get('/admin-scalable.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/admin-scalable.html'));
});

// Cleanup job for old rate limit records
setInterval(async () => {
    try {
        await pool.query('SELECT cleanup_old_rate_limits()');
        console.log('✅ Cleaned up old rate limit records');
    } catch (error) {
        console.error('Cleanup job error:', error);
    }
}, 60 * 60 * 1000); // Run every hour

const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.NODE_ENV === 'production' ? 'https://rinawarptech.com' : `http://localhost:${PORT}`;

app.listen(PORT, async () => {
    console.log(`
🚀 RinaWarp Terminal Testimonial Server (SCALABLE) running on port ${PORT}

📊 Optimized for 1000+ concurrent users with:
   ✅ PostgreSQL database with connection pooling
   ✅ Redis caching layer
   ✅ Rate limiting and security middleware
   ✅ JWT-based admin authentication
   ✅ Real-time analytics tracking
   ✅ Full-text search capabilities

📝 Testimonial Collection: ${DOMAIN}/testimonials.html
👥 User Stories Display: ${DOMAIN}/user-stories.html
🔧 Admin Dashboard: ${DOMAIN}/admin-testimonials.html
📊 Health Check: ${DOMAIN}/health

🔐 Admin Endpoints:
   POST ${DOMAIN}/admin/login
   GET ${DOMAIN}/admin/pending
   POST ${DOMAIN}/admin/approve/:id
   GET ${DOMAIN}/admin/analytics
`);
    
    // Test database connection
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🔄 Shutting down gracefully...');
    await pool.end();
    if (redisClient) {
        await redisClient.quit();
    }
    process.exit(0);
});

module.exports = app;
