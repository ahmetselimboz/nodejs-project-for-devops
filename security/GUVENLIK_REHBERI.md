# Sunucu Güvenliği ve Savunma Sanatı: A'dan Z'ye Eğitim Rehberi

Bu rehber, sunucu güvenliği denetim betiğinin (`server-security-audit.sh`) raporlayabileceği açıkları kapatırken size rehberlik etmek için tasarlanmıştır. Amacımız sadece komutları ezbere kopyalayıp yapıştırmak değil; **her adımın arkasındaki mantığı, riskleri ve işletim sisteminin arka planda ne yaptığını** öğrenmenizdir.

---

## 🔐 Temel Güvenlik Felsefesi

Güvenlikde iki altın ilke vardır:
1. **En Az Yetki İlkesi (Principle of Least Privilege):** Bir kullanıcı veya servis, sadece işini yapmasına yetecek kadar hakka sahip olmalıdır. (Örn: Root ile doğrudan çalışmamak, servis hesaplarının terminal erişimini kapatmak).
2. **Derinlemesine Savunma (Defense in Depth):** Tek bir savunma hattına güvenilmez. SSH şifresini kapatsanız bile önüne Firewall koyarsınız, onun önüne de Brute-Force engelleyici (fail2ban) yerleştirirsiniz. Biri aşılsa bile diğeri devreye girer.

---

## 📁 Güvenlik Adımları Yol Haritası

| Adım | Konu | Risk Seviyesi | Ne Sağlar? |
| :--- | :--- | :--- | :--- |
| **1** | **SSH Güvenliği** | 🔴 Çok Yüksek | Sunucu giriş kapısını şifre taramalarına kapatır. |
| **2** | **Firewall (UFW) Kurulumu** | 🔴 Çok Yüksek | Sadece izin verilen portların dış dünyaya açılmasını sağlar. |
| **3** | **fail2ban (Otomatik Engel)** | 🟠 Yüksek | Şüpheli IP'leri otomatik olarak tespit edip bloklar. |
| **4** | **Otomatik Güncellemeler** | 🟠 Yüksek | Bilinen güvenlik açıklarının yamalarını otomatik yükler. |
| **5** | **Kullanıcı & Yetki Denetimi** | 🟡 Orta | Yetkisiz kişilerin veya gizli hesapların sisteme sızmasını önler. |
| **6** | **Docker Port Güvenliği** | 🟡 Orta | Docker'ın firewall kurallarını sinsice aşmasını engeller. |

---

## 1. SSH Güvenliği (Giriş Kapısını Koruma) 🔴

SSH (Secure Shell), sunucunuzu uzaktan yönettiğiniz ana kapıdır. İnternetteki botlar, IP adreslerini tarayarak sürekli varsayılan portlardan içeri sızmaya çalışır.

### a) Anahtar (Key) ile Giriş — Şifreyi Kapatma

#### ❓ Neden Yapıyoruz?
Botlar sözlük saldırıları (Brute-Force) ile saniyede yüzlerce şifre deneyerek sunucunuza girmeye çalışır. SSH anahtarları (örn. `id_ed25519` veya RSA anahtarları) ise matematiksel olarak tahmin edilmesi imkansız olan devasa şifreleme anahtarlarıdır. Şifreyle girişi tamamen kapatıp sadece anahtar zorunluluğu getirdiğinizde, şifre deneme saldırıları tamamen etkisiz hale gelir.

#### 🛠️ Uygulama adımları:
Sunucudaki `/etc/ssh/sshd_config` dosyasını düzenleyin:
```bash
sudo nano /etc/ssh/sshd_config
```

Aşağıdaki parametreleri bulun, başlarında `#` varsa silin (uncomment) ve değerlerini şu şekilde güncelleyin:

* **`PermitRootLogin prohibit-password`**
  * *Ne anlama gelir?* Root kullanıcısının şifreyle doğrudan girişini yasaklar. Ancak SSH anahtarı (public key) ile girişine izin verir. Tamamen `no` yapmak yerine bu şekilde bırakmak, güvenli anahtar kullanıldığı sürece bazı otomasyon ve yedekleme araçlarının çalışabilmesi için tercih edilir.
* **`PasswordAuthentication no`**
  * *Ne anlama gelir?* Sunucuda şifreli girişi tamamen devre dışı bırakır. Artık sadece önceden tanımlanmış SSH anahtarına sahip cihazlar bağlanabilir.
* **`PubkeyAuthentication yes`**
  * *Ne anlama gelir?* SSH anahtarlarıyla kimlik doğrulamasına izin verir.
* **`PermitEmptyPasswords no`**
  * *Ne anlama gelir?* Şifresi boş olan kullanıcıların SSH üzerinden giriş yapmasını kesinlikle engeller.
* **`MaxAuthTries 3`**
  * *Ne anlama gelir?* Tek bir bağlantı isteğinde en fazla 3 kez hatalı kimlik doğrulama denemesine izin verir. 3. hatadan sonra bağlantıyı keser.

> [!WARNING]
> **Altın Kural:** Değişiklikleri kaydettikten sonra mevcut terminal bağlantınızı **asla kapatmayın**. Önce yan tarafta yeni bir terminal açıp `ssh` ile sunucuya hala girebildiğinizi test edin. Yanlış bir ayar yaptıysanız açık olan ilk terminalden hatayı düzeltebilirsiniz.

#### SSH Ayarlarını Kaydetme ve Yeniden Başlatma:
Değişikliklerin geçerli olması için SSH servisini yeniden başlatmalısınız. Ancak servisi bozmamak için önce yazım hatası olup olmadığını test edin:
```bash
sudo sshd -t                  # Hata yoksa ekrana hiçbir şey basmaz.
sudo systemctl restart ssh    # SSH servisini yeniden başlatır.
```

---

### b) SSH Portunu Değiştirme ve Socket Activation Farkı

#### ❓ Neden Yapıyoruz?
SSH varsayılan olarak `22` portunu kullanır. Saldırgan botlar internetteki tüm IP adreslerinin 22. portunu tarar. Portu örneğin `2222` gibi farklı bir değere almak sistemi doğrudan "hacklenemez" yapmaz (buna *Security by Obscurity* yani gizlilik yoluyla güvenlik denir). Ancak loglarınızdaki gürültüyü (binlerce başarısız giriş denemesini) %99 oranında azaltır ve sunucu kaynaklarını korur.

> [!IMPORTANT]
> **Modern Ubuntu Sürümleri İçin Önemli Not (Ubuntu 22.10, 24.04, 25.10...):**
> Yeni nesil Ubuntu sistemlerde SSH port yönetimi geleneksel `/etc/ssh/sshd_config` dosyasındaki `Port 22` satırından **yapılmaz**.
>
> Ubuntu, kaynak tasarrufu sağlamak için **systemd socket activation** mimarisini kullanır. Sistem ilk açıldığında arka planda ağır bir SSH servisi (`ssh.service`) çalıştırmak yerine çok hafif olan `ssh.socket` servisi portu dinler. Bir kullanıcı bağlanmaya çalıştığı anda systemd bunu fark eder ve SSH servisini ayağa kaldırarak bağlantıyı ona teslim eder. 
> 
> Bu yüzden portu değiştirmek için doğrudan systemd soket dosyasını ezmemiz gerekir.

#### 🛠️ Port Değiştirme Adımları (Socket Kullanan Sistemler İçin):

1. **Sisteminizde Socket Activation olup olmadığını kontrol edin:**
   ```bash
   systemctl status ssh.socket
   ```
   Eğer `active (listening)` çıktısı görüyorsanız aşağıdaki adımları izleyin.

2. **Socket ayarlarını düzenleme modunda açın:**
   ```bash
   sudo systemctl edit ssh.socket
   ```
   *(Bu komut systemd override dosyası oluşturur ve düzenlemeniz için geçici bir editör açar).*

3. **Açılan boş alana aşağıdaki satırları ekleyin:**
   ```ini
   [Socket]
   ListenStream=
   ListenStream=2222
   ```
   > **Neden iki adet `ListenStream` var?** İlk boş `ListenStream=` satırı, sistemin varsayılan olarak dinlediği port 22 ayarını temizlemek (sıfırlamak) için zorunludur. İkinci satır ise dinlenecek yeni portu (`2222`) tanımlar.

4. Dosyayı kaydedip çıkın (`Ctrl+O`, `Enter`, `Ctrl+X`).

5. **Değişiklikleri sisteme yükleyip socket'i yeniden başlatın:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart ssh.socket
   ```

6. **Portun değiştiğini doğrulayın:**
   ```bash
   ss -tulpn | grep 2222
   ```
   Artık çıktıda port 2222'nin dinlendiğini görmelisiniz.

7. **Doğru Anahtarla Bağlanma (Yerel Bilgisayarınızdan):**
   Bağlantı kurarken `.pub` uzantılı public key dosyasını değil, uzantısı olmayan **private key** dosyanızı hedef göstermelisiniz:
   ```bash
   ssh -i ~/.ssh/id_ed25519 -p 2222 root@45.133.17.92
   ```

---

## 2. Firewall (UFW) Kurulumu ve Yapılandırması 🔴

Firewall (Güvenlik Duvarı), sunucunuza gelen ve giden ağ paketlerini kontrol eden dijital bir sınır kapısıdır.

### ❓ Neden Yapıyoruz?
Sunucunuzda veri tabanı (MongoDB, PostgreSQL), izleme araçları (Prometheus, Grafana) gibi servisler çalışıyor olabilir. Bu servislerin portlarının doğrudan internete açık olması büyük bir güvenlik açığıdır. Firewall kullanarak sadece dışarıya açık olması gereken portları (SSH, HTTP, HTTPS) onaylarız, geri kalan tüm portları dış dünyaya kapatırız.

### 🛠️ Uygulama Adımları:

Ubuntu'da en basit ve popüler firewall aracı **UFW** (Uncomplicated Firewall) aracıdır:

1. **UFW'yi yükleyin:**
   ```bash
   sudo apt update && sudo apt install -y ufw
   ```

2. **Varsayılan Politikaları Belirleyin (Güvenli Varsayılan):**
   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   ```
   * **`deny incoming`:** Dışarıdan gelen tüm istekleri varsayılan olarak engeller. Yani biz açıkça izin vermediğimiz sürece hiçbir port dışarıdan erişilemez.
   * **`allow outgoing`:** Sunucunun dışarıya yapacağı isteklere (güncellemeleri indirmek, paket yüklemek vs.) izin verir.

3. **ÖNCE SSH Portuna İzin Verin:**
   > [!CAUTION]
   > UFW'yi aktif hale getirmeden önce SSH portunuza izin vermelisiniz. Aksi takdirde `ufw enable` dediğiniz an sunucuyla bağlantınız kopar ve bir daha SSH ile bağlanamazsınız!
   ```bash
   sudo ufw allow 2222/tcp   # SSH portunuzu hangisi yaptıysanız onu açın!
   ```

4. **Web Portlarına İzin Verin:**
   Eğer sunucunuzda web uygulamaları çalışacaksa HTTP ve HTTPS portlarını açın:
   ```bash
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   ```

5. **Firewall'u Aktif Edin ve Durumu Kontrol Edin:**
   ```bash
   sudo ufw enable
   sudo ufw status verbose
   ```
   Çıktıda sadece izin verdiğiniz portların `ALLOW IN` durumunda olduğunu görmelisiniz.

---

## 3. fail2ban (Brute-Force Koruması) 🟠

### ❓ Neden Yapıyoruz?
Firewall port 2222'yi SSH için açık bırakır. Saldırgan botlar yeni portunuzu keşfettiklerinde bu sefer 2222 portu üzerinden şifre denemelerine başlarlar. 
`fail2ban`, sunucu loglarını (`/var/log/auth.log` veya systemd logları) gerçek zamanlı analiz eder. Belirli bir IP adresinden çok kısa sürede üst üste başarısız giriş denemesi yapıldığını tespit ederse, o IP'yi firewall kurallarına ekleyerek sunucudan tamamen banlar (engeller).

### 🛠️ Uygulama Adımları:

1. **fail2ban'ı yükleyin ve başlatın:**
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable --now fail2ban
   ```

2. **Çalışma Durumunu Kontrol Edin:**
   ```bash
   sudo fail2ban-client status         # Aktif koruma modüllerini (jail) listeler
   sudo fail2ban-client status sshd    # SSH için kaç IP'nin banlandığını gösterir
   ```
   Varsayılan ayarlarda fail2ban, SSH için 5 kez hatalı deneme yapan IP adresini 10 dakika boyunca sunucudan uzaklaştırır.

---

## 4. Otomatik Güncellemeler (Unattended Upgrades) 🟠

### ❓ Neden Yapıyoruz?
Yazılım dünyasındaki açıklar sürekli güncellenir. Saldırganların en çok kullandığı yöntem, bilinen ve yaması (patch) yayınlanmış olan ama sistem yöneticisi tarafından güncellenmemiş sunuculardaki açıkları sömürmektir.
`unattended-upgrades` paketi, sunucunun kritik güvenlik yamalarını siz müdahale etmeden arka planda otomatik olarak indirmesini ve kurmasını sağlar. Major sistem yükseltmelerini yapmadığı için uygulamanızı bozma riski yok denecek kadar azdır.

### 🛠️ Uygulama Adımları:

1. **Paketi yükleyin:**
   ```bash
   sudo apt install -y unattended-upgrades
   ```

2. **Otomatik güncellemeleri yapılandırın:**
   ```bash
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```
   Ekrana gelen interaktif menüde **"Yes" (Evet)** seçeneğini işaretleyerek onaylayın. Sistem artık her gün arka planda güvenlik açıklarını otomatik kapatacaktır.

---

## 5. Kullanıcı ve Yetki Yönetimi (En Az Yetki İlkesi) 🟡

Sistem güvenliği sadece dışarıdan gelen saldırılara karşı değil, sunucu içerisindeki yetki sınırlarını korumakla da ilgilidir.

### a) Root Kullanıcısı Yerine Kişisel Kullanıcı Oluşturma

#### ❓ Neden Yapıyoruz?
`root` kullanıcısı işletim sistemindeki mutlak güçtür. Root olarak çalışırken yazacağınız yanlış bir komut (örn: `rm -rf /`) sistemi anında yok edebilir. Ayrıca saldırganlar sisteme sızdığında doğrudan root yetkisine sahip olur.
Güvenli yöntem; günlük işler için normal bir kullanıcı oluşturmak, bu kullanıcıya `sudo` (SuperUser Do) yetkisi vermek ve sadece kritik komutların başına `sudo` yazarak geçici yetki yükseltmektir. Bu sayede sistem loglarında hangi tehlikeli işlemi hangi gerçek kullanıcının yaptığı da kayıt altına alınmış olur.

#### 🛠️ Uygulama Adımları:

1. **Yeni bir kullanıcı ekleyin (Örn: `selim`):**
   ```bash
   sudo adduser selim
   ```

2. **Kullanıcıyı `sudo` grubuna ekleyin:**
   ```bash
   sudo usermod -aG sudo selim
   ```

3. **SSH Anahtarını Yeni Kullanıcıya Tanımlayın:**
   Root kullanıcısının SSH anahtar yetkisini yeni kullanıcıya kopyalayın ki o da SSH anahtarı ile bağlanabilsin:
   ```bash
   sudo mkdir -p /home/selim/.ssh
   sudo sh -c 'cat /root/.ssh/authorized_keys > /home/selim/.ssh/authorized_keys'
   sudo chown -R selim:selim /home/selim/.ssh
   sudo chmod 700 /home/selim/.ssh
   sudo chmod 600 /home/selim/.ssh/authorized_keys
   ```
   > **Not:** SSH servisi, anahtar dosyalarının (`.ssh` klasörü ve `authorized_keys`) izin yetkilerine karşı çok katıdır. İzinler yukarıdaki gibi sınırlandırılmazsa (`chmod 700/600`), güvenlik nedeniyle bağlantıyı reddeder.

4. **Bağlantıyı Test Edin:**
   Yeni bir terminalde normal kullanıcınızla bağlanmayı test edin:
   ```bash
   ssh -i ~/.ssh/id_ed25519 -p 2222 selim@45.133.17.92
   ```
   Bağlandıktan sonra root yetkisi alabildiğinizi test edin:
   ```bash
   sudo -i
   ```

---

### b) Sistem Hesaplarının ve Gizli Root Yetkilerinin Denetimi

#### 🔍 1. UID=0 Kontrolü
Linux işletim sisteminde kullanıcının yetkilerini belirleyen şey kullanıcı adı değil, arka plandaki **UID (User ID)** değeridir. UID değeri `0` olan her kullanıcı `root` ile tamamen aynı sınırsız yetkiye sahiptir. Saldırganlar sisteme sızdıklarında fark edilmemek için normal isimli (örn: `support`) ama UID değeri `0` olan gizli yetkili kullanıcılar oluşturabilirler (backdoor).

Aşağıdaki komutla sistemde UID'si 0 olan kullanıcıları listeleyin:
```bash
awk -F: '$3 == 0 { print $1 }' /etc/passwd
```
* **Beklenen çıktı:** Sadece `root` kelimesidir. Başka bir isim görüyorsanız bu bir güvenlik ihlalidir.

#### 🔍 2. Şifresiz Hesap Kontrolü
Sistemdeki kullanıcı şifrelerinin hash'lenmiş halleri sadece root'un okuyabildiği `/etc/shadow` dosyasında tutulur. Burada şifre alanı boş olan bir kullanıcı varsa, o kullanıcı şifre girmeden doğrudan sisteme sızabilir.

Şifresiz hesapları listelemek için:
```bash
sudo awk -F: '($2 == "" || $2 == "!") { print $1 }' /etc/shadow
```
* **Bilgi:** Çıktıda servis hesaplarının yanında `!` (ünlem) işareti görüyorsanız bu hesaplar kilitlidir ve şifreyle giriş yapılamaz demektir (bu güvenlidir). Önemli olan gerçek bir kullanıcının şifre alanının boş (`""`) olmamasıdır.

#### 🔍 3. Kabuk (Shell) Erişimi Kontrolü
Veri tabanları, web sunucuları veya sistem servisleri (örn: `mongodb`, `www-data`, `systemd`) işletim sisteminde kendi kullanıcı adlarıyla çalışırlar. Bu kullanıcıların sunucuda bir terminal açıp komut çalıştırmasına (shell erişimine) gerek yoktur. 

Terminal yetkisi açık olan tüm kullanıcıları listelemek için:
```bash
grep -E '/bin/bash|/bin/sh|/bin/zsh' /etc/passwd
```
* **Beklenen Durum:** Çıktıda sadece `root` ve sizin oluşturduğunuz gerçek kullanıcılar (`selim` vb.) yer almalıdır. Servis hesaplarının kabuk yolları `/usr/sbin/nologin` veya `/bin/false` olarak ayarlanmalıdır. 
* Gereksiz bir hesabı kapatmak için: `sudo usermod -s /usr/sbin/nologin şüpheli_kullanıcı`

---

## 6. Docker Port Çelişkisi ve Çözümü 🟡

### ❓ Sinsi Güvenlik Açığı Nedir?
Docker konteynerleri çalıştırırken `-p 27017:27017` (veya docker-compose içinde `ports`) kullandığınızda, Docker bu portu dış dünyaya açmak için Linux çekirdeğindeki `iptables` (ağ yönlendirme) kurallarını doğrudan manipüle eder. 
Docker'ın eklediği bu kurallar, **UFW firewall kurallarından daha önce çalıştırılır.** 

Yani siz UFW firewall üzerinde MongoDB portunu (27017) dışarıya kapatmış olsanız bile, Docker konteynerini başlattığınız an **UFW tamamen devre dışı kalır ve port tüm dünyaya açılır!**

### 🛠️ Doğru ve Güvenli Kullanım:
Eğer bir servise (örn. MongoDB veri tabanına veya Prometheus izleme aracına) sadece sunucu içinden erişilecekse, portu tanımlarken mutlaka **localhost IP'si (`127.0.0.1`)** ile bağlamalısınız:

```yaml
# ❌ YANLIŞ (UFW'yi atlar, tüm dünyaya açılır):
ports:
  - "27017:27017"

# ✔️ DOĞRU (Sadece sunucu içinden veya SSH tüneliyle erişilebilir):
ports:
  - "127.0.0.1:27017:27017"
```

#### Yerel Bilgisayardan Güvenli Bağlantı (SSH Tüneli / Port Forwarding):
Dışarıya kapattığınız bu servislere (örn: Port 3000'deki Grafana veya 27017'deki MongoDB) kendi bilgisayarınızdan güvenle erişmek için SSH Tüneli kullanabilirsiniz. Kendi bilgisayarınızın terminalinden şu komutu çalıştırın:

```bash
# Kendi makinenizdeki port 3000'i sunucudaki port 3000'e güvenle tüneller:
ssh -i ~/.ssh/id_ed25519 -L 3000:127.0.0.1:3000 -p 2222 root@45.133.17.92
```
Bu komut arka planda çalıştığı sürece tarayıcınızdan `http://localhost:3000` adresine giderek sanki sunucu dışarıya açıkmış gibi Grafana arayüzüne güvenle erişebilirsiniz. Verileriniz SSH tüneli üzerinden şifreli akar.

---

## 🏁 Son Kontrol Listesi

Güvenlik ayarlarını tamamladıktan sonra sunucunuzda son durum denetimini yapmak için ana makinenizden audit script'ini tekrar çalıştırın:
```bash
cd security
./run-remote-audit.sh root@45.133.17.92 ../devops.pem
```
Kırmızı olan `[FAIL]` işaretlerinin yeşile döndüğünü ve sunucu güvenliğinizin üst seviyeye ulaştığını göreceksiniz. Tebrikler! 🎉
