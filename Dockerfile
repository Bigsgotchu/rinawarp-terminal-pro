# RinaWarp Terminal Production Build
FROM node:20-alpine

# Set production environment
ENV NODE_ENV=production
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (we'll need dev deps for some AI features)
RUN npm ci --include=dev --no-audit --no-fund

# Copy source code
COPY . .

# Set module type
RUN npm pkg set type=module

# Expose Railway's dynamic port
EXPOSE ${PORT:-8080}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "
        import http from 'http';
        const port = process.env.PORT || 8080;
        const req = http.request({ hostname: 'localhost', port, path: '/api/status/health', timeout: 5000 }, (res) => {
            process.exit(res.statusCode === 200 ? 0 : 1);
        });
        req.on('error', () => process.exit(1));
        req.end();
    "

# Start command
CMD ["npm", "run", "server"]
