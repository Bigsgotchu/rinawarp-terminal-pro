FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=production

WORKDIR /app

# Copy only server files needed for runtime
COPY server.js ./
COPY src ./src/
COPY public ./public/
COPY styles ./styles/
COPY email-templates ./email-templates/

# Install only production runtime dependencies manually
RUN npm init -y && \
    npm install --no-audit --no-fund \
    express@^4.21.2 \
    cors@^2.8.5 \
    dotenv@^17.2.1 \
    express-rate-limit@^7.4.1 \
    helmet@^8.1.0 \
    joi@^17.13.3 \
    jsonwebtoken@^9.0.2 \
    morgan@^1.10.0 \
    node-fetch@^3.3.2 \
    nodemailer@^6.10.1 \
    stripe@^16.12.0 \
    ws@^8.18.0 \
    openai@^4.67.1 \
    @anthropic-ai/sdk@^0.24.3

# Set package.json type to module for ES6 imports
RUN npm pkg set type=module

# Railway sets PORT for you
EXPOSE ${PORT:-8080}

CMD ["node", "server.js"]
