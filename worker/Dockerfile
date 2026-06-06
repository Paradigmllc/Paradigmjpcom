# Form outreach worker image for Playwright Stealth, Crawlee, and Stagehand.
# Keep the Playwright base image version aligned with worker/package.json.
FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
