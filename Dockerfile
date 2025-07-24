FROM node:20-alpine

# Install python/make/g++ for node-gyp native dependencies
RUN apk add --no-cache python3 make g++

# Set environment variables
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove prepare script if it exists
RUN npm pkg delete scripts.prepare 2>/dev/null || true

# Install dependencies with modern syntax
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

# Copy the rest of the app
COPY . .

# Use a static port here (Railway maps it automatically)
EXPOSE 8080

# Start the app
CMD ["node", "server.js"]
