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
    dotenv@^17.2.0 \
    express-rate-limit@^6.11.2 \
    helmet@^8.1.0 \
    joi@^17.13.3 \
    jsonwebtoken@^9.0.2 \
    morgan@^1.10.0 \
    node-fetch@^3.3.2 \
    nodemailer@^6.9.8 \
    stripe@^14.12.0 \
    ws@^8.18.0

# Set package.json type to module for ES6 imports
RUN npm pkg set type=module

# Railway sets PORT for you
EXPOSE ${PORT:-8080}

CMD ["node", "server.js"]
