FROM node:22-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ curl \
    && rm -rf /var/lib/apt/lists/*
# Lecture à voix haute : Piper + voix (~550 Mo, couche mise en cache tant que la liste des voix ne change pas)
COPY tts /tmp/tts
RUN sh /tmp/tts/install.sh /opt/piper && rm -rf /tmp/tts
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY public ./public
# Exécution sans privilèges (uid 1000 = utilisateur "node" de l'image)
ENV NODE_ENV=production TTS_DIR=/opt/piper DATA_DIR=/data DATABASE_URL=file:/data/folio.db HOME=/tmp
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8787
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node src/index.js"]
