# Local Next.js app (pre-LAUNCH smoke). Supabase is started separately via `npx supabase start`.
FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=development
ENV HOST_CUTOVER_REDIRECT=off
ENV ENTITLEMENTS_ENFORCED=off
ENV NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
