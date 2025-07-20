#!/usr/bin/env node

/**
 * 🚀 RinaWarp Dashboard Server
 * Simple HTTP server to serve the dashboard and avoid CORS issues
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ROOT_DIR = __dirname;

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

function serveDashboard(req, res) {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;

    // Default to the new main terminal interface
    if (pathname === '/') {
        pathname = '/src/terminal-main.html';
    }
    
    // Handle specific routes
    if (pathname === '/dashboard') {
        pathname = '/src/dashboard/DeveloperDashboard.html';
    }
    
    if (pathname === '/standalone') {
        pathname = '/src/dashboard/StandaloneDashboard.html';
    }
    
    // Handle architecture diagram route
    if (pathname === '/diagram') {
        pathname = '/docs/architecture-diagram.html';
    }

    const filePath = path.join(ROOT_DIR, pathname);

    // Security check - ensure we're not serving files outside our directory
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end(`
                    <html>
                        <head><title>404 - Not Found</title></head>
                        <body style="font-family: monospace; background: #000; color: #fff; padding: 20px;">
                            <h1>🔍 File Not Found</h1>
                            <p>The requested file was not found: ${pathname}</p>
                            <p><a href="/" style="color: #00ff88;">🎛️ Go to Dashboard</a> | <a href="/diagram" style="color: #66d9ef;">📊 View Architecture Diagram</a></p>
                        </body>
                    </html>
                `);
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.message}`);
            }
            return;
        }

        const mimeType = getMimeType(filePath);
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(data);
    });
}

const server = http.createServer(serveDashboard);

server.listen(PORT, 'localhost', () => {
    console.log(`🚀 RinaWarp Terminal Server running at:`);
    console.log(`   🖥️  Terminal:      http://localhost:${PORT}/`);
    console.log(`   📊 Dashboard:     http://localhost:${PORT}/dashboard`);
    console.log(`   🎛️  Standalone:    http://localhost:${PORT}/standalone`);
    console.log(`   🏗️  Architecture:  http://localhost:${PORT}/diagram`);
    console.log('');
    console.log('🎯 The terminal is now the main interface - dashboard is accessible as a tab!');
    console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down dashboard server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});
