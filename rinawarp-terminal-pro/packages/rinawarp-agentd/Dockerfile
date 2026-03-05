FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm typescript

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages

RUN pnpm install --frozen-lockfile

WORKDIR /app/packages/rinawarp-agentd
CMD ["node", "dist/index.js"]
