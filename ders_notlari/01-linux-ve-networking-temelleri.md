# Ders 1: Linux, SSH Sertleştirme ve Ağ (Networking) Temelleri

Bu ders notunda; Linux işletim sistemi, SSH güvenliği sıkılaştırması (hardening), ağ katmanları, DNS, SSL/TLS şifreleme mantığı ve Nginx web sunucusu/reverse proxy kurulumunu teorik, pratik ve senior seviyedeki troubleshooting yaklaşımlarıyla ele alacağız.

---

## 1. Linux İşletim Sistemi Temelleri

Linux, DevOps dünyasının kalbidir. Konteynerler (Docker), bulut sunucuları (AWS EC2, GCP VM) ve Kubernetes altındaki sanal makinelerin neredeyse tamamı Linux çekirdeği (kernel) üzerinde çalışır.

### A. Filesystem Hierarchy Standard (FHS - Dosya Sistemi Hiyerarşisi)
Linux'ta her şey bir dosyadır (buna donanımlar, süreçler ve ağ soketleri de dahildir) ve tüm dosyalar kök dizin olan `/` altında toplanır. Önemli dizinlerin görevleri şunlardır:

| Dizin | Açıklama | DevOps Açısından Önemi |
| :--- | :--- | :--- |
| **`/`** | Kök Dizin (Root) | Tüm dosya sisteminin başlangıç noktasıdır. |
| **`/etc`** | Yapılandırma Dosyaları | Nginx, SSH, network, kullanıcılar vb. tüm servislerin ayar dosyaları (örn: `/etc/nginx/nginx.conf`, `/etc/ssh/sshd_config`) buradadır. |
| **`/var`** | Değişken Veriler | Sürekli değişen loglar, mail kuyrukları ve veritabanı verileri buradadır (örn: `/var/log/syslog`, `/var/lib/docker`). Disk doluluk oranları takip edilirken en kritik yerdir. |
| **`/opt`** | Ekstra Yazılımlar | Sistem dışından paket yöneticisi (apt/yum) haricinde kurulan üçüncü parti uygulamalar buraya konur. |
| **`/bin` & `/sbin`** | Temel Çalıştırılabilir Komutlar | `/bin` genel kullanıcıların, `/sbin` ise sistem yöneticisinin (root) çalıştırabileceği temel sistem komutlarını (`ls`, `cd`, `systemctl`, `iptables`) içerir. |
| **`/usr`** | Kullanıcı Programları | Sisteme sonradan yüklenen uygulamaların ikili (binary) dosyaları, kütüphaneleri ve dökümanları bulunur (`/usr/bin`, `/usr/local/bin`). |
| **`/home` & `/root`** | Ev Dizinleri | `/home/kullanıcı_adı` normal kullanıcıların kişisel dosyalarını tutar. `/root` ise süper yöneticinin (root) kişisel ev dizinidir. SSH anahtarları genellikle buralardaki `.ssh/` klasöründe saklanır. |
| **`/proc` & `/sys`** | Sanal Dosya Sistemleri | Sabit diskte yer kaplamazlar. RAM üzerinde anlık olarak oluşurlar. Çekirdeğin (kernel) durumunu, donanımları ve çalışan süreçleri (process) temsil eder. Örn: `/proc/cpuinfo` CPU bilgisini verir. |
| **`/tmp`** | Geçici Dosyalar | Sistem veya uygulamalar tarafından geçici olarak kullanılan dosyalar buraya yazılır. Genellikle her sistem yeniden başlatıldığında temizlenir. |

### B. Linux Dosya Yetkileri (Permissions)
Linux çok kullanıcılı bir sistemdir. Dosya güvenliği 3 grup üzerinde tanımlanır:
1. **User (u):** Dosyanın sahibi olan kullanıcı.
2. **Group (g):** Dosyanın sahibi olan grubun üyeleri.
3. **Other (o):** Sistemdeki diğer tüm kullanıcılar.

Yetki türleri ise 3 tanedir ve hem harf hem de sayısal (oktal) karşılıkları vardır:
- **Read (r - Oku):** Değeri `4`'tür. Dosya içeriğini okuma, dizin içini listeleme yetkisidir.
- **Write (w - Yaz):** Değeri `2`'tür. Dosya içeriğini değiştirme, dizin içinde dosya oluşturma/silme yetkisidir.
- **Execute (x - Çalıştır):** Değeri `1`'dir. Dosyayı program veya betik (script) olarak çalıştırma, dizin içine girme (`cd` komutu) yetkisidir.

#### Yetki Hesaplama Örneği:
Eğer bir dosyanın izinleri `rwxr-xr-x` ise:
- **Owner (rwx):** $4 + 2 + 1 = 7$ (Okur, yazar, çalıştırır)
- **Group (r-x):** $4 + 0 + 1 = 5$ (Okur, çalıştırır ama yazamaz)
- **Other (r-x):** $4 + 0 + 1 = 5$ (Okur, çalıştırır ama yazamaz)
- Sayısal karşılığı: `755`

#### Temel Yetki Komutları:
- `chmod 600 dosya.pem`: Dosyayı sadece sahibi okuyabilir ve yazabilir yapar (SSH Key'ler için güvenlik gereği zorunludur!).
- `chown root:docker dosya.txt`: Dosyanın sahibini `root`, grubunu ise `docker` olarak değiştirir.
- **Access Control Lists (ACL):** Gelişmiş yetkilendirmeler için kullanılır. Klasik u/g/o yetkileri yetmediğinde, spesifik bir kullanıcıya özel yetki vermek için `setfacl -m u:selim:r-x dosya.txt` komutu kullanılır.

### C. Süreç Yönetimi (Process Management) ve systemd
Linux arkada çalışan servisleri ve süreçleri yönetmek için `systemd` adı verilen bir init sistemi kullanır.
- **Süreç (Process):** Bellekte çalışan aktif her programa verilen isimdir. Her sürecin benzersiz bir `PID` (Process ID) değeri vardır.
- **Daemon:** Arka planda sürekli çalışan ve istemcilere hizmet veren süreçlerdir (Nginx, Docker, SSHD vb.).

#### systemctl Komutları:
- `systemctl start docker`: Docker servisini başlatır.
- `systemctl stop docker`: Docker servisini durdurur.
- `systemctl restart docker`: Servisi yeniden başlatır.
- `systemctl status docker`: Servisin anlık durumunu ve son loglarını gösterir.
- `systemctl enable docker`: Sunucu her açıldığında Docker'ın otomatik başlamasını sağlar.
- `systemctl disable docker`: Otomatik başlatmayı kapatır.

#### Sistem İzleme ve Log Yönetimi:
- **`journald`:** systemd süreçlerinin loglarını toplar. `journalctl -u nginx` komutuyla sadece Nginx servisine ait logları görebilirsin. Canlı takip için `-f` parametresi eklenir (`journalctl -u nginx -f`).
- **`htop` / `top`:** Sistemdeki işlemci (CPU), bellek (RAM), disk G/Ç (I/O) ve aktif süreçlerin kaynak tüketimini görsel olarak izlememizi sağlar.
- **`ps aux`:** Sistemdeki tüm süreçleri sahipleri, PID değerleri ve CPU/RAM tüketimleriyle listeler. `ps aux | grep node` komutu arka planda koşan Node.js uygulamalarını bulmak için sıkça kullanılır.

---

## 2. GÖREV 1.2: Sunucu Güvenliği ve SSH Hardening (Uygulamalı)

### A. Neden Yapıyoruz?
Yeni kurulan bir sunucu varsayılan olarak `22` portunda `root` girişine açık ve şifreli kimlik doğrulamasına izin verir. Bu durum, internetteki tarayıcı botların sunucuyu sürekli "Brute Force" (şifre deneme) saldırılarına maruz bırakarak ele geçirmesine veya kaynak tüketmesine neden olur. Amacımız root girişini kapatmak, şifreli girişi engelleyip sadece SSH Key'e izin vermek ve portu değiştirmektir.

### B. Adım Adım Sunucuda Uygulanan Adımlar

#### 1. Yönetici Yetkili (Sudo) Yeni Kullanıcı Oluşturma
Doğrudan root ile sunucuda çalışmak hatalı komut riskini artırır. Yeni bir kullanıcı oluşturur ve yönetici yetkisi veririz:
```bash
adduser devops
usermod -aG sudo devops
```

#### 2. SSH Anahtarını (Key Pair) Aktarma
Yerel bilgisayarımızdaki (MacBook) SSH anahtarımızı (`~/.ssh/id_ed25519`) yeni oluşturduğumuz kullanıcıya tanımlamalıyız. Root kullanıcısındaki yetkilendirilmiş anahtarları kopyalarız:
```bash
mkdir -p /home/devops/.ssh
cp /root/.ssh/authorized_keys /home/devops/.ssh/
chown -R devops:devops /home/devops/.ssh
chmod 700 /home/devops/.ssh
chmod 600 /home/devops/.ssh/authorized_keys
```
* **Kritik Hata/Typo Örneği:** Klasör oluşturulurken `.shh` yazılması sık yapılan bir hatadır. Böyle bir durumda klasör silinmeli (`rm -rf /home/devops/.shh`) ve `.ssh` ismiyle yeniden oluşturulmalıdır.
* **Neden `chmod 700` ve `600`?** SSH servisi, `.ssh` klasörünün veya `authorized_keys` dosyasının sahibi dışındaki kişilere yazma/okuma yetkisi verilmişse (örn: `777` veya `666`), bunu bir güvenlik açığı olarak görür ve bağlantıyı **kabul etmez**.

#### 3. Güvenlik Duvarı (UFW) Yapılandırması
Yeni SSH portunu (2222) ve ileride Nginx için kullanacağımız web portlarını (80, 443) firewall'da açıp UFW'yi aktif ederiz:
```bash
sudo ufw allow 2222/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### 4. `/etc/ssh/sshd_config` Yapılandırmasının Sıkılaştırılması
SSHD yapılandırma dosyasını `sudo nano /etc/ssh/sshd_config` ile açıp şu parametreleri güncelledik:
```ini
Port 2222                    # SSH dinleme portunu 2222 yaptık.
PermitRootLogin no           # Root girişini tamamen engelledik.
PasswordAuthentication no     # Şifreyle girişi kapatıp sadece anahtara izin verdik.
KbdInteractiveAuthentication no # Klavye etkileşimli doğrulamayı kapattık.
```

---

### C. Systemd Socket Activation Engeli ve Çözümü (Ubuntu 24.04/25.10 Özel)
Yeni Ubuntu sürümlerinde SSH portunu değiştirdikten sonra sadece `systemctl restart ssh` çalıştırmak yeni portu aktif **etmez**. Çünkü sistem arkada **Socket Activation** kullanır.

#### Çözüm Yolları:

##### YOL A: Klasik Servis Yapısına Dönmek (Tercih Ettiğimiz Yöntem)
Soket aktivasyonunu kapatıp SSH'ı sürekli çalışan klasik bir servis haline getiririz:
```bash
sudo systemctl disable --now ssh.socket
sudo systemctl enable --now ssh.service
sudo systemctl restart ssh
```
* **Artısı:** Klasik Linux dokümantasyonuyla birebir uyumludur, kafa karıştırmaz.
* **Eksisi:** Sunucu boşta beklerken arka planda çok az miktarda da olsa RAM harcar (modern sunucularda bu kayıp önemsizdir).

##### YOL B: Systemd Soket Yapılandırmasını Override Etmek
Soket yapısını koruyarak systemd'ye dinlediği portu değiştiririz:
1. `sudo systemctl edit ssh.socket` çalıştırılır.
2. Açılan dosyaya şu satırlar eklenir:
   ```ini
   [Socket]
   ListenStream=
   ListenStream=2222
   ```
3. `sudo systemctl daemon-reload && sudo systemctl restart ssh.socket` çalıştırılır.

---

### D. Fail2Ban ile Kaba Kuvvet (Brute Force) Koruması
Hatalı şifre/anahtar denemeleri yapan IP'leri engellemek için Fail2Ban kurduk:
```bash
sudo apt update && sudo apt install fail2ban -y
```
`/etc/fail2ban/jail.local` dosyası oluşturduk:
```ini
[DEFAULT]
bantime = 1h        # Engelleme süresi (1 saat)
findtime = 10m      # Hatalı deneme arama penceresi (10 dakika)
maxretry = 3        # En fazla hatalı deneme sayısı

[sshd]
enabled = true
port = 2222
backend = systemd   # Logları systemd journal'dan okuması için (Ubuntu 24/25 için şarttır)
```
Servisi başlattık:
```bash
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

---

### E. Hata Giderme (Troubleshooting) ve Geri Alma (Rollback)

#### Rollback Stratejisi (SSH):
* SSH yapılandırmasını güncellerken mevcut SSH oturumunu **asla kapatma**. 
* Yan sekmede `ssh -i ~/.ssh/id_ed25519 -p 2222 devops@78.111.90.75` komutuyla test et.
* Bağlanamazsan, açık olan ilk sekmenden ayarları geri al: `PermitRootLogin yes` ve `Port 22` yapıp `sudo systemctl restart ssh` (veya soket) çalıştır.
* Mutlak felaket durumunda (kilitlenme), sunucu sağlayıcı panelinden (VNC konsolu) sunucuya doğrudan bağlanıp yapılandırmayı düzeltebilirsin.

#### Troubleshooting Komutları:
* SSH servis durumunu incelemek: `sudo systemctl status ssh`
* Detaylı hata loglarını görmek: `sudo journalctl -u ssh -n 50 --no-pager`
* Fail2Ban durumunu ve banlanan IP listesini sorgulamak: `sudo fail2ban-client status sshd`

---

## 3. Ağ (Networking) ve DNS Temelleri

* **Port:** Sunucuda çalışan servislerin kapı numaralarıdır (Örn: SSH için 2222, Nginx için 80/443, Node.js için 3000).
* **Reverse Proxy (Ters Vekil):** Dışarıdan gelen web isteklerini karşılayıp iç ağdaki ilgili servise (Örn: 3000 portundaki Node.js uygulamasına) güvenli bir şekilde paslayan yapıdır.
* **DNS A Kaydı (Address Record):** Bir alan adını (örn: `api.selimboz.com`) doğrudan sunucunun genel (public) IP'sine (`78.111.90.75`) eşleyen rehber kaydıdır.
* **Let's Encrypt:** Ücretsiz ve otomatik SSL sertifikaları sunan açık bir Sertifika Otoritesidir (CA).

---

## 4. GÖREV 1.3: Nginx Reverse Proxy ve Let's Encrypt SSL Kurulumu (Uygulamalı)

### A. Neden Yapıyoruz?
Kullanıcının tarayıcısı ile sunucumuz arasındaki veri trafiğini şifrelemek (HTTPS) ve tek bir sunucuda birden fazla web servisini (API, Grafana vb.) dış dünyaya tek bir IP/domain üzerinden dağıtabilmek için Nginx reverse proxy kurup SSL sertifikası tanımlıyoruz.

### B. Adım Adım Sunucuda Uygulanan Adımlar

#### 1. Nginx Kurulumu
```bash
sudo apt update
sudo apt install nginx -y
```

#### 2. Varsayılan Yapılandırmanın Kaldırılması
Nginx'in varsayılan karşılama sayfasını devre dışı bırakırız:
```bash
sudo rm /etc/nginx/sites-enabled/default
```

#### 3. Yeni Site Yapılandırma Dosyasının Oluşturulması
`sudo nano /etc/nginx/sites-available/api.selimboz.com` komutuyla yeni bir dosya oluşturup içine HTTP (Port 80) yönlendirmesini yazdık:
```nginx
server {
    listen 80;
    server_name api.selimboz.com;

    location / {
        proxy_pass http://127.0.0.1:3000; # İstekleri iç port 3000'deki Node.js'e pasla
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
* **Neden Önce Sadece Port 80 Yazdık?** "Tavuk ve Yumurta" probleminden kaçınmak için. SSL sertifikası diskte yokken HTTPS (443) bloğu yazarsak Nginx başlamaz. Önce HTTP (80) bloğunu yazarız, Let's Encrypt doğrulamayı bu blok üzerinden yapar, sertifikayı oluşturur ve ardından Nginx yapılandırmasını kendisi günceller.

#### 4. Sembolik Link Oluşturulması ve Yeniden Başlatma
Yapılandırmayı aktif etmek için `sites-enabled` dizinine link veririz ve Nginx'i yeniden başlatırız:
```bash
sudo ln -s /etc/nginx/sites-available/api.selimboz.com /etc/nginx/sites-enabled/
sudo nginx -t                # Sözdizimi (syntax) kontrolü yapar.
sudo systemctl restart nginx
```

#### 5. Certbot ile SSL Sertifikası Alma
Certbot aracını kurar ve Nginx eklentisiyle sertifikayı otomatik üretip yapılandırmaya enjekte etmesini sağlarız:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.selimboz.com
```
*Bu komut bittiğinde Certbot bizim yazdığımız `/etc/nginx/sites-available/api.selimboz.com` dosyasını otomatik olarak değiştirip HTTPS (443) bloklarını ve yönlendirmelerini (redirect) ekler.*

---

### C. Doğrulama ve Test
Kendi bilgisayarımızdan `curl -Iv https://api.selimboz.com` çalıştırarak doğrulama yaparız:
* **`SSL certificate verify ok`** çıktısı sertifikanın başarıyla alındığını gösterir.
* **`HTTP/1.1 502 Bad Gateway`** çıktısı ise Nginx'in 443 portundan gelen isteği başarıyla karşıladığını ancak arkada (3000 portunda) henüz çalışan bir uygulama bulamadığını gösterir (Bu durum kurulumun doğru olduğunu kanıtlar).

---

### D. Hata Giderme (Troubleshooting) ve Geri Alma (Rollback)

#### Rollback Stratejisi (Nginx / SSL):
* Eğer Certbot kurulumu sırasında veya Nginx ayarlarında bir hata oluşup Nginx çökerse, ilgili site yapılandırma linkini silerek Nginx'i varsayılan haline geri döndürebilirsin:
  ```bash
  sudo rm /etc/nginx/sites-enabled/api.selimboz.com
  sudo systemctl restart nginx
  ```
* Certbot'un bozduğu bir konfigürasyon olursa, Certbot dosyanın yedeğini otomatik alır. `/etc/nginx/sites-available/api.selimboz.com.bak` dosyasını geri yükleyebilirsin.

#### Troubleshooting Komutları:
* Nginx yapılandırma testleri: `sudo nginx -t`
* Nginx hata loglarını canlı izleme (Senior Pratiği): `sudo tail -f /var/log/nginx/error.log`

---

## 5. Senior Seviye Nginx & SSL Mimarisi (Üretim Ortamı Best Practices)

*Bu kısım, sunucumuzda uyguladığımız ileri düzey güvenlik sıkılaştırması (hardening) ve yapılandırma optimizasyonlarını uygulamalı adımlarla dökümante eder.*

### A. Uygulamalı Güvenlik ve Log Modernizasyon Adımları

#### KISIM A: Güçlendirilmiş Diffie-Hellman (DH) Parametresi Üretimi
SSL/TLS bağlantılarında istemci (tarayıcı) ile sunucu arasındaki geçici anahtar değişimini çok daha güvenli hale getirmek için 2048 bitlik güçlü bir kriptografik dosya üretiriz:
```bash
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
```
*(Bu işlem sunucunun CPU gücüne bağlı olarak 1-2 dakika sürebilir).*

#### KISIM B: Global Nginx Ayarları (JSON Loglama ve Güvenlik)
Nginx'in global ayarlarını düzenlemek için `sudo nano /etc/nginx/nginx.conf` dosyasını açar ve `http {` bloğunun hemen altına şu satırları ekleriz:
```nginx
# Nginx sürüm bilgisini gizle (Saldırganların versiyona özel açık taramasını engeller)
server_tokens off;

# JSON Log Formatı Tanımlaması (Merkezi log araçlarının -Loki/ELK- hızlı okuması için)
log_format nginx_json escape=json '{'
    '"time_local":"$time_local",'
    '"remote_addr":"$remote_addr",'
    '"request":"$request",'
    '"status": "$status",'
    '"body_bytes_sent":"$body_bytes_sent",'
    '"request_time":"$request_time",'
    '"http_referrer":"$http_referer",'
    '"upstream_response_time":"$upstream_response_time"'
'}';

# Varsayılan log dosyasını JSON formatına çek
access_log /var/log/nginx/access_json.log nginx_json;
```

1. access_log /var/log/nginx/access_json.log nginx_json; (Bizim eklediğimiz JSON formatı)
2. access_log /var/log/nginx/access.log; (Aşağıdaki varsayılan format)

* **Bu ne anlama gelir?**   Nginx, gelen her isteği her iki dosyaya birden yazacaktır.
* **Senior Yaklaşımı:** Üretim (production) ortamında disk I/O (yazma) maliyetini düşürmek ve disk alanından tasarruf etmek için normal loglamayı kapatıp sadece JSON loglamayı aktif bırakabiliriz. Bu sebeple varsayılan formatı silebiliriz.

```nginx
# Bu satırı sil
access_log /var/log/nginx/access.log;
```

#### KISIM C: Site Yapılandırmasında TLS Hardening (Sıkılaştırma)
Sitemizin ayar dosyasını `sudo nano /etc/nginx/sites-available/api.selimboz.com` ile açar ve Certbot tarafından oluşturulmuş olan `listen 443 ssl;` bloğunun içerisine şu satırları ekleriz:
```nginx
# Certbot'un varsayılan anahtarını devre dışı bırakıyoruz (başına # koyduk)
# ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
# HSTS Güvenlik Başlığı (Tarayıcıyı sonraki tüm isteklerde HTTPS'e zorlar)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Ürettiğimiz DH Parametresini Tanımla (Varsayılan zayıf DH parametresini ezer)
ssl_dhparam /etc/nginx/dhparam.pem;
```

#### KISIM D: Test, Canlıya Alma ve Geri Alma (Rollback)
1. **Yapılandırmayı Test Et:**
   ```bash
   sudo nginx -t
   ```
   *Eğer `syntax is ok` çıktısı aldıysak değişiklikleri uygularız:*
   ```bash
   sudo systemctl restart nginx
   ```
2. **Log Doğrulama (Troubleshooting):**
   Tarayıcıdan siteye istek attıktan sonra logların JSON olduğunu doğrulamak için:
   ```bash
   sudo tail -f /var/log/nginx/access_json.log
   ```
3. **Rollback Stratejisi:**
   Eğer Nginx çöküp ayağa kalkmazsa:
   - `/etc/nginx/nginx.conf` dosyasındaki JSON log ve `server_tokens` satırlarını sil.
   - `/etc/nginx/sites-available/api.selimboz.com` dosyasındaki HSTS ve `ssl_dhparam` satırlarını sil.
   - `sudo systemctl restart nginx` ile sunucuyu eski stabil haline getir.

---

### B. Sunucu Üzerinde (Host-Level) Nginx vs Konteyner İçi (Dockerized) Nginx
Mikroservis projelerinde Nginx'in nerede konumlandırılacağı kritik bir mimari karardır:

| Özellik | Sunucu Üstünde Nginx (Host-Level Edge) | Konteyner İçi Nginx (All-in-Docker) |
| :--- | :--- | :--- |
| **SSL Yönetimi** | Kolaydır. Certbot doğrudan host üzerinde çalışır, sertifikaları yeniler. | Zordur. Sertifika dizinini konteynere mount etmek gerekir. |
| **Yedeklilik ve Port Yönetimi** | Host üzerindeki 80/443 portlarını doğrudan yönetir. | Docker port mapping ile 80/443 portlarını Nginx konteynerine yönlendirmek gerekir. |
| **Bağımlılık** | Nginx'in host işletim sistemine kurulması gerekir. | Host temiz kalır. Nginx Docker imajı olarak her sunucuda aynı çalışır. |
| **Senior Tercihi** | Geleneksel VM altyapılarında tercih edilir. | Kubernetes veya saf Docker Swarm ortamlarında Ingress Controller kullanımı ile bu yapı konteyner içine taşınır. |

## Ders 1 Kendi Kendine Sorular (Troubleshooting & Mülakat Soruları)

1. Sunucuda SSH portunu değiştirdikten sonra `systemctl restart ssh` yapılmasına rağmen portun değişmeme sebebi nedir ve nasıl çözülür?
2. `chmod 700` ve `chmod 600` yetkileri SSH Key login mekanizması için neden zorunludur?
3. Let's Encrypt ile SSL alırken yaşanan "Tavuk ve Yumurta" problemi nedir ve HTTP-01 challenge sürecinde Nginx port 80 yapılandırması bu problemi nasıl çözer?
4. `curl -Iv https://yourdomain.com` attığında `502 Bad Gateway` alıyorsan bu Nginx'in mi yoksa backend uygulamasının mı çalışmadığını gösterir?
5. Mikroservis mimarisinde log toplama sistemlerinin (Loki/ELK) performansı için Nginx loglarını neden JSON formatında yazdırmalıyız?
