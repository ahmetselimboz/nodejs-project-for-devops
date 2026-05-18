# 1. Aşama: Build (İnşa)
FROM node:20-alpine AS build
WORKDIR /app
# Sadece paket listelerini kopyalayıp bağımlılıkları yüklüyoruz (Cache avantajı)
COPY package*.json ./
RUN npm ci

# Uygulama kodlarını kopyala
COPY . .

# 2. Aşama: Production (Çalışma Zamanı)
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Sadece prodüksiyon için gerekli bağımlılıkları yükle
COPY package*.json ./
RUN npm ci --omit=dev

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

# Uygulamanın çalışacağı port (Default 3000)
EXPOSE 3000

# Uygulamayı başlat
CMD ["node", "./bin/www"]
