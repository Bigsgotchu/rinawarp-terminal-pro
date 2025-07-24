FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=production

# System dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies without dev/test scripts
COPY package*.json ./
RUN npm pkg delete scripts.prepare 2>/dev/null || true
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

# Copy full app source
COPY . .

# Railway sets PORT for you
EXPOSE ${PORT:-8080}

CMD ["node", "server.js"]
