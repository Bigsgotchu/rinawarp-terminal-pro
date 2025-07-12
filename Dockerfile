FROM node:20

# Verify we have the correct Node.js image
RUN echo "=== Node.js Image Verification ===" && cat /etc/os-release && node -v && npm -v

# Set environment variables
ENV NODE_ENV=production
# PORT will be set by Railway dynamically

# Debug environment variables
RUN echo "Environment variables set:" && echo "NODE_ENV=$NODE_ENV"

WORKDIR /app

COPY package.json package-lock.json ./

RUN node -v && npm -v && which npm || echo "npm not found"

# Remove husky prepare script to avoid "husky: not found" error in production
RUN npm pkg delete scripts.prepare

# Install build tools for native modules (bcrypt)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

RUN npm install --omit=dev --no-audit --no-fund

# Copy application code
COPY . .

# Expose the port (Railway typically uses 8080)
EXPOSE 8080

# Start the main server with all features
CMD ["node", "server.js"]
# Force complete rebuild 07/04/2025 20:39:12 - Breaking Railway cache
