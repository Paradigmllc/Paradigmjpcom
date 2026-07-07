FROM node:22.12.0-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8090

COPY package.json ./
COPY src ./src
COPY public ./public

RUN addgroup -g 1001 -S nodejs && adduser -S pipeline -u 1001
USER pipeline

EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '8090') + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
