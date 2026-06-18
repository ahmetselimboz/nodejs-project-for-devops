# Ders 2: Docker ve Konteyner Ekosistemi

Bu ders notunda; konteynerlerin çıkış sebebini, sanal makinelerle olan mimari farklarını, Docker bileşenlerini, Dockerfile yazma kurallarını, çok aşamalı (Multi-stage) inşayı, imaj boyutu ve güvenliği optimizasyonlarını ve Docker Compose yapısını en ince ayrıntısına kadar ele alacağız.

---

## 1. Konteyner Teknolojisine Giriş

### A. "Cehennem Matrisi" (Matrix of Hell) ve Çıkış Sebebi
Yazılım dünyasında geleneksel dağıtım (deployment) süreçlerinde büyük bir problem vardı: Uygulamanın geliştirildiği bilgisayardaki kütüphane versiyonları, işletim sistemi ayarları ve bağımlılıklar, sunucudaki (production) ortam ile uyuşmuyordu. Bu durum ünlü *"Ama benim makinemde çalışıyordu!"* argümanını doğurdu.

Konteyner teknolojisi; uygulamayı, onun tüm bağımlılıklarını (kütüphaneler, runtime, sistem araçları) tek bir kutu (konteyner) içine koyarak işletim sisteminden izole eder. Bu sayede uygulama, üzerinde Docker koşan herhangi bir bilgisayarda (Mac, Windows, Linux sunucusu) birebir aynı şekilde çalışır.

### B. Sanal Makineler (VM) vs Konteynerler
Sanal Makineler (Virtual Machines) ve Konteynerler izolasyon sağlar ancak çalışma mimarileri tamamen farklıdır:

```
+---------------------------+     +---------------------------+
|   Uygulama A | Uygulama B |     |   Uygulama A | Uygulama B |
+---------------------------+     +---------------------------+
|    Kütüphaneler/Sistem    |     |    Kütüphaneler/Sistem    |
+---------------------------+     +---------------------------+
|    Misafir OS (Guest OS)  |     |      Docker Engine        |
+---------------------------+     +---------------------------+
|    Hypervisor (ESXi/KVM)  |     |    Host İşletim Sistemi   |
+---------------------------+     +---------------------------+
|     Fiziksel Sunucu       |     |     Fiziksel Sunucu       |
+---------------------------+     +---------------------------+
|    SANAL MAKİNE (VM)      |     |     KONTEYNER (DOCKER)     |
+---------------------------+     +---------------------------+
```

| Özellik | Sanal Makineler (VM) | Konteynerler (Docker) |
| :--- | :--- | :--- |
| **İşletim Sistemi** | Her VM kendi işletim sistemini (Guest OS) çalıştırır. | Host işletim sisteminin çekirdeğini (Kernel) paylaşır. |
| **Boyut** | Gigabaytlarca yer kaplar (min 1-2 GB). | Megabaytlar mertebesindedir (min 5-100 MB). |
| **Başlangıç Süresi** | Dakikalar sürer (OS boot süresi). | Saniyeler veya milisaniyeler sürer. |
| **Kaynak Tüketimi** | CPU/RAM baştan rezerve edilir ve harcanır. | Sadece uygulamanın o an ihtiyaç duyduğu kadar kaynak tüketir. |
| **Performans** | Hypervisor katmanı yüzünden donanım kaybı olur. | Doğrudan host işletim sistemi üzerinde koştuğu için yerel (bare-metal) performansa yakındır. |

---

## 2. Docker Mimarisi ve Bileşenleri

Docker, istemci-sunucu (client-server) mimarisine sahiptir:

1. **Docker CLI (Client):** Kullanıcının komutları yazdığı arayüzdür (`docker build`, `docker run`).
2. **Docker Daemon (`dockerd`):** Sunucu kısmıdır. Arka planda çalışır, CLI'dan gelen istekleri dinler ve imajları, konteynerleri, ağları yönetir.
3. **Containerd & runC:** Docker Daemon'ın altında yer alan, konteynerleri gerçekten çalıştıran ve OCI (Open Container Initiative) standartlarına uyan alt seviye araçlardır.
4. **Docker Registry (Docker Hub):** İmajların depolandığı kütüphanedir. `docker pull` dediğimizde imajlar buradan çekilir.

---

## 3. Temel Kavramlar: İmaj, Konteyner, Hacim (Volume) ve Ağ (Network)

### A. Image (İmza/Kalıp) vs Container (Konteyner/Çalışan Kopya)
* **Image (İmaj):** Uygulamanın çalışması için gereken kodları, kütüphaneleri ve yapılandırmaları içeren salt okunur (read-only) şablondur. Bir yemek tarifine veya programlamadaki bir **Sınıfa (Class)** benzetilebilir.
* **Container (Konteyner):** İmajın çalışan canlı bir kopyasıdır (instance). Yemek tarifine göre yapılmış yemek veya sınıftan üretilmiş bir **Nesne (Object)** gibidir. Üzerine yazılabilir bir katmana (Writable Layer) sahiptir.

### B. Konteynerlerin Geçiciliği (Ephemeral Nature) ve Hacimler (Volumes)
Konteynerler geçici (stateless/ephemeral) yapılardır. Bir konteyner durdurulup silindiğinde, içerisine yazılan tüm veriler (veritabanı kayıtları, loglar, yüklenen dosyalar) yok olur. Verileri kalıcı kılmak için **Docker Volumes** kullanılır.

#### Hacim Çeşitleri:
1. **Named Volumes (İsimlendirilmiş Hacimler):** Docker'ın kendi yönettiği disk alanında oluşturulur (`/var/lib/docker/volumes/`). Dosya yollarını Docker yönetir. Üretim ortamlarında (veritabanı verileri vb.) tercih edilir.
2. **Bind Mounts (Dizin Eşleme):** Host makinedeki belirli bir klasörü (`/home/devops/logs`) doğrudan konteynerin içine bağlarız. Geliştirme aşamasında kodları canlı senkronize etmek için çok kullanışlıdır.
3. **Tmpfs Mounts:** Verileri sadece RAM üzerinde tutar, diske yazmaz. Yüksek hızlı geçici işlemler veya hassas gizli veriler için kullanılır.

### C. Docker Ağ Sürücüleri (Networking)
Docker konteynerleri dış dünyadan izole ağlarda çalıştırır. 5 temel ağ sürücüsü vardır:
* **Bridge (Köprü - Varsayılan):** Konteynerler kendi aralarında izole bir özel ağ kurarlar. Dış dünyaya port açarak (`-p 80:3000`) erişilirler.
* **Host:** Konteynerin ağ izolasyonunu kaldırır. Konteyner doğrudan sunucunun (host) portlarını kullanır. (Performans gerektiren durumlarda kullanılır).
* **Overlay:** Birden fazla fiziksel sunucunun (Swarm/Kubernetes) üzerindeki konteynerlerin birbirleriyle sanki aynı sunucudalarmış gibi konuşmasını sağlar.
* **Macvlan:** Konteynerlere ağdaki fiziksel yönlendiriciden (router) doğrudan bir MAC adresi atar. Konteyner ağda fiziksel bir makine gibi görünür.
* **None:** Konteynerin ağ kartını söker. İnternet ve ağ erişimi olmayan tamamen izole konteynerler için kullanılır.

---

## 4. Senior Seviye Dockerfile Yazımı ve Optimizasyon

Bir Dockerfile, imajın nasıl oluşturulacağını belirten talimatlar dosyasıdır. Senior bir DevOps mühendisi, Dockerfile yazarken **imaj boyutunu küçültmeye, güvenliği artırmaya ve build süresini (cache) optimize etmeye** odaklanır.

### A. Temel Dockerfile Komutları
* `FROM`: Baz alınacak başlangıç imajı (örn: `FROM node:20`).
* `WORKDIR`: Konteyner içindeki çalışma dizini (örn: `/app`).
* `COPY` vs `ADD`: Yerel dosyaları imaja kopyalar. `COPY` düz kopyalama yaparken, `ADD` uzak URL'lerden dosya çekebilir veya `.tar.gz` arşivlerini otomatik açabilir. Güvenlik için her zaman `COPY` tercih edilmelidir.
* `RUN`: Build aşamasında komut çalıştırmak için kullanılır (`RUN npm install`). Her RUN komutu yeni bir imaj katmanı üretir.
* `CMD` vs `ENTRYPOINT`: Konteyner başladığında çalışacak ana komutu belirler. `ENTRYPOINT` değiştirilemez ana komuttur, `CMD` ise bu komuta geçilen varsayılan parametrelerdir.
* `ENV` vs `ARG`: `ENV` konteyner çalışırken de var olan ortam değişkenleridir. `ARG` ise sadece build (inşa) anında geçerli olan geçici değişkenlerdir.

---

### B. Katman Önceliği ve Cache Optimizasyonu
Docker imajları katmanlar (layers) halinde oluşturulur. Değişmeyen katmanlar önbelleğe alınır (cache). Eğer bir katman değişirse, ondan sonraki tüm katmanlar sıfırdan yeniden oluşturulur.

#### Kötü Örnek (Her kod değişiminde bağımlılıkları baştan yükler):
```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "app.js"]
```
* **Neden Kötü?** Herhangi bir JS kodunu değiştirdiğinde `COPY . .` satırı değiştiği için Docker sonraki `RUN npm install` önbelleğini bozar ve yüzlerce paketi baştan indirir.

#### Senior Örnek (Cache Dostu):
```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "app.js"]
```
* **Neden İyi?** Kodun değişse bile `package.json` değişmediği sürece `RUN npm install` satırı çalıştırılmaz, doğrudan cache'ten alınır. Build işlemi saniyeler sürer.

---

### C. Multi-Stage Builds (Çok Aşamalı İnşa)
Uygulamayı derlemek/inşa etmek için gereken araçlar (compiler, SDK, devDependencies), uygulamanın canlıda (production) çalışması için gerekli değildir. Bunları imajın içinde bırakmak imaj boyutunu büyüterek disk israfına ve güvenlik açıklarına (CVE) sebep olur.

Multi-stage build ile imaj inşası iki aşamaya bölünür:
1. **Build Aşaması:** Tüm bağımlılıklar yüklenir, kodlar derlenir.
2. **Production/Runtime Aşaması:** Sadece derlenmiş kodlar ve üretim kütüphaneleri birinci aşamadan kopyalanır, geri kalan tüm derleme araçları çöpe atılır.

---

### D. İmaj Taban Seçimi: Alpine vs Distroless
* **Standard Node Image (node:20):** İçinde tam bir Linux işletim sistemi araçları (bash, curl, apt, python vb.) barındırır. Boyutu ~1 GB civarındadır.
* **Alpine Image (node:20-alpine):** Çok küçük bir Linux dağıtımıdır (Musl libc ve BusyBox kullanır). Boyutu ~100-150 MB civarındadır. Çoğu sunucu için idealdir ancak bazı C++ kütüphaneleriyle uyumsuzluk yaşayabilir.
* **Distroless Image (En Senior / En Güvenli):** İçinde işletim sistemi kabuğu (shell - bash/sh), paket yöneticisi (apt) veya temel Linux araçları olmayan, **sadece ve sadece Node.js runtime'ını** barındıran imajdır. Boyutu çok küçüktür ve saldırganlar imaja sızsa bile çalıştırabilecekleri bir terminal bulunmadığı için güvenlik düzeyi en üst seviyededir.

---

### E. Uygulamalı Görev 2.3: Proje Dockerfile Optimizasyonu (Senior Hardening)
Mevcut projemizdeki [Dockerfile](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/api/Dockerfile) dosyasını senior standartlarına uygun şekilde optimize ettik.

#### Orijinal Yapıdaki Sorunlar ve Çözümlerimiz:
1. **Mükerrer Paket İndirme Sorunu (Performans):**
   * *Sorun:* Orijinal `Dockerfile` dosyasında `build` aşamasında `npm ci` koşturulurken, `runtime` aşamasında tekrar `npm ci --omit=dev` çalıştırılıyordu. Bu durum internetten bağımlılıkların iki kez indirilmesine sebep olarak hem zaman kaybına hem de internet bant genişliği israfına sebep oluyordu.
   * *Çözüm:* `build` aşamasında tüm paketler kurulduktan sonra `RUN npm prune --omit=dev` komutunu çalıştırarak sadece devDependencies'leri sildik. Ardından `runtime` aşamasında `npm` çalıştırmadan, temizlenen `node_modules` klasörünü doğrudan kopyaladık:
     `COPY --from=build /app/node_modules ./node_modules`
2. **Konteynerin Root Olarak Çalışması (Güvenlik Açığı):**
   * *Sorun:* Uygulama `root` kullanıcısı ile çalışıyordu. Sızma durumunda saldırgan sunucuda root yetkisi kazanabilirdi.
   * *Çözüm:* Dosyaları kopyalarken `--chown=node:node` ile sahipliği alpine imajında varsayılan olarak gelen yetkisiz `node` kullanıcısına atadık ve en alta `USER node` komutunu ekleyerek uygulamanın root yetkileri olmadan çalışmasını garanti altına aldık.

#### Güncellenmiş Optimize [Dockerfile](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/api/Dockerfile) İçeriği:
```dockerfile
# 1. Aşama: Build (İnşa)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm prune --omit=dev

# 2. Aşama: Production (Çalışma Zamanı)
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Çalışma zamanı klasörünü güvenli node kullanıcısına ata
RUN chown -R node:node /app

# Dosyaları yetkisiz node kullanıcısı sahipliğiyle kopyala
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

USER node
EXPOSE 3000
CMD ["node", "./bin/www"]
```

#### İmaj Derleme, Çalıştırma ve Geri Alma (Rollback) Komutları:
* **İmajı Derleme (Sürüm Etiketleme):**
  ```bash
  docker build -t asb00/nodejs-devops-api:1.0.0 ./api
  ```
* **Konteyneri Başlatma:**
  ```bash
  docker run -d --name my-api -p 3000:3000 asb00/nodejs-devops-api:1.0.0
  ```
* **Geri Alma (Rollback) Adımı:**
  Eğer `1.0.0` sürümü canlıda hata verirse, hızlıca bir önceki stabil sürüme (örn: `0.9.0`) geri dönmek için çalışan hatalı konteyner durdurulur ve eski etiketli imaj çalıştırılır:
  ```bash
  docker stop my-api && docker rm my-api
  docker run -d --name my-api -p 3000:3000 asb00/nodejs-devops-api:0.9.0
  ```

---

## 5. Docker Compose ile Çoklu Konteyner Orkestrasyonu

Docker Compose, tek bir host üzerinde birden fazla konteyneri tek bir yapılandırma dosyası (`docker-compose.yml`) ile tanımlamamızı ve yönetmemizi sağlar.

### Kritik Parametreler ve Senior Best Practices:

1. **`depends_on` ve Health Check:**
   Sadece `depends_on: - mongo` yazmak, API konteynerinin Mongo konteyneri başlar başlamaz çalışmasını söyler. Ancak Mongo'nun başlamış olması, veritabanının sorgu kabul etmeye **hazır olduğu anlamına gelmez**. Gerçek entegrasyon için healthcheck kontrol edilmelidir:
   ```yaml
   services:
     api:
       depends_on:
         mongo:
           condition: service_healthy
     mongo:
       healthcheck:
         test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
         interval: 10s
         timeout: 5s
         retries: 5
   ```

2. **Kaynak Sınırlandırması (Resource Limits):**
   Bir konteynerin sunucudaki tüm CPU ve RAM'i sömürmesini engellemek için limitler konmalıdır:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '0.50'     # En fazla yarım çekirdek kullanabilir
         memory: 512M     # En fazla 512 MB RAM kullanabilir
       reservations:
         cpus: '0.25'
         memory: 256M
   ```

3. **Restart Politikaları (`restart: unless-stopped`):**
   Uygulama çöktüğünde veya sunucu yeniden başladığında konteynerlerin otomatik ayağa kalkması sağlanır. `unless-stopped`, kullanıcı manuel durdurmadığı sürece konteynerin her zaman çalıştırılmasını garanti eder.

## 6. Sunucuya Docker ve Docker Compose Kurulumu (Uygulamalı)

*Bu kısım, sunucumuzda (Ubuntu 25.10 x64) gerçekleştirdiğimiz resmi Docker Engine ve Docker Compose Plugin kurulum adımlarını dökümante eder.*

### A. Neden Resmi Depodan Kuruyoruz?
Ubuntu'nun varsayılan paket deposundaki (`apt install docker.io`) sürümler genellikle geriden gelir ve en son Docker Compose (V2) özelliklerini veya güvenlik yamalarını barındırmaz. Senior mühendisler her zaman Docker'ın resmi ve güncel APT deposunu sisteme ekleyerek kurulum yaparlar.

---

### B. Adım Adım Kurulum Yönergesi

#### 1. Eski Sürümleri Temizleme
Varsayılan veya eski çakışan paketleri kaldırırız:
```bash
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt-get remove $pkg; done
```

#### 2. GPG Anahtarı ve Depo Ekleme
Docker deposunun güvenliğini doğrulamak için GPG anahtarını ekler ve depoyu kaynak listemize yazarız:
```bash
# Bağımlılıkları kur
sudo apt-get update
sudo apt-get install ca-certificates curl -y

# GPG anahtarını indir ve yetkilendir
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Depoyu APT kaynaklarına ekle
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

#### 3. Ubuntu Sürüm Uyuşmazlığı Çözümü (Troubleshooting)
Ubuntu 25.10 (plucky) çok yeni bir sürüm olduğundan, Docker resmi deposunda bu sürüm için paketler henüz yayınlanmamış olabilir. Bu durumda `apt-get update` komutu **404 Not Found** hatası verir.
* **Çözüm:** Depo dosyasındaki `plucky` sürüm kod adını, bir önceki stabil LTS sürümü olan `noble` (24.04 LTS) ile değiştirerek Docker paketlerini sorunsuz çekeriz:
  ```bash
  sudo sed -i 's/plucky/noble/g' /etc/apt/sources.list.d/docker.list
  sudo apt-get update
  ```

#### 4. Paketleri Kurma
```bash
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
```

#### 5. Yetki Sınırlandırmasını Aşma (Sudo-less Docker)
Normal şartlarda Docker Daemon'a sadece root erişebilir. Her komutta `sudo` yazmamak için `devops` kullanıcısını `docker` grubuna dahil ederiz:
```bash
sudo usermod -aG docker devops
newgrp docker # Sunucudan çıkış yapmadan yeni grubu aktif etmek için
```

---

### C. Doğrulama ve Hata Arama (Troubleshooting)
* **Kurulum Doğrulama:** `docker run hello-world` komutu çalıştırılır. Ekrana `Hello from Docker!` çıktısı gelmelidir.
* **Servis Durumu Sorgulama:** `sudo systemctl status docker`
* **Docker Loglarını İzleme:** `sudo journalctl -u docker -f --no-pager`

---

### D. Temiz Kaldırma ve Geri Alma (Rollback)
Eğer kurulum yarıda kalır veya bozulursa, Docker'ı tamamen sunucudan temizlemek ve sıfırlamak için:
```bash
# Paketleri kaldır
sudo apt-get purge docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-ce-rootless-extras -y

# Kalan tüm dizinleri ve verileri sil (DİKKAT: Konteynerler ve tüm veriler silinir!)
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
sudo rm /etc/apt/sources.list.d/docker.list
```

## 7. Görev 2.4: Yol A (Host Nginx Edge Proxy) Entegrasyonu

*Bu kısım, sunucumuzda host düzeyindeki Nginx ile Docker konteynerlerini çakıştırmadan birlikte çalıştırmak için uyguladığımız Yol A mimarisinin detaylarını dökümante eder.*

### A. Port Çakışması Sorunu ve Mimari Tasarım
* **Sorun:** Host işletim sisteminde kurulu olan Nginx 80/443 portlarını dinlemektedir. Docker Compose içindeki Nginx de 80/443 portlarını dinlemeye çalışırsa port çakışması (Port Collision) yaşanır ve konteynerler ayağa kalkmaz.
* **Çözüm (Yol A):** 
  * Docker Compose içindeki Nginx servisini devre dışı bırakırız.
  * Konteynerlerimizin portlarını dış dünyaya değil, sadece localhost arayüzüne (`127.0.0.1`) eşleriz. Bu sayede veritabanları veya API'ler dışarıdan doğrudan taranamaz.
  * Host Nginx, dışarıdan gelen HTTPS isteklerini karşılar, şifrelemeyi çözer (SSL Termination) ve yerel ağdaki Docker portlarına yönlendirir.

---

### B. Adım Adım Uygulama Adımları

#### 1. Proje [docker-compose.yml](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/api/docker-compose.yml) Güncellemesi
Nginx servisini yorum satırına alıp diğer servisleri localhost portlarına bağladık. API 3000 portunu kullandığı için Grafana'yı host üzerinde 3001 portuna yönlendirdik:
* API Port Eşleme: `127.0.0.1:3000:3000`
* Grafana Port Eşleme: `127.0.0.1:3001:3000`
* Prometheus Port Eşleme: `127.0.0.1:9090:9090`
* Mongo Express Port Eşleme: `127.0.0.1:8081:8081`

#### 2. Host Nginx Yapılandırmasının Güncellenmesi
Sunucumuzdaki `/etc/nginx/sites-available/api.selimboz.com` dosyasını açarak 443 SSL bloğunun içerisine diğer servislerin yönlendirmelerini (location bloklarını) ekleriz:
```nginx
# Node.js API Yönlendirmesi
location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
}

# Grafana Yönlendirmesi
location /grafana/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
}

# Prometheus Yönlendirmesi
location /prometheus/ {
        proxy_pass http://127.0.0.1:9090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

# Mongo Express Yönlendirmesi
location /mongo-express/ {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```
*Yapılandırmayı kaydettikten sonra `sudo nginx -t` çalıştırıp hata yoksa `sudo systemctl restart nginx` ile Nginx'i güncelleriz.*

---

### C. Hata Giderme (Troubleshooting) ve Geri Alma (Rollback)

#### Hata Arama (Troubleshooting):
* **Konteynerlerin Durumu:** `docker compose ps`
* **Logları Canlı İzleme:** `docker compose logs -f` (veya belirli servis için `docker compose logs -f api`)
* **Port Bağlantılarını Kontrol Etme:** `sudo ss -tulpn | grep -E "3000|3001|9090|8081"`
  *Bu komutla portların sadece `127.0.0.1` (localhost) tarafından dinlendiğini doğrulamalıyız. `0.0.0.0` veya `*` olmamalıdır.*

#### Geri Alma (Rollback) Stratejisi:
Eğer Yol A sunucuda çalışmazsa ve Yol B'ye (All-in-Docker) geçmek istersek:
1. Host Nginx durdurulur ve devre dışı bırakılır: `sudo systemctl stop nginx && sudo systemctl disable nginx`
2. `docker-compose.yml` içindeki `nginx` servisi yorum satırından çıkarılır ve portları `80:80` ve `443:443` şeklinde hosta eşlenir.
3. `/etc/letsencrypt` dizini volume olarak Nginx konteynerine bağlanır.
4. `docker compose up -d --build` ile sistem Dockerized Nginx üzerinden ayağa kaldırılır.

---

## Ders 2 Kendi Kendine Sorular (Troubleshooting & Mülakat Soruları)

1. VM ve Konteyner arasındaki farkları mimari çizimle nasıl açıklarsın?
2. Konteyner içindeki verilerin kalıcı olması için hangi durumlarda "Named Volume", hangi durumlarda "Bind Mount" tercih edilmelidir?
3. Dockerfile yazarken katman önbellekleme (layer cache) mekanizmasını optimize etmek için satır sıralamasını nasıl yaparsın?
4. Multi-stage build yöntemini kullanmanın imaj güvenliği (CVE) ve imaj boyutu açısından önemi nedir?
5. `depends_on` ile veritabanının hazır olduğunu garanti altına almak için `healthcheck` entegrasyonu neden gereklidir?
