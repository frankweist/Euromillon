FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
# Prefer `npm ci` when a lockfile exists, otherwise fall back to `npm install`
RUN sh -c 'if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi'
COPY . .
EXPOSE 3003
CMD ["node", "server.js"]
