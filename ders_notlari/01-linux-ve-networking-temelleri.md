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
# Forward Proxy'den Production Nginx'e: Modern Web Altyapısının Anatomisi

İnternet trafiğini yönetmek, dışarıdan bakıldığında "isteği al, cevabı ver" kadar basit görünür. Ama yüksek trafikli bir API'yi ya da haber portalını canlıya alıp ilk `502 Bad Gateway` hatasını veya tarayıcıdaki o meşhur `ERR_TOO_MANY_REDIRECTS` ekranını gördüğünde, perdenin arkasında kaç katmanlı bir mimarinin döndüğünü fark edersin.

Bu yazıda proxy kavramının iki temel türünden başlayıp, reverse proxy header'larına, oradan da gerçek bir production Nginx konfigürasyonunun her satırına kadar inen bir yolculuğa çıkıyoruz. Amaç, kopyala-yapıştır config'lerin neden öyle yazıldığını anlamak.

---

## 1. Forward Proxy vs Reverse Proxy

İnternet trafiğini yönetirken en sık karşılaşılan iki mimari kavram olan **Forward Proxy** (İleri Proxy) ve **Reverse Proxy** (Ters Proxy), bulundukları konuma ve hizmet ettikleri amaca göre tamamen farklı işlevlere sahiptir. İkisi de "aracı" olarak çalışır, ama biri istemciyi, diğeri sunucuyu korur.

### Forward Proxy (İleri Proxy)

Forward Proxy, **istemcinin (client) önüne** konumlanan bir sunucudur. İstemcilerin internete çıkarken kullandığı bir aracı ya da "maske" olarak düşünülebilir. İnternetteki diğer sunucular asıl istemciyi değil, yalnızca Forward Proxy sunucusunu görür.

Temel amacı istemciyi korumak, gizlemek veya erişimini kontrol etmektir. İstemci bir web sayfasına gitmek istediğinde isteği önce proxy'ye gönderir; proxy bu isteği alır, internetteki sunucuya iletir, cevabı alır ve istemciye geri döndürür.

Tipik kullanım senaryoları:

- **İçerik filtreleme:** Kurumsal şirketlerin çalışanların belirli sitelere (örneğin sosyal medya) girmesini engellemek için ağı sınırlandırması.
- **Anonimlik ve gizlilik:** Kullanıcının IP adresini gizleyerek internette gezinmesi. VPN'ler temelde bu mantıkla çalışır.
- **Bölgesel engelleri aşma:** Farklı bir ülkedeki proxy sunucusu üzerinden internete çıkarak coğrafi kısıtlamaları (geo-blocking) aşmak.

**Örnek:** Bir şirket ağında olduğunu düşün. Tarayıcından `github.com`'a gitmek istediğinde, bu istek bilgisayarından doğrudan GitHub sunucularına gitmez. Önce şirketin ağındaki **Squid Proxy** gibi bir Forward Proxy sunucusuna gider. Proxy yetkili olup olmadığını kontrol eder, her şey uygunsa isteği senin adına GitHub'a yapar ve sonucu sana iletir. GitHub loglarında senin IP adresin değil, şirketin proxy IP'si görünür.

### Reverse Proxy (Ters Proxy)

Reverse Proxy ise **sunucuların (backend) önüne** konumlanan bir sunucudur. İnternetten gelen istekleri karşılar ve içerideki uygun altyapıya yönlendirir. İstemciler doğrudan asıl sunucuyla iletişim kurduklarını sanır; arkadaki karmaşık mimariden veya iç IP'lerden haberleri olmaz.

Temel amacı sunucuları korumak, performansı artırmak ve trafiği yönetmektir. İnternetten gelen istek önce Reverse Proxy'ye ulaşır; proxy güvenlik kurallarına ve yönlendirme mantığına göre bu isteği arkadaki uygun uygulama sunucusuna (veya mikroservise) iletir, yanıtı alıp kullanıcıya döndürür.

Tipik kullanım senaryoları:

- **Yük dengeleme (load balancing):** Gelen devasa trafiği arkadaki birden fazla sunucuya belirli bir mantığa göre dağıtmak.
- **Güvenlik:** Arka plandaki veritabanı veya uygulama sunucularının (örn. port 2222, 3000, 8000) dış dünyaya tamamen kapalı tutulup, yalnızca proxy üzerinden erişime izin verilmesi.
- **SSL sonlandırma (SSL termination):** SSL/TLS sertifikalarının tek bir noktada — proxy üzerinde — çözülüp, arkadaki sunucuların şifreleme/şifre çözme yükünden kurtarılması.
- **Önbellekleme (caching):** Yüksek trafikli portallarda statik dosyaların veya sık okunan verilerin proxy üzerinde tutularak arka uç sunucularının rahatlatılması.

**Örnek:** Yüksek trafik alan bir haber portalı yönettiğini varsayalım. Binlerce anlık ziyaretçiyi tek bir Node.js veya Laravel sunucusunun kaldırması risklidir. Bunun yerine en öne bir **Nginx** veya **Traefik** kurarsın. Ziyaretçi `haberportali.com`'a girer, Nginx isteği karşılar ve SSL sertifikasını doğrular, ardından trafiği arkadaki 3 farklı Node.js API container'ından o an en müsait olanına yönlendirir. Ziyaretçi arka planda kaç sunucu çalıştığını veya Docker mimarisini asla bilmez; yalnızca Nginx ile muhatap olur.

### Özet Karşılaştırma

| Özellik | Forward Proxy | Reverse Proxy |
| --- | --- | --- |
| **Kimi korur/gizler?** | İstemciyi (kullanıcıyı) | Sunucuyu (backend altyapısını) |
| **Nerede konumlanır?** | İstemci ağı ile internet arasında | İnternet ile backend ağınız arasında |
| **Kim kontrol eder?** | İstemci veya ağ yöneticisi | Sistemin/sunucunun yöneticisi |
| **Popüler yazılımlar** | Squid, VPN servisleri, CCProxy | Nginx, HAProxy, Traefik, Apache |
| **Birincil kullanım** | Filtreleme, IP gizleme, erişim kontrolü | Load balancing, SSL yönetimi, güvenlik, caching |

---

## 2. Reverse Proxy Header'ları: Gerçek Kullanıcı Kim?

Bir reverse proxy (Nginx, Traefik vb.) kullandığında, backend uygulaman doğrudan dış dünyayla konuşmaz; tüm trafik proxy üzerinden gelir. Bu mimarinin bir yan etkisi vardır: backend sunucun, gelen isteklerin kaynak IP adresi olarak **proxy sunucusunun IP'sini** görür — ki bu çoğunlukla `172.18.x.x` gibi bir Docker iç ağ IP'si ya da `127.0.0.1`'dir.

Oysa ziyaretçinin gerçek IP'sini, hangi protokolü (HTTP/HTTPS) kullandığını ve hangi domain üzerinden geldiğini bilmek; güvenlik (rate limiting), loglama (Loki/Grafana üzerinden izleme) ve analitik için şarttır. İşte bu gerçek istemci bilgilerini proxy'den backend'e taşımak için **reverse proxy header'ları** kullanılır.

Aşağıdaki header'lar de facto endüstri standartlarıdır ve genellikle `X-Forwarded-*` isimlendirmesini kullanır:

- **`X-Forwarded-For` (XFF):** En kritik olanıdır. İsteği yapan orijinal istemcinin IP adresini taşır. İstek birden fazla proxy'den geçerse, IP adresleri virgülle ayrılarak eklenir (örn. `Müşteri_IP, İlk_Proxy_IP, İkinci_Proxy_IP`).
- **`X-Real-IP`:** Genellikle Nginx tarafından kullanılan, zincirdeki tüm IP'leri değil, yalnızca proxy'ye bağlanan ilk gerçek istemcinin tek IP adresini tutan spesifik bir header'dır.
- **`X-Forwarded-Proto` (XFP):** İstemcinin proxy'ye bağlanırken kullandığı orijinal protokolü (`http` veya `https`) belirtir. Özellikle SSL sonlandırma yapılan proxy'lerde, backend'in uygulamanın güvenli bir bağlantı üzerinden sunulup sunulmadığını anlaması — ve HTTP/HTTPS yönlendirme döngülerine girmemesi — için hayati öneme sahiptir.
- **`X-Forwarded-Host`:** İstemcinin tarayıcıya yazdığı orijinal Host (domain) bilgisini taşır.
- **`X-Forwarded-Port`:** İstemcinin bağlandığı orijinal portu belirtir (örn. 80 veya 443).

### Nginx Tarafı: Header'ları Enjekte Etmek

Nginx'in gelen isteği yakalayıp arka plana iletirken bu header'ları isteğin içine nasıl "enjekte" ettiğine bakalım:

```nginx
server {
    listen 80;
    server_name api.devrehber.com;

    location / {
        proxy_pass http://nodejs_backend_container:3000;

        # Orijinal Host bilgisini backend'e ilet
        proxy_set_header Host $host;

        # Gerçek ziyaretçi IP'sini X-Real-IP ve X-Forwarded-For ile ilet
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Gelen isteğin protokolünü (HTTP/HTTPS) belirt
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Backend Tarafı: Node.js / Express

Arka taraftaki Node.js uygulaması, güvenlik gereği varsayılan olarak `X-Forwarded-*` header'larına güvenmez. Bunları okuyabilmesi için ona proxy'ye güvenmesini söylemen gerekir:

```javascript
const express = require('express');
const app = express();

// Node.js'e reverse proxy arkasında olduğunu ve
// header'lara güvenmesi gerektiğini söylüyoruz
app.set('trust proxy', true);

app.get('/api/user-info', (req, res) => {
    // trust proxy aktif edildiği için req.ip artık proxy'nin (172.x.x.x) değil,
    // X-Forwarded-For header'ından gelen gerçek ziyaretçinin IP'sini döner.
    const clientIp = req.ip;

    // Header'ları manuel okumak istersen:
    const originalProtocol = req.headers['x-forwarded-proto']; // örn: 'https'
    const originalHost = req.headers['x-forwarded-host'];      // örn: 'api.devrehber.com'

    console.log(`Log [Loki için]: İstek ${clientIp} adresinden ${originalProtocol} ile geldi.`);

    res.json({ ip: clientIp, protocol: originalProtocol });
});

app.listen(3000);
```

### Backend Tarafı: Laravel

Node.js yerine Laravel kullanıyorsan, bu güvenliği `TrustProxies` middleware'i üzerinden yönetirsin. `app/Http/Middleware/TrustProxies.php` dosyasına gidip proxy'nin IP'sini (veya tüm proxy'lere güveniyorsan `*`) tanımlaman gerekir. Bu işlem yapıldıktan sonra Laravel'in `request()->ip()` metodu, Nginx container'ı yerine doğrudan ziyaretçinin gerçek IP'sini verir.

---

## 3. `X-Forwarded-*` Hepsi Bu Kadar mı? Hayır.

`X-Forwarded-*` ailesi yalnızca trafiğin **kimden ve nereden geldiğini** (yönlendirme/routing) belirlemek için kullanılan en temel standartlardır. Mikroservis mimarilerine, kapsamlı loglama sistemlerine veya yüksek trafikli platformlara geçildiğinde, reverse proxy'ler çok daha gelişmiş header'lar kullanır veya üretir.

### İzleme ve Loglama (Tracing & Monitoring)

Birden fazla API'nin veya container'ın (Docker/Kubernetes) birbiriyle konuştuğu sistemlerde bir isteğin yaşam döngüsünü takip etmek zorlaşır. Bir hata olduğunda hatanın hangi servisten kaynaklandığını Grafana veya Loki gibi araçlarda bulabilmek için bu header'lar hayat kurtarır:

- **`X-Request-ID` (veya `X-Correlation-ID`):** Proxy, dışarıdan gelen her benzersiz istek için rastgele bir UUID üretir ve bunu backend'e iletir. Backend bu ID'yi veritabanı sorgularında ve hata loglarında kullanır. Böylece Loki üzerinde bu ID'yi arattığında, isteğin proxy'den başlayıp arkadaki tüm servislerdeki yolculuğunu tek bir zincir halinde görebilirsin.
- **`X-Amzn-Trace-Id` / `X-B3-TraceId`:** AWS ALB veya Zipkin/Jaeger gibi dağıtık izleme (distributed tracing) sistemlerine özel oluşturulan gelişmiş izleme header'larıdır.

### Önbellekleme (Caching)

Nginx gibi bir proxy aynı zamanda önbellek sunucusu olarak çalışıyorsa, cevaplara şu header'ları ekler:

- **`X-Cache` / `X-Cache-Status`:** Ziyaretçinin gördüğü içeriğin proxy'nin önbelleğinden mi geldiğini, yoksa arkadaki asıl sunucudan mı çekildiğini gösterir:
  - `HIT` — Sayfa proxy'nin önbelleğinden sunuldu. Backend rahat.
  - `MISS` — Veri önbellekte yoktu, proxy mecburen backend'e gidip veriyi aldı.
  - `BYPASS` — İstek önbelleği tamamen es geçti (örneğin admin paneline girildiğinde).

### Güvenlik ve Hız Sınırlandırma (Rate Limiting)

- **`X-RateLimit-Limit` & `X-RateLimit-Remaining`:** Proxy seviyesinde bir API kısıtlaması yaptıysan, proxy bu header'ları doğrudan istemciye döner. "Saatte 1000 istek hakkın var (Limit), geriye 998 kaldı (Remaining)" anlamına gelir.
- **`Strict-Transport-Security` (HSTS):** Proxy tüm trafiği HTTPS üzerinden zorlamayı kendi üzerinde halleder ve tarayıcıya "bu siteye bir daha asla güvensiz HTTP ile gelme" der.
- **`X-Frame-Options`:** Sitenin başka sitelerde iframe içinde açılmasını engelleyen güvenlik başlığıdır (clickjacking koruması).

### Yeni Nesil Standart: `Forwarded` (RFC 7239)

`X-Forwarded-For`, `X-Forwarded-Proto` gibi header'ların hepsi fiili (de facto) standartlardı. IETF, bu karmaşayı bitirmek için tek bir resmi standart yayınladı: **`Forwarded`** header'ı. Birden fazla başlık göndermek yerine, proxy tüm bilgileri tek bir header içinde noktalı virgüllerle birleştirir:

```http
Forwarded: for=192.0.2.60;proto=https;host=api.ornek.com;by=203.0.113.43
```

Gelecekte `X-Forwarded-*` yerine bu standart `Forwarded` header'ını görme ihtimalin giderek artacaktır.

> **Özetle:** Reverse proxy yalnızca trafiği ileten "aptal bir boru" değildir. İsteği izlemek için etiketler (`X-Request-ID`), güvenlik zırhları (HSTS) ve performans raporları (`X-Cache-Status`) ekleyerek backend geliştiricisinin ve sistem yöneticisinin işini inanılmaz kolaylaştırır.

---

## 4. WebSocket ve Protokol Yükseltme Header'ları

Yukarıdaki başlıklar trafiğin **kimden geldiğini** anlatır. Ama gerçek bir production konfigürasyonunda işin içine bir boyut daha girer: **gerçek zamanlı iletişim (WebSocket) ve protokol yükseltme (Upgrade).** Aşağıdaki Docker tabanlı örnek konfigürasyonun Node.js ve Grafana bloklarında, normal bir sayfa açmaya değil, **sürekli açık kalan canlı bağlantılar** kurmaya yarayan satırlar vardır.

Normalde internette HTTP protokolü kullanılır: istemci sorar, sunucu cevaplar, bağlantı kapanır (stateless). Ancak bir chat uygulaması (Socket.io) veya Grafana'daki canlı akan metrikler (Grafana Live) için bağlantının **sürekli açık kalması** gerekir. Buna WebSocket denir.

### `Upgrade` ve `Connection` Header'ları

İstemci Nginx'e gelip "ben standart HTTP'den WebSocket'e geçmek istiyorum" der. Nginx'in bu talebi arkadaki servise iletmesi için şu header'lara ihtiyacı vardır:

- **`proxy_set_header Upgrade $http_upgrade;`** — Tarayıcıdan gelen `Upgrade: websocket` başlığını alıp aynen arkaya iletir. İletişim dilini HTTP'den WebSocket'e "yükseltmek" için kullanılır.
- **`proxy_set_header Connection $connection_upgrade;`** — Bağlantının kapanmamasını, açık tutulmasını söyler.

### Harika Bir Nginx Taktiği: `map` Bloğu

Konfigürasyonun üst kısmında şu blok yer alır:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

Bu, Nginx'e bir "trafik polisi" zekası katar. Kural şudur: Kullanıcıdan gelen istekte bir `Upgrade` başlığı varsa (yani WebSocket istiyorsa), `Connection` başlığını `upgrade` olarak ayarla. Ama kullanıcı normal bir web sayfası istiyorsa (`Upgrade` başlığı boşsa), işin bitince bağlantıyı `close` ile kapat. Aşağıdaki yönlendirmelerde kullanılan `$connection_upgrade` değişkeni gücünü tamamen bu bloktan alır ve trafiğe göre dinamik davranır.

**Peki bu blok olmasaydı ne olurdu?** Nginx'in gelen isteğin standart bir HTTP sayfası mı yoksa sürekli açık kalması gereken bir WebSocket mı olduğunu dinamik olarak ayırt etme yeteneğini elinden almış olurdun. İki kötü senaryodan biri yaşanır:

- **Senaryo A — Bağlantı kopması:** `Connection "close"` şeklinde sabit bir değer yazarsan; kullanıcı web sayfasını sorunsuz açar ama açmak istediği canlı WebSocket anında kapanır. Canlı veri akışı (chat, anlık grafikler) çalışmaz.
- **Senaryo B — Kaynak tüketimi:** `Connection "upgrade"` şeklinde sabitlersen; bu sefer Nginx, basit bir `index.html` veya `logo.png` indirmek isteyen standart isteklere bile "bu bağlantıyı açık tut" muamelesi yapar. Bağlantı limitleri (`worker_connections`) gereksiz yere açık kalan "hayalet" bağlantılarla dolar ve kısa sürede `502 Bad Gateway` veya `Timeout` hataları alırsın.

### `proxy_http_version 1.1;`

Nginx, arkadaki sunucularla (upstream) konuşurken varsayılan olarak eski ve hantal **HTTP/1.0** protokolünü kullanır. HTTP/1.0 her istekte bağlantıyı açıp kapatır ve WebSocket gibi sürekli açık kalan bağlantıları (Keep-Alive) desteklemez. Bu satırı yazarak Nginx'e "arkadaki servislerle modern **HTTP/1.1** ile konuş, bağlantıyı hemen koparma" demiş olursun. Yukarıdaki `Upgrade` ve `Connection` header'larının çalışabilmesi için bu satır **zorunludur**.

### `proxy_cache_bypass $http_upgrade;`

Eğer Nginx üzerinde bir önbellekleme açıksa, WebSocket veya canlı veri akışı başlatan bir isteğin **asla önbellekten verilmemesi** gerekir. Canlı bir chat mesajının veya anlık CPU grafiğinin önbelleği olmaz. Bu satır, "bu bir yükseltilmiş bağlantıysa cache mekanizmasını tamamen atla ve veriyi direkt canlı çek" anlamına gelir.

---

## 5. Bir Nginx Konfigürasyonunun Satır Satır Anatomisi

Şimdi, IP iletmenin ötesine geçen ve sunucu kararlılığını doğrudan etkileyen direktiflere bakalım. İlk bakışta karmaşık bir büyü gibi görünseler de, her birinin somut bir gerekçesi vardır.

### `proxy_pass` + Değişken ve `resolver`: Docker'ın Hayat Kurtaran İkilisi

Normalde Nginx'te yönlendirme `proxy_pass http://api:3000;` şeklinde direkt yazılır. Ama Docker ortamlarında hedef bir değişkene atanır — bu kritik bir dayanıklılık (resilience) taktiğidir:

```nginx
resolver 127.0.0.11 valid=10s ipv6=off;

location / {
    set $api_upstream http://api:3000; # localhost yerine servis ismi
    proxy_pass $api_upstream$request_uri;
}
```

**Sorun:** Nginx başlarken `proxy_pass` içindeki adresi DNS üzerinden çözer (IP'sini bulur) ve hafızasına kaydeder. Arka plandaki `api` container'ı çöküp Docker tarafından yeniden başlatılırsa IP adresi değişebilir. Nginx eski IP'yi hatırladığı için trafiği ölü bir adrese gönderir ve `502` verir. Üstelik Nginx başlarken `api` container'ı henüz hazır değilse, Nginx tamamen çöker.

**Çözüm:** `resolver 127.0.0.11` satırı Nginx'e şunu söyler: IP adreslerini Docker'ın kendi iç DNS sunucusuna (`127.0.0.11`) sor, öğrendiğin IP'yi yalnızca 10 saniye aklında tut (`valid=10s`), sonra tekrar sor, IPv6 ile uğraşma (`ipv6=off`). Hedefi bir değişkene atadığın an Nginx adresi başlangıçta sabitlemez; her 10 saniyede bir yeniden kontrol eder. Böylece arka plandaki container'lar dursa, silinse, IP değiştirse bile sistem ayakta kalır. `$request_uri` ise kullanıcının domainden sonra yazdığı yolu (örn. `/api/users?id=5`) kaybetmeden arkaya taşır.

### Performansın Altın Üçlüsü (Kernel Seviyesi Optimizasyon)

```nginx
sendfile on;
tcp_nopush on;
tcp_nodelay on;
```

- **`sendfile on;`** — Normalde bir dosya okunurken veri diskten RAM'e (kernel space), oradan uygulamaya (user space), oradan tekrar ağ kartına gider. `sendfile` bu döngüyü iptal eder; veriyi doğrudan diskten ağ kartına kopyalar. Nginx'in CPU yormadan devasa statik dosyalar sunabilmesinin sırrı budur.
- **`tcp_nopush on;`** — Yalnızca `sendfile` ile çalışır. HTTP başlıklarını ve dosyanın ilk parçalarını tek bir ağ paketine sıkıştırarak gönderir. "Otobüs tam dolmadan hareket etme" mantığıdır; ağ trafiğini rahatlatır.
- **`tcp_nodelay on;`** — `tcp_nopush`'un zıttı gibi görünse de uyum içinde çalışır. Bağlantı Keep-Alive durumuna geçtiğinde, ufak veri paketlerinin (örn. WebSocket üzerinden giden bir chat mesajı) biriktirilmesini beklemeden **anında** gönderilmesini sağlar; gecikmeyi (latency) sıfıra indirir.

### Timeout ve Güvenlik İnce Ayarları

- **`keepalive_timeout 65;`** — Bir istemci sayfayı indirdikten sonra bağlantının 65 saniye daha açık kalmasını söyler. Kullanıcı kısa süre sonra başka sayfaya tıklarsa yeniden TCP el sıkışması yapılmaz; mevcut bağlantıdan veri hızla akar.
- **`types_hash_max_size 2048;`** — Nginx'in `.css`, `.js`, `.json` gibi dosya türlerini (MIME types) eşleştirdiği tablonun boyutudur. RAM'de biraz yer açarak dosya türü tespitini hızlandırır.
- **`server_tokens off;`** — Güvenlik kalkanıdır. Açıkken hata sayfalarında ve header'larda `Server: nginx/1.24.0` yazar; bunu gören bir bot o spesifik sürümdeki açığı deneyebilir. `off` olduğunda yalnızca `Server: nginx` yazar, sürümün gizli kalır.

### Sistemin Kalbi: `events` Bloğu

```nginx
events { worker_connections 1024; }
```

Nginx, olay güdümlü (event-driven) asenkron bir yapıya sahiptir. İşletim sistemindeki her bir işlemci çekirdeği için bir "Worker Process" oluşturur. `worker_connections` her bir worker'ın aynı anda kaç bağlantı kurabileceğini belirler.

Örneğin sunucunda 4 CPU çekirdeği varsa Nginx 4 worker başlatır: 4 × 1024 = 4096 anlık bağlantı kapasitesi demektir. Bu sayı, proxy'nin önünde bekleyen ziyaretçiler ile proxy'nin arkada Node.js ile kurduğu bağlantıların toplamını ifade eder. Yüksek trafikli sitelerde bu değer 4096, 8192 gibi sayılara çıkartılır.

---

## 6. Worker Limitleri: Varsayılanlar ve Ne Zaman Artırmalı?

Bu limitleri bilmek, bir sunucunun darboğaza (bottleneck) girmesini engellemenin en önemli adımlarından biridir.

### Varsayılan Değerler

- **`worker_processes` (işçi sayısı):** Varsayılan değeri **1**'dir. Ancak modern kurulumlarda genellikle **`auto`** olarak gelir; bu durumda Nginx CPU çekirdek sayısına bakar ve o kadar worker başlatır.
- **`worker_connections` (işçi başına bağlantı):** Varsayılan değeri **512**'dir (bazı Linux dağıtımlarının paketlerinde 1024 olarak da gelir).

Yani sıfır bir Nginx kurup hiçbir ayarına dokunmazsan, teorik olarak **512 eşzamanlı bağlantı** kapasitesiyle çalışmaya başlar.

### Limiti Artırman Gerektiğini Nereden Anlarsın?

Bunu tahminle değil, sistemin verdiği somut sinyallerle anlarsın. Üç temel kırmızı alarm:

**A. Nginx error loglarındaki net uyarı (en kesin kanıt).** Bağlantı limiti dolduğunda Nginx sessizce çökmez; `/var/log/nginx/error.log` dosyasına spesifik bir mesaj basar:

```
[alert] 768#0: *12345 1024 worker_connections are not enough while connecting to upstream
```

`worker_connections are not enough` ifadesini görüyorsan, kapasiteyi tamamen doldurmuşsun demektir; limiti (örn. 1024'ten 4096'ya) artırman gerekir.

**B. İşletim sistemi sınırı (Too Many Open Files).** Birçok geliştiricinin düştüğü en büyük tuzak budur. `worker_connections` değerini 8192 yapsan bile Linux buna izin vermeyebilir. Linux'ta her bağlantı (socket) bir "dosya" (file descriptor) sayılır. İşletim sisteminin Nginx kullanıcısına verdiği dosya açma limiti düşükse loglarda şunu görürsün:

```
[crit] 1234#0: *56789 open() "/var/www/html/index.html" failed (24: Too many open files)
```

Bu durumda yalnızca `worker_connections`'ı artırmak yetmez; konfigürasyonun en üstüne (events bloğunun dışına) Linux'tan daha fazla dosya açma izni isteyen bir satır eklemen gerekir:

```nginx
worker_rlimit_nofile 10000; # Linux'un dosya açma sınırını ezer

events {
    worker_connections 4096;
}
```

**C. Metrik izleme (proaktif yaklaşım).** Hataların loglara düşmesini beklemeden Grafana/Prometheus (veya Nginx'in `stub_status` modülü) üzerinden aktif bağlantı durumunu izleyebilirsin: `Active Connections` (canlı bağlantılar), `Waiting` (boşta bekleyen Keep-Alive bağlantıları), `Dropped` (kapasite dolduğu için reddedilenler). Eğer "Active Connections" grafiği teorik üst limitine (örn. 4096'ya) sık sık %80-90 oranında yaklaşıyorsa, hiç hata almamış olsan bile kapasite artırımı vaktin gelmiş demektir.

---

## 7. İki Klasik Belalı Problem

Yukarıdaki konfigürasyonların neden bu kadar titiz yazıldığını, iki devasa ve klasik web altyapısı problemi açıklıyor.

### Problem 1: Sonsuz Yönlendirme Döngüsü (Infinite Redirect Loop)

Tarayıcıda gördüğün meşhur **`ERR_TOO_MANY_REDIRECTS`** hatasının en yaygın sebebi budur. Olay, Nginx (proxy) ile arkadaki backend arasındaki bir "iletişim kopukluğundan" kaynaklanır:

1. **Kullanıcı** tarayıcıya `https://site.com` yazar (güvenli bağlantı).
2. **Nginx** isteği HTTPS olarak karşılar, SSL sertifikasını çözer. Ama arkadaki sunucuya isteği düz **HTTP (80 portu)** üzerinden iletir — çünkü iç ağda şifreleme yapmak sistemi yorar.
3. **Backend** isteğin şifresiz geldiğini görür, güvenlik kuralları gereği "burası güvenli değil, HTTPS'e git!" diyerek **301 yönlendirmesi** fırlatır.
4. **Kullanıcı** yönlendirmeye uyar, tekrar `https://site.com`'a gider.
5. **Döngü başlar:** Nginx yine HTTP olarak arkaya atar, backend yine "HTTPS'e git" der... Bu saniyeler içinde onlarca kez tekrar eder ve tarayıcı pes edip hatayı basar.

**Çözüm**, o sihirli satırdır: `proxy_set_header X-Forwarded-Proto $scheme;`. Bu satır eklendiğinde Nginx arkadaki sunucuya fısıldar: "Sana bu isteği HTTP ile yolluyorum ama korkma, orijinal kullanıcı bana **HTTPS** üzerinden güvenli bağlandı." Backend bu header'ı okur, rahatlar ve döngü kırılır.

### Problem 2: HTTP/1.1 Trafik Sıkışıklığı ve HTTP/2 Devrimi

Bir web sayfası tek bir HTML dosyasından ibaret değildir; içinde CSS, JavaScript ve onlarca resim bulunur.

- **Eski sistem (HTTP/1.1) — tek şeritli yol:** HTTP/1.1 bir seferde tek dosya indirir (tarayıcı 5-6 kısıtlı paralel bağlantı açmaya çalışır). HTML içinde 30 resim varsa tarayıcı bunları sıraya koyar: biri iner, bağlantı kapanır, diğeri için yeni bağlantı açılır. Bu "çok bekleme" (latency) ve yavaşlık yaratır. Buna **Head-of-Line Blocking** denir.
- **Yeni sistem (HTTP/2) — çok şeritli otoban:** HTTP/2 tarayıcı ile sunucu arasında **tek bir bağlantı** kurar. Ama bu tek bağlantı üzerinden HTML, CSS, JS ve 30 resim **aynı anda, birbirini beklemeden, parçalar (streams) halinde** akar. Buna **Multiplexing** denir; sayfalar anında belirir.

Konfigürasyondaki `listen 443 ssl http2;` satırı tam olarak şunu söyler: "443 portundan gelen güvenli trafiği dinle ve bu bağlantılarda eski yavaş HTTP/1.1 yerine yeni nesil **HTTP/2 protokolünü aktif et**." Böylece sitenin yüklenme hızını tek bir kelimeyle ikiye katlarsın.

---

## 8. "O Zaman Hep HTTP/2 Kullanayım" — Tam Olarak Değil

Modern web dünyasında sıfırdan kurulan her sistemde dış dünyaya karşı **varsayılan olarak HTTP/2 kullanmak** kesinlikle doğru bir hamledir; tüm modern tarayıcılar (Chrome, Safari, Edge) HTTP/2'yi destekler. Ama "her şeyi HTTP/2 yapıp geçmek" pratikte tam öyle işlemez. Aklında bulunması gereken birkaç kritik detay var.

### HTTP/2 İçin SSL (HTTPS) Zorunluluğu

Teorik olarak HTTP/2 şifresiz çalışabilir. Ama pratikte **hiçbir tarayıcı şifresiz HTTP/2'yi desteklemez.** 80 portuna (HTTP) `http2` yazarsan tarayıcılar buna bağlanmayı reddeder. Multiplexing'in nimetlerinden faydalanmak istiyorsan sitenin mutlaka bir SSL sertifikası olmalı ve 443 portu üzerinden sunulmalıdır. `listen 443 ssl http2;` satırının birlikte yazılmasının sebebi tam olarak budur.

### Nginx ile Backend Arasındaki Gizli Anlaşma

Dış kapıda ziyaretçileri HTTP/2 ile karşılarsın. Ama Nginx, trafiği arkadaki Node.js veya Laravel container'larına iletirken `proxy_http_version 1.1;` kullanır. **Neden arkaya hâlâ HTTP/1.1 ile konuşur?**

Çünkü Nginx ile arka plandaki container'ların aynı makinede veya aynı izole yerel ağda (Docker network) çalışır. Aralarında bir okyanus yok; ağ gecikmesi zaten **sıfıra yakındır (~0.1ms)**. HTTP/2'nin multiplexing özelliği internet gibi yavaş ve mesafeli ağlar için harikadır, ama sunucu içindeki yerel ağda HTTP/2 trafiğini şifrelemek ve paketlere bölmek CPU'ya tamamen gereksiz yük bindirir. Endüstri standardı şudur: **ön kapıda (tarayıcı–proxy arası) HTTP/2, arka kapıda (proxy–container arası) hızlı ve hafif olan HTTP/1.1.**

### Gelecek Çoktan Geldi: HTTP/3

"Hep HTTP/2 kullanayım" derken web dünyası boş durmadı ve HTTP/3 standartlaştı. HTTP/1 ve HTTP/2 altyapısında güvenilir ama yavaş olan **TCP** protokolünü kullanır (bağlantı için sürekli el sıkışma yaparlar). HTTP/3 ise oyunlarda kullanılan çok daha hızlı ve kesintisiz **UDP** altyapısı üzerine inşa edildi — buna **QUIC** protokolü deniyor.

Özellikle mobil cihazlarda (kullanıcı Wi-Fi'den 5G'ye geçerken) HTTP/2 bağlantısı kopar ve baştan kurulması gerekir. HTTP/3 bağlantıyı hiç koparmadan geçişi sağlar. Bugün büyük haber portalları, sosyal medya devleri ve video platformları trafiği yavaş yavaş HTTP/3'e kaydırmış durumda; Nginx'in güncel sürümleri de bunu destekliyor.

> **Özetle:** Ziyaretçiye bakan dış cephede **HTTP/2** (destekliyorsa HTTP/3) açmak doğru bir hamledir. Arka planda mikroservislerinin birbiriyle konuşması için **HTTP/1.1** kullanmaya devam edebilirsin. Mimari tam olarak bu dengeyle çalışır.

---

## 9. Production Performans Katmanları

Bu kavramlar, özellikle yüksek trafikte sistemin çökmesiyle ayakta kalması arasındaki ince çizgiyi belirler.

### HTTP/3 ve QUIC: Hızın Yeni Kuralları

İnternetin temeli yıllarca **TCP** üzerine kuruluydu. TCP inanılmaz güvenilirdir ama "bürokratik"tir: iki bilgisayar konuşmadan önce uzun uzun el sıkışır (3-way handshake) ve bir paket yolda kaybolursa o paket gelene kadar arkadaki tüm trafiği durdurur (head-of-line blocking).

Google mühendisleri "TCP çok yavaş, bunu değiştirelim" dedi. Canlı yayın ve oyunlarda kullanılan, hızlı ama paketin ulaşıp ulaşmadığını umursamayan **UDP**'yi aldılar, içine TCP'nin güvenilirliğini ve TLS şifrelemesini gömdüler. Ortaya **QUIC** çıktı. Farkı, kırmızı ışıkta durmadan geçen bir ambulans gibidir: kullanıcı Wi-Fi'den mobil veriye geçtiğinde IP adresi değişir, TCP anında kopar; QUIC ise bağlantıyı "Connection ID" ile takip ettiği için kesintisiz indirmeye devam eder.

### Nginx Neden Bu Kadar Hızlı? (Event-Driven Mimari)

Eski nesil web sunucuları (örn. eski Apache) lokantadaki geleneksel garsonlar gibi çalışır (process/thread tabanlı): bir müşteri (istek) geldiğinde bir garson yalnızca onunla ilgilenir, müşteri menüye bakarken (veritabanı beklerken) garson masada dikilir. 1000 müşteri = 1000 garson; RAM biter, sunucu çöker.

Nginx ise **olay güdümlü asenkron (event-driven asynchronous)** yapıyla tasarlandı. Garson (worker process) elinde bir telsizle (epoll/kqueue) çalışır: siparişi alır, mutfağa (Node.js/Laravel'e) iletir, ama yemeği beklemez — anında dönüp diğer 999 müşterinin siparişini alır. Yemek hazır olunca mutfak zili çalar (event trigger), garson yemeği ilgili masaya bırakır. Bu yüzden Nginx, birkaç megabayt RAM harcayarak aynı anda on binlerce bağlantıyı (C10K problemi) terlemeden yönetir.

### Önbellekleme (Cache) ve CDN Savunma Hattı

Yüksek trafikte kural şudur: **en hızlı veritabanı sorgusu, hiç yapılmayan sorgudur.**

- **Nginx Microcaching (iç savunma hattı):** Bir haberin sayfası 1 saniyede 500 kez ziyaret ediliyorsa, Nginx'e "bu sayfanın çıktısını RAM'de 1 saniye tut" dersin. Backend 500 kez yorulmak yerine 1 kez çalışır, kalan 499 kişiye Nginx önbellekteki HTML'i direkt fırlatır.
- **CDN — Content Delivery Network (dış savunma hattı):** Nginx sunucunu korur, CDN ise sunucunun ta kendisini korur.

CDN'i biraz açalım. Sunucunun fiziksel konumu hızı doğrudan etkiler: sunucun İstanbul'daysa, İstanbul'daki bir kullanıcı veriye ~10 ms'de ulaşırken, Amerika'daki bir kullanıcı okyanus altı kablolar nedeniyle 150-200 ms bekleyebilir. CDN, dünyadaki stratejik noktalara yerleştirilmiş "Edge" (uç) sunucular ağıdır; kullanıcı asıl sunucuna (Origin) gitmek yerine kendisine en yakın CDN sunucusuna yönlendirilir.

Somut bir senaryo: `api.selimboz.com`'un ana sunucusu Almanya'da (Frankfurt). CDN yokken Türkiye'den bağlanan 10.000 ziyaretçinin hepsi doğrudan Frankfurt'a istek atar; bant genişliği tıkanır, işlemci yorulur. Cloudflare gibi bir CDN varken Türkiye'deki ziyaretçiler İstanbul'daki Edge sunucusuna bağlanır; CDN veriyi Frankfurt'tan bir kez çekip İstanbul'da önbelleğe alır ve kalan 9.999 kişiye İstanbul'dan cevap verir — ana sunucunun haberi bile olmaz, CPU kullanımı %1'de kalır. Bonus olarak bir DDoS saldırısında milyonlarca sahte istek, sunucuna ulaşmadan CDN'in uç noktalarında engellenir.

### Gzip vs. Brotli ve Statik Dosya Optimizasyonu

Kullanıcıya gönderilen veriyi küçültmek, hızı artırmanın en ucuz yoludur. Nginx dosyaları göndermeden hemen önce anlık olarak sıkıştırabilir:

- **Gzip:** Yılların standart algoritması, neredeyse her yerde desteklenir. Dosyaları yaklaşık %60-70 küçültür.
- **Brotli (`br`):** Google'ın geliştirdiği yeni nesil algoritma. Gzip'ten %15-25 daha fazla sıkıştırır ve açılması (decompress) tarayıcı tarafında çok hızlıdır. Sunucuda kesinlikle aktif edilmelidir.

Geniş bir JSON ya da büyük bir `app.js` dosyası için kabaca: ham 1000 KB → Gzip ile ~300 KB → Brotli ile ~240 KB.

**Altın kural:** Resimleri (JPEG, PNG, WebP) ve videoları (MP4) **asla** Nginx ile sıkıştırmaya çalışma. Zaten sıkıştırılmış formatlar oldukları için boyutları küçülmez; sadece CPU'yu boş yere %100'e vurmasına sebep olursun. Yalnızca metin tabanlı dosyaları (HTML, CSS, JS, JSON, XML, SVG) sıkıştır.

### Gerçek Production Tuning (İnce Ayarlar)

Varsayılan kurulum geliştirme ortamı için harikadır; ama vahşi internete çıktığında bazı zırhlara ihtiyacın olur.

**Tampon bellek (buffer) ayarları — DDoS koruması.** Kötü niyetli kişiler devasa HTTP başlıkları veya çöp veriler göndererek RAM'i şişirmeye çalışır. Limitleri katı belirle:

```nginx
client_max_body_size 10M;      # Kullanıcının yükleyebileceği max dosya boyutu
client_body_buffer_size 16K;   # İsteğin gövdesi için ayrılan RAM
client_header_buffer_size 1k;  # Başlıklar çok uzunsa reddet
```

**Open File Cache.** Nginx sürekli diskten log, HTML veya resim okur; Linux'ta her okuma, dosyanın diskte nerede olduğunu bulmak için işlem gücü ister.

```nginx
open_file_cache max=10000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;
```

Bu ayar Nginx'e şunu der: "En çok okunan 10.000 dosyanın diskteki yolunu (metadata) RAM'de tut. Aynı resmi arayan biri gelince diski yorma, adresini zaten biliyorsun."

---

## 10. Hepsini Birleştiren Production Nginx Konfigürasyonu

Certbot tarafından oluşturulan temel bir konfigürasyonu; HTTP/2, WebSocket (Upgrade) desteği, HTTP/1.1 backend iletişimi ve güvenlik limitleriyle donatarak tam bir "production" seviyesine çıkaralım. Bu dosya `/etc/nginx/sites-available/` içinde durduğu için en üstüne `map` bloğunu ekleyebiliriz (Nginx bunu `http` bloğu içinde sayar).

```nginx
# 1. WebSocket bağlantıları için dinamik header eşleştirmesi
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name api.selimboz.com;

    # Tüm HTTP trafiğini güvenli HTTPS'e yönlendir (sonsuz döngü yaratmaz)
    return 301 https://$host$request_uri;
}

server {
    # 2. HTTP/2 Devrimi: modern tarayıcılar için multiplexing aktif
    listen 443 ssl http2;
    server_name api.selimboz.com;

    # SSL ayarları (Certbot)
    ssl_certificate /etc/letsencrypt/live/api.selimboz.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.selimboz.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/nginx/dhparam.pem;

    # Güvenlik ve performans header'ları
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;

    # 3. Yükleme limitleri (DDoS ve bellek şişmesine karşı koruma)
    client_max_body_size 20M;
    client_body_buffer_size 128k;

    # Node.js API (Backend)
    location / {
        proxy_pass http://127.0.0.1:3000;

        # 4. Backend ile modern ve sürekli iletişim
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_cache_bypass $http_upgrade;

        # 5. Gerçek kullanıcı verisini taşıyan standart header'lar
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Grafana (canlı metrikler için WebSocket şarttır)
    location /grafana/ {
        proxy_pass http://127.0.0.1:3001;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Prometheus
    location /prometheus/ {
        proxy_pass http://127.0.0.1:9090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Mongo Express
    location /mongo-express/ {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Bu sürümde yapılan kritik değişiklikler: `listen 443 ssl;` satırı `listen 443 ssl http2;` olarak güncellendi; en üste `map` bloğu eklendi; Node.js ve Grafana hedefleri için `proxy_http_version 1.1;`, `Upgrade` ve `Connection` başlıkları eklendi (Grafana loglarındaki WebSocket hatalarını çözer); gereksiz yere şişen iki ayrı 80 portu bloğu tek bir yönlendirme bloğunda birleştirildi; API uç noktalarını korumak için `client_max_body_size` eklendi; eksik olan `X-Forwarded-Proto $scheme;` başlıkları tüm servislere eklendi (özellikle Mongo Express ve Prometheus'un HTTPS üzerinden geldiğini anlaması arayüz hatalarını engeller).

---

## 11. Tarayıcı Seviyesindeki Güvenlik Kalkanı: Üç Silahşör

Yukarıdaki konfigürasyona eklenen şu üç satır, uygulamanın koduna hiç dokunmadan, yalnızca HTTP yanıt başlıkları (response headers) üzerinden tarayıcı seviyesinde kritik güvenlik kalkanları oluşturur. Büyük platformlarda bu header'ların eksikliği, saldırganların en sevdiği açık kapılardan bazılarını yaratır.

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options nosniff;
add_header X-Frame-Options SAMEORIGIN;
```

### HTTP Strict Transport Security (HSTS)

Bu başlık tarayıcıya "bu siteyle önümüzdeki 2 yıl boyunca yalnızca HTTPS üzerinden konuşacaksın!" emrini verir.

**Neden önemli?** HTTP'den HTTPS'e 301 yönlendirmesi yapsan bile, kullanıcı adresi ilk kez `http://api.selimboz.com` olarak yazdığında sunucuya giden o ilk ham istek şifresizdir. Saldırganlar tam o milisaniyede araya girip bağlantıyı ele geçirebilir (**SSL Stripping / Aradaki Adam saldırısı**). HSTS aktifken tarayıcı, daha sunucuya gitmeden isteği kendi içinde otomatik olarak HTTPS'e yükseltir.

Parametreler:

- **`max-age=63072000`** — Kuralın tarayıcı hafızasında saniye cinsinden ne kadar kalacağı (63.072.000 saniye = 2 yıl).
- **`includeSubDomains`** — Kuralın yalnızca ana domain için değil, tüm alt domain'ler (örn. `panel.selimboz.com`, `grafana.selimboz.com`) için de geçerli olmasını sağlar.
- **`preload`** — Sitenin, tarayıcılar tarafından yönetilen "HSTS Preload List" içine dahil edilmesini talep eder. Listede yer alırsan, kullanıcı sitene hayatında ilk kez giriyor olsa bile tarayıcı doğrudan HTTPS ile bağlanır.
- **`always`** — Header'ın yalnızca `200 OK` gibi başarılı yanıtlarda değil, `404` veya `500` gibi hatalarda da her zaman gönderilmesini garanti eder.

### X-Content-Type-Options: `nosniff`

Bu başlık, tarayıcıların kendi kafalarına göre dosya türü tahmini yapmasını (**MIME Sniffing**) engeller.

**Neden önemli?** Sunucu bir dosya gönderirken yanına `Content-Type: image/png` gibi bir etiket koyar. Ama bazı tarayıcılar "sunucu bunun resim olduğunu söylüyor ama içinde JavaScript var, dur ben bunu script gibi çalıştırayım" diyebilir. Bir kullanıcının masum bir profil resmi (PNG) yüklediğini ama içine zararlı JavaScript gizlediğini düşün. Bu header yoksa tarayıcı o resmi açarken içindeki script'i çalıştırıp bir **XSS (Cross-Site Scripting)** saldırısı tetikleyebilir. `nosniff` tarayıcıya "sana içerik türü olarak ne gönderdiysem ona inan, arkasını koklama" der.

### X-Frame-Options: `SAMEORIGIN`

Bu başlık, sayfanın başka siteler tarafından bir `<iframe>` içine gömülüp gömülemeyeceğini belirler.

**Neden önemli? (Clickjacking saldırısı):** Bir saldırgan `bedava-iphone-kazan.com` diye bir site açar ve arka planına senin yönetim panelini iframe ile gömer, sonra CSS ile seninkini tamamen şeffaf yapar. Kullanıcı "bedava telefon kazan" butonuna tıkladığını sanırken, aslında görünmez duran senin sitendeki "Hesabımı Sil" veya "Para Gönder" butonuna tıklamış olur. `SAMEORIGIN`, tarayıcıya "bu sayfayı yalnızca aynı domain'e ait sayfalar iframe'e alabilir, hiçbir harici site gömemez" der ve clickjacking'i imkansız hale getirir.

---

## 12. Neden Bu Ayarlar `sites-available` İçine Konmaz? (Nginx Hiyerarşisi)

Şöyle bir performans bloğu görüp doğrudan kendi `sites-available/api.selimboz.com` dosyana eklemek isteyebilirsin:

```nginx
events { worker_connections 1024; }

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    resolver 127.0.0.11 valid=10s ipv6=off;
    # ...
}
```

Ama bunu yaparsan Nginx hata verir ve çalışmaz:

```
nginx: [emerg] "events" directive is not allowed here
```

Sebep tamamen Nginx'in **mimari yapısı ve dosya hiyerarşisiyle** ilgilidir. Nginx ayarları katmanlı (iç içe geçmiş) bir blok yapısına sahiptir: en üstte global ayarlar, onun içinde `http` bloğu, onun içinde de bireysel `server` (Virtual Host) blokları bulunur. Senin `sites-available/api.selimboz.com` dosyan, ana `nginx.conf` içindeki `http {}` bloğuna **otomatik olarak include edilen** bir alt dosyadır.

- **`events { ... }`** bloğu en üst (global) seviyede tanımlanmalıdır; bir `server` veya `http` bloğunun içine yazılamaz. Sunucunun genel bağlantı kapasitesini belirler.
- **`http { ... }`** bloğu Nginx'in trafiği nasıl yöneteceğini belirleyen ana kapsayıcıdır. Linux dağıtımlarında varsayılan olarak `/etc/nginx/nginx.conf` içinde zaten bir `http` bloğu açılmıştır ve Nginx iç içe iki `http {}` bloğuna izin vermez.
- **`sendfile`, `tcp_nopush`, `tcp_nodelay`, `keepalive_timeout`** gibi ayarlar tüm sunucuyu ve tüm siteleri etkileyen HTTP çekirdek ayarlarıdır. Bunların yeri her sitenin kendi dosyası değil, ana `/etc/nginx/nginx.conf` dosyasındaki `http { ... }` bloğudur.

Yani bu harika performans ve Docker optimizasyon ayarlarının yeri ana konfigürasyon dosyasıdır: **`/etc/nginx/nginx.conf`**. Site özelindeki `proxy_pass`, `location` ve header ayarları ise `sites-available` dosyasında kalır.

---

## 13. Son Adım: Deprecated `http2` Direktifi Uyarısı

Konfigürasyonu kaydedip `sudo nginx -t` çalıştırdığında şuna benzer bir çıktı alabilirsin:

```
2026/06/18 14:26:42 [warn] 68618#68618: the "listen ... http2" directive is deprecated,
use the "http2" directive instead in /etc/nginx/sites-enabled/api.selimboz.com:17
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

En alttaki `syntax is ok` ve `test is successful` satırları konfigürasyonun sorunsuz çalıştığını ve `systemctl reload nginx` ile sunucuyu yeniden yükleyebileceğini gösteriyor. Üstteki `[warn]` satırı ise Nginx'in çok güncel bir sürümünü (1.25.1 veya daha yeni) kullandığını ve kodlama standardının değiştiğini söylüyor.

**Neden bu uyarıyı aldın?** Uzun yıllar boyunca HTTP/2'yi aktif etmenin standart yolu, `listen` komutunun sonuna parametre eklemekti. Ancak Nginx mimarları (HTTP/3 ve QUIC'in de gelmesiyle) protokol tanımlamalarını `listen` komutunun içinden çıkarıp bağımsız bir komut haline getirdi.

**Çözüm:** İlgili dosyada eski yazımı yeni standarda göre değiştir.

Eski hali:

```nginx
listen 443 ssl http2; # managed by Certbot
```

Yeni ve doğru hali:

```nginx
listen 443 ssl;   # managed by Certbot
http2 on;         # HTTP/2'yi yeni standartla aktif ediyoruz
```

Bu değişikliği yapıp tekrar `sudo nginx -t` çalıştırdığında sarı uyarı mesajının tamamen kaybolduğunu ve tertemiz bir onay aldığını göreceksin. Siten artık HTTP/2 ile fiilen çalışmaya hazır.

---

## Kapanış

Forward Proxy ile Reverse Proxy arasındaki basit ayrımdan başlayıp, gerçek bir kullanıcının IP'sini backend'e taşıyan header'lara, WebSocket tünellerine, event-driven mimariye, HTTP/2-3 ve QUIC'e, CDN ve sıkıştırma katmanlarına kadar geldik. Tüm bu parçalar tek bir resimde buluşur: dış kapıda Cloudflare (CDN) trafiği süzer, içeriye HTTP/2 (veya HTTP/3) ile girilir, Nginx trafiği Brotli ile sıkıştırıp statik dosyaları kendi cache'inden verir, yalnızca en zorlu sorgular arka plandaki Node.js veya Laravel API'sine HTTP/1.1 üzerinden ulaşır.

Bir reverse proxy, gördüğümüz gibi, "trafiği ileten aptal bir boru" değildir. Doğru yapılandırıldığında o, sistemin en sessiz ama en çok çalışan kahramanıdır.

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
