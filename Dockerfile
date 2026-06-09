FROM node:24-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"
COPY . .
RUN npm install 2>&1 | tail -3 && npm run build 2>&1 | tail -5
EXPOSE 3000
CMD ["node", "server.js"]
