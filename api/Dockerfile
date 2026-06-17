# 1. Aşama: Build (İnşa)
FROM node:20-alpine AS build
WORKDIR /app
# Sadece paket listelerini kopyalayıp bağımlılıkları yüklüyoruz (Cache avantajı)
COPY package*.json ./
RUN npm ci
# Uygulama kodlarını kopyala
COPY . .
# Üretim (production) dışı bağımlılıkları temizle (DevDependencies silinir)
# Böylece runtime aşamasına temiz node_modules aktarabiliriz
RUN npm prune --omit=dev
# 2. Aşama: Production (Çalışma Zamanı)
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Sadece prodüksiyon için gerekli bağımlılıkları yükle
COPY package*.json ./
RUN npm ci --omit=dev
# Çalışma zamanı klasörünü güvenli node kullanıcısına ata
RUN chown -R node:node /app
# Sadece gerekli dosya/klasörleri inşa aşamasından kopyala (Gereksiz dosyalar dışarıda kalır)
COPY --from=build /app/app.js   ./app.js
COPY --from=build /app/bin      ./bin
COPY --from=build /app/config   ./config
COPY --from=build /app/db       ./db
COPY --from=build /app/lib      ./lib
COPY --from=build /app/routes   ./routes
COPY --from=build /app/views    ./views
COPY --from=build /app/public   ./public
COPY --from=build /app/i18n     ./i18n
# Gerekli dosyaları ve temizlenmiş bağımlılıkları (node_modules) birinci aşamadan kopyala
# Dosya sahipliğini node kullanıcısına veriyoruz
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/app.js       ./app.js
COPY --from=build --chown=node:node /app/bin          ./bin
COPY --from=build --chown=node:node /app/config       ./config
COPY --from=build --chown=node:node /app/db           ./db
COPY --from=build --chown=node:node /app/lib          ./lib
COPY --from=build --chown=node:node /app/routes       ./routes
COPY --from=build --chown=node:node /app/views        ./views
COPY --from=build --chown=node:node /app/public       ./public
COPY --from=build --chown=node:node /app/i18n         ./i18n
# Yetkisiz (Non-root) kullanıcıya geç (Güvenlik Hardening)
USER node
# Uygulamanın çalışacağı port (Default 3000)
EXPOSE 3000
# Uygulamayı başlat
CMD ["node", "./bin/www"]