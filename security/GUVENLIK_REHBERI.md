# Sunucu Güvenliği Rehberi (Sıfırdan Başlayanlar İçin)

Bu rehber, denetim script'inin (`server-security-audit.sh`) bulabileceği sorunları
**öncelik sırasına göre** nasıl çözeceğini anlatır. Hiç bilmiyorsan bile sırayla
uygulayabilirsin. Her adımda **neden** yaptığını da açıklıyorum.

> **Altın kural:** Bir değişiklik yapmadan önce SSH bağlantını **kapatma**.
> Yeni bir terminal penceresi aç, oradan tekrar bağlanabildiğini test et.
> Özellikle SSH ve firewall ayarlarında, yanlış yaparsan sunucuya kilitlenebilirsin.

---

## Öncelik Sırası (En kritikten başla)

| # | Konu | Risk | Süre |
|---|------|------|------|
| 1 | SSH'ı güvenli hale getir | 🔴 Çok yüksek | 15 dk |
| 2 | Firewall kur ve aç | 🔴 Çok yüksek | 10 dk |
| 3 | fail2ban kur (brute-force koruması) | 🟠 Yüksek | 10 dk |
| 4 | Güncellemeleri yap + otomatikleştir | 🟠 Yüksek | 10 dk |
| 5 | Kullanıcı & yetki temizliği | 🟡 Orta | 10 dk |
| 6 | Docker/uygulama portlarını kapat | 🟡 Orta | 15 dk |
| 7 | İzleme ve yedekleme alışkanlığı | 🟢 Sürekli | — |

---

## 0. Önce Mevcut Durumu Gör

Hiçbir şey yapmadan önce denetimi çalıştır, **çıktıyı kaydet**. Bu senin "başlangıç fotoğrafın".

```bash
cd security
./run-remote-audit.sh root@45.138.25.195 ../devops.pem
```

`[FAIL]` (kırmızı) olanlar acil, `[WARN]` (sarı) olanlar gözden geçirilecek demek.
Aşağıdaki adımları yaptıktan sonra tekrar çalıştır; kırmızıların yeşile döndüğünü göreceksin.

---

## 1. SSH'ı Güvenli Hale Getir 🔴

SSH, sunucuna uzaktan girdiğin kapı. İnternetteki botlar gün boyu bu kapıyı zorlar.
**En kritik adım budur.**

### a) Anahtar (key) ile giriş — şifreyi kapat
Sende zaten `devops.pem` anahtarı var, demek ki anahtarla girebiliyorsun. O zaman
**şifreyle girişi tamamen kapatmalısın** — böylece şifre tahmin etme (brute-force) saldırıları imkânsız hale gelir.

Sunucuda şu dosyayı düzenle: `/etc/ssh/sshd_config`

```bash
ssh -i devops.pem root@45.138.25.195
sudo nano /etc/ssh/sshd_config
```

Şu satırları bul (yoksa ekle), `#` varsa kaldır ve şöyle yap:

```
PermitRootLogin prohibit-password
PasswordAuthentication no
PermitEmptyPasswords no
PubkeyAuthentication yes
MaxAuthTries 3
```

> **Önce şunu kontrol et:** Anahtarın gerçekten çalışıyor mu? Bunu kapatınca artık
> sadece anahtarla girebileceksin. Yeni bir terminalde `ssh -i devops.pem root@...`
> ile girebildiğini **test etmeden** şifreyi kapatma.

Kaydet (nano'da `Ctrl+O`, `Enter`, `Ctrl+X`), sonra ayarı test edip SSH'ı yeniden başlat:

```bash
sudo sshd -t            # syntax hatasi var mi? Cikti yoksa temiz demektir.
sudo systemctl restart ssh   # bazi sistemlerde: sudo systemctl restart sshd
```

### b) (İsteğe bağlı, önerilir) SSH portunu değiştir
Varsayılan port 22'yi örneğin 2222 yaparsan otomatik botların çoğu seni göremez.
`sshd_config` içinde `Port 2222` yap. **Ama önce firewall'da bu portu açtığından emin ol**
(adım 2), yoksa kilitlenirsin. Bağlanırken `ssh -p 2222 ...` kullanırsın.

---

## 2. Firewall Kur ve Aç 🔴

Firewall, "hangi portlar dışarıya açık" kararını verir. Açık olmaması gereken her şeyi kapatır.
Ubuntu/Debian'da en kolayı **UFW**.

```bash
sudo apt update && sudo apt install -y ufw

# ÖNCE SSH'i ac (yoksa kendini disari kilitlersin!)
sudo ufw allow 22/tcp        # SSH portunu degistirdiysen: sudo ufw allow 2222/tcp

# Web uygulaman varsa:
sudo ufw allow 80/tcp        # HTTP
sudo ufw allow 443/tcp       # HTTPS

# Varsayilan politika: gelen her seyi engelle, gideni serbest birak
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Etkinlestir
sudo ufw enable
sudo ufw status verbose       # kurallari gor
```

> **Dikkat:** `ufw enable` derken SSH portunu açmayı unutursan bağlantın kopar ve
> bir daha giremezsin. Bu yüzden SSH `allow` komutunu **her zaman önce** çalıştır.

**Mantık:** Sadece gerçekten kullandığın portları aç (SSH + web). Veritabanı (MongoDB 27017,
Prometheus 9090, Grafana 3000 gibi) portlarını **dışarıya AÇMA** — bunlara sadece sunucu
içinden veya VPN/tünel ile erişilmeli.

---

## 3. fail2ban Kur (Brute-Force Koruması) 🟠

fail2ban, çok fazla yanlış giriş denemesi yapan IP'leri otomatik olarak geçici banlar.
SSH'a yönelik saldırıları büyük ölçüde kesir.

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status          # aktif jail'leri gor
sudo fail2ban-client status sshd     # SSH icin banlanan IP'ler
```

Varsayılan ayarlar SSH için zaten iyidir. Daha sıkı yapmak istersen
`/etc/fail2ban/jail.local` oluşturup `bantime`, `findtime`, `maxretry` değerlerini ayarlayabilirsin.

---

## 4. Güncellemeleri Yap ve Otomatikleştir 🟠

Yazılım açıklarının çoğu, yamalanmış olmasına rağmen **güncellenmemiş** sistemlerden sızar.

```bash
# Simdi guncelle
sudo apt update && sudo apt upgrade -y

# Guvenlik guncellemelerini OTOMATIK yap
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades   # cikan ekranda "Yes" sec
```

Bu sayede kritik güvenlik yamaları sen uğraşmadan kurulur.

---

## 5. Kullanıcı ve Yetki Temizliği 🟡

- **Tek root olmalı:** Denetim "Birden fazla UID=0 hesabı" derse, fazladan root yetkili
  hesap var demektir — incele, gereksizse kaldır.
- **Boş şifreli hesap olmamalı.** Varsa ya şifre ver ya hesabı kilitle: `sudo passwd -l KULLANICI`.
- **Günlük iş için root kullanma:** Kendine normal bir kullanıcı aç, sudo yetkisi ver,
  günlük işleri onunla yap:
  ```bash
  sudo adduser selim
  sudo usermod -aG sudo selim
  # selim'in ~/.ssh/authorized_keys dosyasina kendi public key'ini ekle
  ```
- **Kullanılmayan hesapları kapat.** `nologin` kabuğu olmayan, tanımadığın hesaplara dikkat et.

---

## 6. Docker / Uygulama Portlarını Kapat 🟡

Bu projede Docker, Prometheus, Grafana, MongoDB var. Docker'ın sinsi bir özelliği:
`-p 0.0.0.0:27017:27017` gibi yayınladığın portlar **UFW'yi atlayıp** doğrudan dışarıya açılır.

**Kural:** Sadece dışarıdan erişilmesi gereken portu yayınla (örn. web). Geri kalanını
ya hiç yayınlama ya da sadece localhost'a bağla:

```yaml
# docker-compose.yml - YANLIS (herkese acik):
ports:
  - "27017:27017"

# DOGRU (sadece sunucu icinden erisilir):
ports:
  - "127.0.0.1:27017:27017"
```

Grafana (3000), Prometheus (9090), MongoDB (27017) gibi servisleri internete açma.
Onlara erişmen gerekirse SSH tüneli kullan:
```bash
# Kendi makinende: localhost:3000 -> sunucudaki Grafana
ssh -i devops.pem -L 3000:localhost:3000 root@45.138.25.195
```

---

## 7. İzleme ve Yedekleme (Sürekli Alışkanlık) 🟢

- **Denetimi periyodik çalıştır:** Ayda bir `run-remote-audit.sh` çalıştır, çıktıları sakla,
  değişiklikleri karşılaştır.
- **Logları takip et:** `sudo journalctl -u ssh` ile SSH girişlerini, `sudo lastb` ile
  başarısız denemeleri görebilirsin.
- **Yedek al:** Veritabanı ve önemli konfigürasyon dosyalarının düzenli yedeğini al.
  Güvenlik sadece "girilmesin" değil, "bir şey olursa geri dönebileyim" demektir.
- **Gizli bilgileri repoya koyma:** `devops.pem` gibi anahtarlar, şifreler, `.env` dosyaları
  asla Git'e gitmemeli. `.gitignore`'a ekli olduklarından emin ol.

---

## Hızlı Kontrol Listesi (Yaptıkça işaretle)

- [ ] Anahtarla giriş çalışıyor, **şifreyle giriş kapalı** (`PasswordAuthentication no`)
- [ ] `PermitRootLogin prohibit-password` (veya `no` + ayrı sudo kullanıcısı)
- [ ] Firewall (UFW) **aktif**, sadece gerekli portlar açık
- [ ] fail2ban kurulu ve çalışıyor
- [ ] Sistem güncel + otomatik güvenlik güncellemesi açık
- [ ] Boş şifreli / fazladan root hesabı yok
- [ ] Veritabanı/izleme portları dışarıya kapalı (`127.0.0.1`'e bağlı)
- [ ] `devops.pem` ve şifreler Git'te değil
- [ ] Denetim script'i tekrar çalıştırıldı, kırmızılar gitti

---

## Acil Durum: "Sunucuya giremiyorum!"

SSH/firewall ayarını yanlış yapıp kilitlendiysen panik yapma:
- Çoğu VPS sağlayıcısının (Hetzner, DigitalOcean vb.) panelinde **web konsol / VNC** vardır.
  Oradan SSH'sız giriş yapıp hatalı ayarı geri alabilirsin.
- Bu yüzden **her zaman** yeni bir test bağlantısı açık tutarak değişiklik yap.

---

İlk üç adımı (SSH + firewall + fail2ban) yaparsan riskin %90'ını kapatmış olursun.
Takıldığın adımı söyle, o adımı senin sunucuna özel komutlarla birlikte tek tek yapalım.
