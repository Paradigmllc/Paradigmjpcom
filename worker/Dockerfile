# ④フォーム営業 worker — 案2 (ローカル Chromium 同梱) 用イメージ
# 案1 (CDP リモートブラウザ) なら node:20-slim で十分・本イメージ不要。
#
# Playwright 公式イメージは Chromium + 依存ライブラリを同梱済 (install:browser 不要)。
# バージョンは package.json の playwright と一致させること。
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

# 依存だけ先に入れてレイヤキャッシュを効かせる
COPY package.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# scale-to-zero: Coolify 側で idle 停止を設定 (常時稼働禁止)
CMD ["npm", "start"]
