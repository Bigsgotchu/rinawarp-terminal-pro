FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=production

WORKDIR /app

# Copy minimal test server for Railway deployment validation
COPY minimal-test-server.js ./
COPY package.json ./

# Use existing package.json to ensure dependency compatibility
RUN npm install --only=production --no-audit --no-fund express@^5.1.0

# Railway sets PORT for you
EXPOSE ${PORT:-8080}

CMD ["node", "minimal-test-server.js"]
