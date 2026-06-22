# Ders 4: Kubernetes (K8s) & K3s ve Mikroservis Orkestrasyonu

Bu ders notunda; konteynerlerin büyük ölçekte nasıl yönetildiğini (orkestrasyon), Kubernetes mimarisini, tüm temel K8s kaynaklarını (Pod, Deployment, StatefulSet, Ingress vb.), CoreDNS ile hizmet keşfini (Service Discovery) ve canlı sistemlerde kesintisiz sürüm güncellemeleri ile anında geri alma (Rollback) süreçlerini en ince detayına kadar ele alacağız.

---

## 1. Konteyner Orkestrasyonu ve Kubernetes Giriş

### A. Neden Kubernetes?
Docker Compose ile tek bir sunucuda 5-10 konteyneri yönetebiliriz. Ancak sistem büyüdüğünde şu ihtiyaçlar doğar:
* **Yüksek Erişilebilirlik (High Availability):** Sunucu çökerse konteynerler başka bir sunucuda otomatik ayağa kalkmalı.
* **Yatay Ölçekleme (Auto-scaling):** Trafik arttığında konteyner sayısı otomatik artmalı, trafik azalınca azalmalı.
* **Kendi Kendini İyileştirme (Self-healing):** Konteyner kilitlenirse otomatik kapatılıp yenisi açılmalı.
* **Kesintisiz Güncelleme (Zero-Downtime Deployment):** Kullanıcılar sitedeyken kesinti olmadan yeni sürüm canlıya alınmalı.

**Kubernetes (K8s)**, bu ihtiyaçları karşılayan, Google tarafından geliştirilmiş açık kaynaklı bir konteyner orkestrasyon aracıdır.

### B. K3s Nedir?
Standart Kubernetes (`kubeadm` ile kurulan), çok fazla RAM ve işlemci tüketir. En az 2-3 sunuculu ve yüksek kaynaklı sistemler için tasarlanmıştır.
**K3s**, Rancher firması tarafından geliştirilmiş, hafifletilmiş (Lightweight) bir Kubernetes dağıtımıdır:
* Kubernetes'in içindeki gereksiz/eski bulut sürücülerini temizlemişlerdir.
* Tüm Control Plane bileşenlerini tek bir binary (çalıştırılabilir dosya) içinde birleştirmişlerdir.
* Bellek tüketimi çok düşüktür (Master node için ~512MB RAM yeterlidir).
* **Bizim için önemi:** Uzak sunucumuzun (4 GB RAM) kaynaklarını sömürmeden tüm gerçek K8s özelliklerini (kubectl, ingress, storage) birebir denememizi sağlar.

---

## 2. Kubernetes Mimari Yapısı (Architecture)

Kubernetes Master (Control Plane) ve Worker (Node) makinelerinden oluşan bir küme (Cluster) mimarisine sahiptir.

```
+-----------------------------------------------------------+
|                   CONTROL PLANE (MASTER)                  |
|  +--------------+  +----------+  +------------+  +-----+  |
|  |  API Server  |  |Scheduler |  | Controller |  |etcd |  |
|  +--------------+  +----------+  +------------+  +-----+  |
+---------|-------------------------------------------------+
          | (SSH / HTTPS)
+---------v-------------------------------------------------+
|                       WORKER NODE                         |
|  +--------------------+  +------------+  +-------------+  |
|  |      Kubelet       |  | Kube-Proxy |  | Containerd  |  |
|  +--------------------+  +------------+  +-------------+  |
|  | [Pod 1]  | [Pod 2] |  |            |  |  (Runtime)  |  |
|  +--------------------+  +------------+  +-------------+  |
+-----------------------------------------------------------+
```

### A. Control Plane (Master Node) - Yönetici Katman
* **kube-apiserver:** K8s'in giriş kapısıdır. `kubectl` CLI aracı veya diğer bileşenler K8s ile sadece bu API üzerinden konuşur.
* **etcd:** Kümenin tüm konfigürasyonunu ve o anki durumunu (hangi pod nerede çalışıyor vb.) saklayan yüksek erişilebilir anahtar-değer (key-value) veritabanıdır. K8s'in beynidir.
* **kube-scheduler:** Yeni oluşturulan Pod'ların sunuculardaki kaynak durumuna bakarak hangi Worker Node'da çalıştırılacağına karar verir.
* **kube-controller-manager:** Kümedeki durumları izler ve istenen durumla (Desire State) mevcut durumu (Current State) eşitlemeye çalışır (örn: replika sayısı 3 olmalı dediysek ve 1'i çöktüyse hemen yenisini açar).

### B. Worker Node (Konteynerlerin Çalıştığı Makineler)
* **kubelet:** Her Node'da çalışan bir ajandır. API Server'dan gelen emirleri alır, konteynerlerin sağlıklı çalıştığını doğrular ve durumu Master'a raporlar.
* **kube-proxy:** Pod'ların IP adreslerini yöneten ve dışarıdan gelen ağ trafiğini doğru konteynerlere yönlendiren ağ yöneticisidir.
* **Container Runtime (containerd):** Konteynerleri gerçekten çalıştıran motor (Docker motorunun alt bileşeni).

---

## 3. Kubernetes Kaynakları (Resources - Ansiklopedik Liste)

Kubernetes'te her şeyi YAML dosyalarıyla (Manifests) tanımlarız.

### A. Pods
K8s'deki en küçük çalıştırılabilir birimdir. Bir Pod içinde bir veya birden fazla konteyner barındırabilir.
* **Önemli Kural:** Pod içindeki konteynerler aynı ağ kartını ve disk alanını paylaşırlar, `localhost` üzerinden birbirleriyle konuşurlar.
* **Sidecar Pattern (Senior Pratiği):** Ana uygulamanın yanına yardımcı bir konteyner koymaktır (örn: uygulamanın loglarını okuyup merkezi Loki'ye gönderen Promtail konteyneri ile uygulama konteynerinin aynı Pod içinde çalışması).

### B. Deployments
Stateless (durumsuz) uygulamaları yönetmek için kullanılır. Replika sayısını, ölçekleme kurallarını ve sürüm güncelleme (RollingUpdate) stratejilerini yönetir.

### C. StatefulSets
Stateful (durumlu - veritabanı vb.) uygulamaları yönetmek için kullanılır. Pod'ların isimlerinin rastgele değil, sıralı ve kalıcı olmasını sağlar (örn: `mongo-0`, `mongo-1`). Pod silinip açılsa bile aynı disk alanına (Volume) bağlanacağını garanti eder.

### D. DaemonSets
Kümedeki **tüm sunucularda (Node)** mutlaka birer adet çalıştırılması gereken podlar için kullanılır (örn: her sunucudan metrik toplayan `node-exporter` veya log toplayan `fluentd`).

### E. Jobs & CronJobs
* **Job:** Tek seferlik çalışıp duran işler içindir (örn: veritabanı migrasyonu çalıştırma).
* **CronJob:** Belirli zaman aralıklarında (cron formatında) tekrarlanan işler içindir (örn: her gece 03:00'da DB yedeği alma).

---

## 4. Kubernetes Ağ İletişimi ve Hizmet Keşfi (Service Discovery)

K8s içindeki Pod'lar sürekli silinip yeniden oluşturulur ve her seferinde yeni bir IP adresi alırlar. Bu yüzden Pod IP'leri ile doğrudan iletişim kurulamaz. **Services** kavramı devreye girer.

### A. K8s Servis Türleri
1. **ClusterIP (Varsayılan):** Servise sadece küme içinden erişilebilen dahili bir IP verir. Mikroservislerin birbirleriyle konuşması için kullanılır (örn: API'nin veritabanına erişimi).
2. **NodePort:** Her sunucu (Node) üzerinde yüksek bir port açarak (30000-32767) servisi dış dünyaya açar.
3. **LoadBalancer:** Bulut sağlayıcılarından (AWS, GCP) otomatik olarak bir genel yük dengeleyici (Public Load Balancer) talep eder ve trafiği küme içine yönlendirir.

### B. CoreDNS ve Service Discovery
K8s içinde yerleşik bir DNS sunucusu (CoreDNS) çalışır. Bir servis oluşturduğumuzda, o servisin ismi bir DNS kaydı haline gelir.
* **Nasıl Çalışır?** `mongo` adında bir ClusterIP servisi açtığımızda, API uygulamamız veritabanı bağlantı adresini `mongodb://mongo:27017` olarak kullanabilir. CoreDNS arka planda `mongo` ismini o an çalışan aktif MongoDB podunun IP adresine otomatik çözer. Pod çöker ve IP'si değişirse, CoreDNS DNS kaydını anında günceller. API kodunun ruhu bile duymaz.

### C. Ingress ve Ingress Controller
Dışarıdan gelen HTTP/HTTPS isteklerini (domain yönlendirmelerini) karşılayan ve küme içindeki doğru servislere dağıtan yönlendiricidir (K8s'in reverse proxy'sidir).
* K3s varsayılan olarak **Traefik Ingress Controller** ile birlikte kurulur.

---

## 5. Kubernetes Storage (Depolama) Yapısı

Konteynerlerin diski geçicidir. Verileri kalıcı kılmak için K8s'in hacim yapısı kullanılır:

* **PersistentVolume (PV):** Sistem yöneticisi (veya bulut sağlayıcı) tarafından ayrılmış fiziksel disk alanıdır (örn: 100 GB SSD).
* **PersistentVolumeClaim (PVC):** Uygulama geliştiricisinin Pod için disk talep etme belgesidir: *"Bana ReadWriteOnce yetkili 10 GB disk ver."* K8s uygun bir PV bulup bu PVC'ye bağlar (binding).
* **StorageClass:** Disklerin dinamik olarak (talep edildikçe) otomatik oluşturulmasını sağlayan şablonlardır. K3s varsayılan olarak yerel diski kullanan `local-path` StorageClass eklentisiyle gelir.

---

## 6. Güvenlik: NetworkPolicies (Mikroservis İzolasyonu)
Varsayılan olarak Kubernetes kümesindeki tüm Pod'lar birbirleriyle kısıtlama olmaksızın konuşabilir. Güvenlik gereği (SecOps) servisler izole edilmelidir.
* **NetworkPolicy (Ağ Politikası):** Hangi podun hangi poda erişebileceğini belirleyen güvenlik duvarı kurallarıdır (örn: *"Sadece API podu MongoDB poduna erişebilsin, dışarıdan veya başka bir poddan MongoDB'ye doğrudan bağlantı kurulamasın"*).

---

## 7. Uygulamalı Görev 4.2: K3s Kurulumu ve Uzaktan Bağlantı

### A. Sunucuya K3s Kurulum Komutu
Sunucunda (Ubuntu 25.10 x64) Docker servisimizin portlarıyla çakışmaması ve hafif kurulum olması için varsayılan Ingress olmadan K3s kurulumunu başlatırız:
```bash
curl -sfL https://get.k3s.io | sh -
```

K3s kurulduğunda yapılandırma dosyası sunucuda `/etc/rancher/k3s/k3s.yaml` yoluna yazılır.

### B. Yerel Bilgisayardan (MacBook) K3s Kümesine Bağlantı ve Hata Analizleri (Senior Pratiği)

Senior DevOps mühendisleri sunucu içine girip `kubectl` çalıştırmazlar. Küme yönetim yetkisini kendi yerel bilgisayarlarına alırlar.

#### 1. Mac'te kubectl Kurulumu (Lokal Kontrolcü)
```bash
brew install kubernetes-cli
```

#### 2. Yetki Engeli (Permission Denied) ve Güvenli Dosya Transferi
* **Sorun:** K3s yetki dosyası `/etc/rancher/k3s/k3s.yaml` sunucuda sadece `root` okuma yetkisine (`600`) sahiptir. MacBook üzerinden doğrudan `scp` ile çekmeye çalışırsak yetki reddedilir.
* **Çözüm:** 
  1. Sunucu üzerinde (SSH bağlıyken) dosyayı geçici olarak `devops` ev dizinine kopyalar ve sahibi yaparız:
     ```bash
     sudo cp /etc/rancher/k3s/k3s.yaml /home/devops/k3s.yaml
     sudo chown devops:devops /home/devops/k3s.yaml
     ```
  2. MacBook terminalinde (kendi makinemizde) dosyayı güvenle çekeriz:
     ```bash
     mkdir -p ~/.kube
     scp -P 2222 devops@78.111.90.75:/home/devops/k3s.yaml ~/.kube/config
     ```
  3. Sunucudaki geçici dosyayı güvenlik nedeniyle hemen sileriz:
     ```bash
     rm /home/devops/k3s.yaml
     ```

#### 3. Bağlantı Ayarları ve IP Güncellemesi
MacBook'taki `~/.kube/config` dosyasını bir editörle açıp `server: https://127.0.0.1:6443` satırındaki yerel IP'yi sunucumuzun IP adresiyle güncelleriz:
```yaml
server: https://78.111.90.75:6443
```

#### 4. UFW Port Engeli ve Rakam Hatası (Typo) Hata Analizleri (Vaka)
* **VAKA A: "dial tcp 78.111.90.75:6443: i/o timeout" Hatası**
  * *Sebep:* Sunucudaki güvenlik duvarı (UFW) port `6443`'ten gelen Kubernetes API isteklerini engelliyordu.
  * *Çözüm:* Sunucu üzerinde portu açtık:
    ```bash
    sudo ufw allow 6443/tcp
    sudo ufw reload
    ```
* **VAKA B: Yanlış Port İzni (Typo) ve Durum Analizi**
  * *Sorun:* Port açılmasına rağmen MacBook hâlâ `i/o timeout` hatası alıyordu.
  * *Sorun Arama (Troubleshooting):* Sunucuda `sudo ufw status verbose` komutu çalıştırılarak kurallar incelendi.
  * *Tespit:* Port `6443` (dört-dört) yerine yanlışlıkla `6433` (üç-üç) portunun açıldığı tespit edildi.
  * *Düzeltme:* Yanlış kural silinip doğru kural eklendi:
    ```bash
    sudo ufw delete allow 6433/tcp
    sudo ufw allow 6443/tcp
    sudo ufw reload
    ```

#### 5. Doğrulama (Verification)
MacBook Air terminalinde aşağıdaki komutu çalıştırdığımızda sunucuyu `Ready` durumunda başarıyla görürüz:
```bash
selimboz@Selim-MacBook-Air ansible % kubectl get nodes
NAME                STATUS   ROLES           AGE   VERSION
kubernetes-server   Ready    control-plane   11m   v1.35.5+k3s1
   ```
#### 6. Neden K8s Kümesini Yerel Bilgisayardan (MacBook) Yönetiyoruz?
Sistem yöneticileri veya DevOps mühendisleri sunucu içine SSH ile girip `kubectl` komutları çalıştırmazlar. Kümenin uzaktan yerel `kubeconfig` ile yönetilmesinin senior sebepleri şunlardır:
1. **Çoklu Küme Yönetimi (Context Switching):** 
   * Gerçek dünyada onlarca farklı Kubernetes kümeniz (Test, Staging, Production) olabilir. 
   * Her biri için ayrı sunuculara SSH ile bağlanmak yerine, tüm kümeleri yerelindeki tek bir `~/.kube/config` dosyasına bağlarsın. 
   * `kubectl config use-context <kume_adi>` komutuyla saniyeler içinde staging kümesinden production kümesine geçiş yapabilirsin.
2. **Güvenlik ve Minimum Yetki (Security & RBAC):**
   * SSH erişimi vermek, o kişiye sunucu işletim sistemi seviyesinde sınırsız (root) yetki vermek demektir. 
   * Oysa K8s API'si (`6443`) üzerinden yapılan bağlantılarda **RBAC (Rol Bazlı Erişim Kontrolü)** kuralları geçerlidir. 
   * Bir geliştiriciye sadece kendi namespace'indeki Pod loglarını okuma yetkisi verirken, onun sunucunun işletim sistemine sızmasını veya diğer kritik bileşenleri silmesini engelleyebilirsiniz.
3. **CI/CD ve Otomasyon Entegrasyonu:**
   * GitHub Actions, Jenkins veya GitLab CI gibi otomasyon araçları sunucuya SSH yapmazlar. 
   * Uygulama güncellendiğinde K8s API sunucusuyla (`6443` portu) konuşarak yeni imajı deploy ederler. Bu entegrasyon için kubeconfig dosyasının dışarıdan erişilebilmesi zorunludur.
4. **GUI ve IDE Araç Entegrasyonları:**
   * MacBook yerelinde kullanabileceğin **Lens, OpenLens, K9s** veya VS Code Kubernetes eklentisi gibi görsel K8s yönetim araçları, çalışabilmek için yerelindeki `~/.kube/config` dosyasına ihtiyaç duyarlar.

---

## 8. Sürüm Güncelleme (RollingUpdate) ve Geri Alma (Rollback) Mekanizması

Uygulamamızın `v1` sürümü çalışırken `v2` sürümünü yayına almak için K8s Deployment'ın `RollingUpdate` stratejisini kullanırız.

### A. RollingUpdate Nasıl Çalışır?
1. K8s önce `v2` imajına sahip **yeni bir Pod** oluşturur.
2. Bu yeni Pod'un sağlıklı çalıştığını (`Readiness Probe` yardımıyla) doğrular.
3. Yeni Pod hazır olduğunda, eski `v1` Pod'larından **bir tanesini** siler ve trafiği yenisine yönlendirir.
4. Bu işlemi sırasıyla tüm replikalar için tekrarlar. Böylece sistemde sıfır kesinti (Zero-Downtime) yaşanır.

---

### B. Hata Anında Geri Alma (Rollback - Uygulamalı Adımlar)
Diyelim ki `v2` sürümünü deploy ettin ancak uygulama crash-loop'a girdi (çöktü) veya hata veriyor. Hızlıca `v1` sürümüne dönmek için:

1. **Güncelleme Geçmişini İnceleme:**
   Sunucudaki güncelleme geçmişini ve revizyon numaralarını listeleriz:
   ```bash
   kubectl rollout history deployment/nodejs-api
   ```
2. **Güncelleme Durumunu Sorgulama:**
   Güncellemenin o anki durumunu canlı takip etmek için:
   ```bash
   kubectl rollout status deployment/nodejs-api
   ```
3. **Anında Geri Alma (Rollback):**
   Bir önceki stabil revizyona saniyeler içinde geri dönmek için:
   ```bash
   kubectl rollout undo deployment/nodejs-api
   ```
4. **Belirli Bir Sürüme Dönme:**
   Eğer geçmişteki spesifik bir revizyona (örn: Revizyon 2) dönmek istersek:
   ```bash
   kubectl rollout undo deployment/nodejs-api --to-revision=2
   ```

---

## 9. Uygulamalı Görev 4.3: Pod Dağıtımı ve İlk Sorun Giderme (Troubleshooting Case)

K8s manifestolarımızı (`mongo-pvc.yaml`, `mongo-deployment.yaml`, `api-deployment.yaml`, `api-service.yaml`) uyguladıktan sonra podlarımızın durumunu kontrol ettiğimizde aşağıdaki gibi bir tabloyla karşılaşabiliriz:

```bash
selimboz@Selim-MacBook-Air nodejs-project-for-devops % kubectl get pods
NAME                          READY   STATUS              RESTARTS     AGE
mongo-5c6868989c-89jqp        0/1     ContainerCreating   0            64s
nodejs-api-555947c77c-56jgf   0/1     Running             1 (3s ago)   60s
nodejs-api-555947c77c-glff4   0/1     Running             1 (3s ago)   60s
nodejs-api-555947c77c-zfm4r   0/1     Running             1 (3s ago)   60s
```

### A. Bu Durum Ne Anlama Geliyor? (Senior Analizi)

1. **MongoDB Podu (`ContainerCreating`):**
   * **Durum:** `0/1 READY` ve `ContainerCreating` (Konteyner Oluşturuluyor).
   * **Nedenler:**
     * **İmaj İndirme:** Node üzerinde `mongo:7` imajı ilk kez indiriliyor olabilir (bu işlem internet hızına bağlı olarak 1-2 dakika sürebilir).
     * **Disk Bağlama (PVC Mounting):** `mongo-pvc` için disk alanı ayrılıp konteynere mount ediliyordur.
     * **Kontrol Komutu:** MongoDB'nin neden beklediğini anlamak için şu komutla K8s Event'lerine bakmalıyız:
       ```bash
       kubectl describe pod mongo-5c6868989c-89jqp
       ```
       Bu komutun en altında bulunan **Events** kısmı, bize imajın indirilip indirilmediğini veya bir disk bağlama hatası olup olmadığını söyler.

2. **API Podları (`0/1 Running` ve `RESTARTS 1`):**
   * **Durum:** `0/1 READY` (Trafiğe kapalı) ama `Running`. Ancak 60 saniyede `RESTARTS 1` almış (3 saniye önce çökmüş).
   * **Nedenler:**
     * **Hayati Hata (Crash Loop):** API kodumuz (`bin/www` içinde) başlarken önce MongoDB veritabanına bağlanmayı dener. Eğer bağlantı kuramazsa `process.exit(1)` ile kendini kapatır.
     * MongoDB podu henüz `ContainerCreating` aşamasında olduğu ve hazır olmadığı için API'ler veritabanına ulaşamaz. Bağlantı kuramayan API çökerek kapanır (`exit 1`).
     * Kubernetes, podun çöktüğünü görür görmez onu tekrar başlatır. Ama MongoDB hala hazır değilse API yine çöker. Bu döngü bir süre sonra `CrashLoopBackOff` (Çökme sonrası bekleme döngüsü) durumuna girer.
     * **Kontrol Komutu:** API podunun neden çöktüğünü doğrulamak için loglarına bakarız:
       ```bash
       kubectl logs nodejs-api-555947c77c-56jgf
       ```

### B. Sorun Giderme (Troubleshooting) Adımları

Bu durum K8s'te son derece doğaldır. Çözmek veya takip etmek için sırasıyla şunları yaparız:

1. **Önce PVC'nin durumuna bakarız:**
   ```bash
   kubectl get pvc
   ```
   Eğer durum `Bound` (Bağlandı) ise diskte sorun yoktur.

2. **MongoDB'nin ayağa kalkmasını bekleriz:**
   MongoDB `1/1 READY` ve `Running` durumuna geldiğinde, API podları bir sonraki otomatik yeniden başlatmada başarıyla veritabanına bağlanacak ve çökmeden `1/1 READY` konumuna gelecektir.

3. **Logları ve Detayları Kontrol Ederiz:**
   Eğer MongoDB uzun süre `ContainerCreating` durumunda takılırsa:
   ```bash
   kubectl describe pod <mongo-pod-adi>
   ```
   API podlarının çökme nedenini kesinleştirmek için:
   ```bash
   kubectl logs <nodejs-api-pod-adi>
   ```

### C. Sonuç ve K8s Kendi Kendini İyileştirme (Self-Healing) Başarısı

MongoDB imajının indirilmesi tamamlandığında, `mongo` podu `1/1 READY` ve `Running` durumuna geçer. Bu aşamada:
* Daha önce çöken ve restart olan API podları, K8s'in otomatik yeniden başlatma mekanizması sayesinde bir sonraki denemede veritabanına başarıyla bağlanır.
* `process.exit(1)` kodu tetiklenmez, Express sunucusu ayağa kalkar ve `/api/health/ready` probe'una olumlu yanıt döner.
* K8s, podları `1/1 READY` konumuna çeker ve trafiğe hazır hale getirir.
* **Senior Çıkarımı:** Kubernetes'in en büyük güçlerinden biri budur. Geçici bağlantı kopukluklarında veya başlangıç sırası gecikmelerinde, dışarıdan hiçbir müdahale (manuel restart) gerekmeden sistem kendisini otomatik olarak sağlıklı (Desired State) durumuna getirir.

---

## 10. Uygulamalı Görev 4.4: Ingress Yönetimi ve Hibrit Mimari (Host Nginx + K8s NodePort)

K8s kümesinde çalışan uygulamamızı (`api-service`) dış dünyaya (domainimize ve SSL korumasıyla) açmak istediğimizde karşımıza büyük bir mimari problem çıkar.

### A. Port Çakışması (Port Conflict) Problemi
1. Sunucumuzda (Host üzerinde) zaten 1. aşamada kurduğumuz **Nginx (Edge Proxy)** çalışıyor ve `80` ile `443` portlarını dinliyor.
2. K3s ise varsayılan olarak **Traefik Ingress Controller** kurar ve bu servis de host üzerindeki `80` ve `443` portlarını (Klipper LoadBalancer aracılığıyla) sahiplenmeye çalışır.
3. Bu çakışma durumunda Klipper (LoadBalancer) iptables kuralları yazarak gelen tüm 80/443 trafiğini Nginx'e ulaşamadan önce kesip Traefik'e yönlendirir. Bu yüzden host üzerindeki diğer Docker servisleri (Grafana, Prometheus vb.) ve Nginx devre dışı kalır.

---

### B. Çözüm: Hibrit Mimari (Host Nginx + K8s NodePort)
Bir adet 4 GB RAM'li sunucumuz olduğu için en kararlı ve kaynak tasarrufu sağlayan mimari **Host Nginx**'i ana giriş kapısı (Edge Proxy) olarak tutmak, K8s içindeki servisleri ise **NodePort** ile hosta bağlayıp Nginx üzerinden proxy yapmaktır.

#### Bu mimarinin avantajları:
* **RAM/CPU Tasarrufu:** K3s üzerinde ekstra çalışan Traefik ve Klipper LoadBalancer servislerini kapatarak bellek tasarrufu sağlarız.
* **Mevcut SSL/TLS Sertifikaları:** Certbot ile Nginx üzerinde çalışan hazır SSL yapısını bozmayız, K8s içerisine karmaşık Cert-Manager entegrasyonları kurmakla uğraşmayız.
* **Diğer Servislerin Korunması:** Docker ile host üzerinde çalışan Grafana, Prometheus ve Mongo-Express servislerimiz sorunsuz çalışmaya devam eder.

```
[İnternet: api.selimboz.com]
         │
         ▼ (Port 443 / HTTPS)
 ┌──────────────┐
 │ Host Nginx   │  (SSL Handshake burda çözülür, SSL certs Nginx'te)
 └───────┬──────┘
         │
         ▼ (Port 30080 / HTTP - Dahili Trafik)
 ┌──────────────────────────────────────────────┐
 │             KUBERNETES CLUSTER               │
 │ ┌──────────────────┐                         │
 │ │   api-service    │  (NodePort Service)     │
 │ └────────┬─────────┘                         │
 │          │ (Round-Robin Yük Dengeleme)       │
 │          ├───► [nodejs-api-pod-1] (Port 3000)│
 │          ├───► [nodejs-api-pod-2] (Port 3000)│
 │          └───► [nodejs-api-pod-3] (Port 3000)│
 └──────────────────────────────────────────────┘
```

---

### C. Adım Adım Hibrit Yapılandırma Adımları

#### 1. K3s Üzerinde Traefik'i Devre Dışı Bırakmak (Disable Traefik)
K3s'in Traefik'i kurmasını ve portları işgal etmesini engellemek için sunucuda K3s konfigürasyon dosyası `/etc/rancher/k3s/config.yaml` oluşturularak içine şu satırlar yazılır:
```yaml
disable:
  - traefik
```
Ardından K3s servisi yeniden başlatılır:
```bash
sudo systemctl restart k3s
```
Bu işlemden sonra `kubectl get pods -n kube-system` komutuyla kontrol edildiğinde `traefik` ve `svclb-traefik` podlarının tamamen kaldırıldığı doğrulanır. 80/443 portları tamamen Host Nginx'e geri döner.

#### 2. K8s API Servisini NodePort Yapmak
[api-service.yaml](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/k8s/api-service.yaml) dosyası güncellenerek servis tipi `NodePort` yapılır ve host üzerinde sabit olarak `30080` portunu dinlemesi söylenir:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  type: NodePort
  selector:
    app: nodejs-api
  ports:
    - port: 80
      targetPort: 3000
      nodePort: 30080
```
Bu manifesto uygulanır:
```bash
kubectl apply -f k8s/api-service.yaml
```

#### 3. Host Nginx Konfigürasyonunu Güncellemek
Nginx'in `/etc/nginx/sites-available/api.selimboz.com` dosyasındaki backend proxy adresi, host Docker portundan (`http://127.0.0.1:3000`) yeni K8s NodePort adresine (`http://127.0.0.1:30080`) yönlendirilir:
```nginx
    # Node.js API (Kubernetes NodePort)
    location / {
        proxy_pass http://127.0.0.1:30080;
        ...
    }
```
Nginx konfigürasyonu yeniden yüklenir:
```bash
sudo systemctl reload nginx
```

#### 4. Doğrulama (Verification)
Yerel bilgisayarımızdan HTTPS üzerinden doğrudan K8s kümesindeki API'ye istek attığımızda başarılı yanıt alırız:
```bash
selimboz@Selim-MacBook-Air ~ % curl -i https://api.selimboz.com/api/health/ready
HTTP/2 200 
server: nginx
x-correlation-id: fe8974ab-fc0c-4d23-98e3-ff32a34ee5cb
...
{"code":200,"success":true,"data":"System is ready for traffic."}
```
Artık dış dünyadan gelen istekler Nginx tarafından karşılanıp K8s içerisindeki API podlarımıza yük dengeli (Load Balanced) bir şekilde dağıtılmaktadır!

---

## 11. Karşılaştırmalı DevOps Analizleri (Senior Perspektifi)

### A. Host Nginx + K3s (Hibrit) vs Traefik + K3s (K8s Yerleşik)

Bir Kubernetes kümesini dış dünyaya açarken hangi ingress/proxy mimarisini seçeceğimiz, tamamen sunucu kaynakları, mevcut altyapı ve operasyonel karmaşıklık bütçemize bağlıdır.

| Özellik / Kriter | Host Nginx + K3s (Hibrit) | Traefik + K3s (K8s Yerleşik Ingress) |
| :--- | :--- | :--- |
| **Mimari Yaklaşım** | Gelen istek host Nginx tarafından karşılanır, SSL çözülür ve K8s'e NodePort ile iletilir. | Gelen istek doğrudan K8s içine girer, Traefik podu tarafından karşılanır ve yönlendirilir. |
| **Kaynak Tüketimi** | **Çok Düşük:** Nginx host üzerinde çalışır, birkaç MB RAM tüketir. | **Orta/Yüksek:** Traefik Ingress ve Klipper LoadBalancer podları ek bellek ve CPU harcar. |
| **SSL/TLS Yönetimi** | **Basit:** Klasik Certbot ile host üzerinde yönetilir. | **Gelişmiş:** Cert-Manager podu ile K8s içinde otomatik Let's Encrypt yönetimi gerektirir. |
| **K8s Dışı Servis Desteği**| **Mükemmel:** Hostta çalışan Grafana, Prometheus veya diğer Docker container'larını kolayca proxy'ler. | **Zor:** K8s dışındaki bağımsız servisleri proxy'lemek için karmaşık ExternalName servisleri gerekir. |
| **K8s Entegrasyonu** | **Manuel/Dışsal:** Yeni servis eklendiğinde Nginx config güncellenmelidir (otomasyonla çözülür). | **Deklaratif/Otomatik:** Yeni bir Ingress YAML manifesto uygulandığında anında devreye girer. |

* **Ne Zaman Hangisi Seçilmeli?**
  * **Host Nginx + K3s (Bizim Seçimimiz):** Kaynakları sınırlı (örn: 2-4 GB RAM) olan tek sunuculu (Single-node) ortamlarda, host üzerinde K8s dışı Docker servisleri de barındıran hibrit projelerde tercih edilir.
  * **Traefik + K3s:** AWS EKS veya Google GKE gibi çoklu sunuculardan oluşan (Multi-node), bulut yük dengeleyicilerinin (LoadBalancer) yerleşik kullanıldığı ve tüm servislerin K8s içerisinde çalıştığı büyük ölçekli altyapılarda tercih edilir.

---

### B. Docker / Docker Compose vs K3s / K8s Deployment

Yazılım geliştirme ve operasyon süreçlerinde Docker Compose ile Kubernetes (K3s) deployment mekanizmaları arasındaki farklar, projenin büyüme kapasitesini doğrudan etkiler.

| Kriter | Docker / Docker Compose | K3s / Kubernetes Deployment |
| :--- | :--- | :--- |
| **Ölçekleme (Scaling)** | **Manuel:** `docker-compose up --scale api=3`. Yük dengeleyici (Nginx) ayarlarını manuel güncellemek gerekir. | **Otomatik / Dinamik:** `kubectl scale` ile saniyeler içinde ölçeklenir. K8s Service IP'si dynamic load balancing yapar. HPA ile yüke göre otomatik ölçeklenir. |
| **Kendi Kendini İyileştirme (Self-Healing)** | **Kısıtlı:** Sadece process çökmesini (`--restart always`) algılar. Uygulama kilitlenmelerini algılayamaz. | **Gelişmiş:** Liveness ve Readiness probe'lar ile uygulamanın sağlık durumunu kontrol eder, kilitlenen podları silip yenisini açar. |
| **Sürüm Güncelleme Stratejisi** | **Kesintili (Downtime):** Eski konteyner durdurulup yenisi açılana kadar trafik kesilir. | **Kesintisiz (Zero-Downtime):** `RollingUpdate` stratejisiyle yeni sürüm podu hazır olunca eski sürüm podu sırayla kapatılır. |
| **Hata Anında Geri Dönüş (Rollback)** | **Manuel:** Eski imaj etiketini (tag) bulup docker-compose dosyasını elle değiştirip tekrar deploy etmek gerekir. | **Anında (Rollback):** K8s sürüm geçmişini tutar. `kubectl rollout undo` komutuyla saniyeler içinde önceki stabil sürüme dönülebilir. |
| **Veri Depolama (Storage)** | **Lokal:** Host üzerindeki bind mount veya named volume'lara bağımlıdır. | **Soyutlanmış (Storage Class):** PV ve PVC ile depolama alanı podlardan bağımsız yönetilir. |

* **Örnek Senaryo: Canlıda Güncelleme Hata Analizi**
  * **Docker Compose:** Yeni API imajını canlıya aldın (`docker-compose up -d`). Ancak kodda veritabanı bağlantı hatası var. API ayağa kalkamadı. Kullanıcılar o esnada siteye girdiğinde `502 Bad Gateway` almaya başlar. Sen hatayı fark edene, eski docker-compose dosyasını bulup geri dönene kadar kesinti sürer.
  * **Kubernetes (K3s):** Yeni API sürümünü deploy ettin. K8s önce 1. replikayı açar. `Readiness Probe` veritabanı hatası aldığını ve podun hazır olmadığını görür. K8s bu yeni podu trafiğe asla açmaz, eski stabil çalışan podları kapatmaz ve güncellemeyi durdurur. Kullanıcılar kesintiyi hiç hissetmez. Sen de hatayı analiz edip `kubectl rollout undo` ile süreci iptal edebilirsin.

---

## 12. Uygulamalı Görev 4.5: Rolling Update ve Rollback (Pratik Uygulama)

Bu uygulamada, canlı ortamda çalışan API deployment'ımıza hatalı bir güncelleme göndereceğiz, sistemin kesintiye uğramadığını gözlemleyecek ve ardından saniyeler içinde geri alacağız (Rollback).

### A. Adım Adım Uygulama Adımları

#### 1. Mevcut Sürüm Geçmişini İncelemek
Kümedeki mevcut deployment geçmişini ve revizyon numaralarını listeleriz:
```bash
kubectl rollout history deployment/nodejs-api
```

#### 2. Hatalı İmaj Güncellemesi Göndermek (Hata Simülasyonu)
Olmayan bir imaj etiketi (`broken`) vererek güncelleme işlemini başlatıriz:
```bash
kubectl set image deployment/nodejs-api api=asb00/nodejs-devops-api:broken
```

#### 3. Güncelleme Durumunu Takip Etmek
Güncellemenin durumunu canlı olarak izleriz:
```bash
kubectl rollout status deployment/nodejs-api
```
* **Gözlem:** K8s yeni podu açmaya çalışır ancak imaj bulunamadığı için süreç tıkanır ve beklemeye başlar.

#### 4. Podların Durumunu İncelemek
```bash
kubectl get pods
```
* **Gözlem:** Yeni oluşturulan pod `ImagePullBackOff` veya `ErrImagePull` hatasında kalır. Ancak eski stabil çalışan 3 adet podumuz `Running` durumundadır ve dış dünyaya hizmet vermeye kesintisiz devam etmektedir (`https://api.selimboz.com` adresinde kesinti yaşanmaz).

#### 5. Güncellemeyi Geri Almak (Rollback)
Tıkanan ve hatalı olan güncellemeyi iptal edip önceki stabil revizyona saniyeler içinde geri döneriz:
```bash
kubectl rollout undo deployment/nodejs-api
```

#### 6. Geri Alma Durumunu Doğrulamak
Geri alma işleminin başarıyla tamamlandığını doğrularız:
```bash
kubectl rollout status deployment/nodejs-api
kubectl get pods
```
* **Gözlem:** Hatalı açılan pod otomatik olarak silinir ve eski 3 adet stabil podumuz tam yetkiyle çalışmaya devam eder.

---

## Ders 4 Kendi Kendine Sorular (Troubleshooting & Mülakat Soruları)

1. Kubernetes'te `Deployment` ile `StatefulSet` arasındaki temel fark nedir? Veritabanları için neden StatefulSet tercih edilir?
2. CoreDNS'in K8s Service Discovery mekanizmasındaki rolü nedir? API podu MongoDB'yi nasıl bulur?
3. Kubernetes `RollingUpdate` güncelleme stratejisinde `Readiness Probe` neden hayati önem taşır? Tanımlanmazsa ne olur?
4. Canlıya aldığın yeni imaj sürümü hata verdiğinde, terminal üzerinden sistemi en hızlı şekilde önceki stabil sürüme nasıl döndürürsün?
5. `NetworkPolicy` nedir ve mikroservis mimarilerinin güvenliği için neden zorunludur?
