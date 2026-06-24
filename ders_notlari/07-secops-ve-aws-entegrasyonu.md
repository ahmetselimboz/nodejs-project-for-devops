# Ders 7: İleri Düzey Güvenlik (SecOps), Secret Management ve AWS Cloud Migration (EKS)

Bu ders notunda; DevOps mühendisliğinin en kritik boyutlarından biri olan **Güvenlik (SecOps / DevSecOps)** prensiplerini, hassas verilerin (API keys, şifreler) yönetilmesini sağlayan **Secret Management** mimarilerini ve monolit/mikroservis uygulamalarımızın bulut ortamına (AWS) nasıl taşınacağını (Migration) ve AWS EKS (Managed Kubernetes) mimarisini derinlemesine inceleyeceğiz.

---

## 1. SecOps ve DevSecOps Nedir?

**DevSecOps**, güvenlik pratiklerinin yazılım geliştirme (Dev) ve operasyon (Ops) süreçlerinin en başına, yani yaşam döngüsünün her adımına entegre edilmesi felsefesidir (**Shift-Left Security**). 

* **Shift-Left Security (Sola Kaydırma):** Güvenliğin canlıya çıkıştan sonra yapılan bir denetim olmaktan çıkarılıp, kod yazıldığı andan itibaren (CI/CD pipeline'larında static analizler, bağımlılık taramaları) kontrol edilmesidir.

---

## 2. Secret Management ve Güvenlik Felsefesi

Yazılım projelerindeki en büyük güvenlik açıklarından biri, veritabanı şifrelerinin veya API token'larının yanlışlıkla GitHub gibi kamuya açık depolara pushlanmasıdır (**Credentials Leak**).

### A. Kubernetes Secrets vs ConfigMaps
* **ConfigMaps:** Gizlilik gerektirmeyen, uygulamaya ait yapılandırma ayarlarını tutar (örn: `DB_NAME: test`, `LOG_LEVEL: info`).
* **Secrets:** Şifreler, SSH anahtarları veya token'lar gibi hassas verileri tutar.
  * **Önemli Güvenlik Uyarısı:** Kubernetes Secrets verileri varsayılan olarak şifreli saklamaz; sadece **Base64** formatında kodlar (encode eder). Base64 bir şifreleme algoritması değildir, saniyeler içinde çözülebilir.
  * **Senior Pratiği (Securing Secrets):** Kubernetes secrets verilerini etcd veritabanında şifreli saklamak için **EncryptionConfig** tanımlanmalı ya da KMS (Key Management Service) entegrasyonu kurulmalıdır.

### B. HashiCorp Vault Mimarisi
Büyük ölçekli ve çoklu ortamlarda (Multi-cloud/Multi-cluster) secret yönetimi için endüstri standardı **HashiCorp Vault**'tur.
* **Vault Çalışma Prensibi (Seal/Unseal):**
  * Vault ilk kurulduğunda kilitli (**Sealed**) durumdadır. Vault'un beyni olan ana şifre (Master Key), **Shamir's Secret Sharing** algoritmasıyla parçalara (key shares) bölünür (örn: 5 anahtardan en az 3'ü girilmeden Vault açılmaz). Bu işleme **Unsealing** denir.
* **Dynamic Secrets (Dinamik Secretlar):** Vault, statik şifreler yerine anlık talep üzerine geçici şifreler üretir (örn: API veritabanına bağlanmak istediğinde Vault o anlık 1 saat geçerli bir DB kullanıcısı üretir, süre bitince otomatik siler).
* **Transit Encryption:** Uygulama veritabanına veri yazmadan önce Vault API'sine gönderir, Vault veriyi şifreler (encrypt) ve uygulamaya döner. Uygulama veritabanına sadece şifreli veriyi kaydeder. Veritabanı ele geçirilse bile veri okunamaz.

---

## 3. Cloud Migration (Bulut Geçiş) Stratejileri

Mevcut sistemleri (on-premises veya klasik sunuculardan) buluta (AWS, Azure vb.) taşırken kullanılan **6 Rs** göç stratejisi şunlardır:

```
┌────────────────────────────────────────────────────────┐
│                   CLOUD MIGRATION (6 Rs)               │
└──────────────────────────┬─────────────────────────────┘
      ┌────────────────────┼────────────────────┐
      ▼                    ▼                    ▼
┌───────────┐        ┌───────────┐        ┌───────────┐
│  REHOST   │        │REPLATFORM │        │REFACTORING│
│ (Lift &   │        │(Lift,Tinker│       │(Buluta    │
│  Shift)   │        │ & Shift)  │        │ Uyumluluk)│
└───────────┘        └───────────┘        └───────────┘
      ┌────────────────────┼────────────────────┐
      ▼                    ▼                    ▼
┌───────────┐        ┌───────────┐        ┌───────────┐
│REPURCHASE │        │  RETAIN   │        │  RETIRE   │
│ (SaaS'a   │        │(Şimdilik  │        │(Kapatma/  │
│  Geçiş)   │        │ Bekletme) │        │ Emeklilik)│
└───────────┘        └───────────┘        └───────────┘
```

1. **Rehost (Lift & Shift):** Uygulamada hiçbir değişiklik yapmadan doğrudan sanal makine düzeyinde buluta taşımak (örn: sunucudaki sanal makineyi AWS EC2'ye kopyalamak). En hızlı ama en az bulut avantajı sağlayan yöntemdir.
2. **Replatform (Lift, Tinker & Shift):** Uygulamanın temel kodunu değiştirmeden bazı bileşenlerini bulut servisleriyle değiştirmek (örn: yerel MongoDB'yi kapatıp AWS DocumentDB veya managed RDS kullanmaya başlamak).
3. **Refactor / Re-architect:** Uygulama kodunu bulut mimarisine (Cloud-Native) tam uyumlu olacak şekilde yeniden tasarlamak ve mikroservislere bölmek. En maliyetli ama en performanslı yöntemdir.
4. **Repurchase (Drop & Shop):** Mevcut yazılımı tamamen bırakıp SaaS (Software as a Service) bir alternatife geçmek (örn: kendi mail sunucunu kapatıp Office 365 / Google Workspace kullanmak).
5. **Retain (Keep):** Bazı yasal regülasyonlar veya teknik engeller nedeniyle uygulamayı şimdilik eski yerinde (on-prem) tutmaya karar vermek.
6. **Retire (Kapatmak):** Artık kullanılmadığı tespit edilen eski sistemleri tamamen kapatıp emekliye ayırmak.

---

## 4. AWS EKS (Elastic Kubernetes Service) Mimarisi

AWS EKS, AWS tarafından sunulan ve yönetilen (Managed) bir Kubernetes servisidir.

### A. EKS Mimari Bileşenleri
* **EKS Control Plane (AWS Tarafından Yönetilir):**
  * AWS, Kubernetes Master bileşenlerini (API Server, etcd veritabanı, Scheduler) en az iki farklı Availability Zone (AZ - Fiziksel Veri Merkezi) üzerinde yedekli ve yüksek erişilebilir (HA) olarak kendisi çalıştırır.
  * Master sunucuların bakımı, güncellemeleri ve ölçeklenmesi tamamen AWS sorumluluğundadır.
* **Data Plane (Worker Nodes - Bizim Yönettiğimiz Taraf):**
  * Konteynerlerin gerçekten çalıştığı sunucu grubudur. İki seçeneğimiz vardır:
    * **Managed Node Groups:** AWS EC2 sanal makineleridir. İşletim sisteminin yamaları ve ölçeklenmesi (Auto-scaling) bizim denetimimizdedir.
    * **AWS Fargate (Serverless):** Sunucu kavramı tamamen ortadan kalkar. Her bir Pod için AWS arka planda geçici ve izole bir mikro sanal makine açar. Sadece Pod'un tükettiği CPU/RAM kadar ücret ödenir. Sunucu bakımı tamamen sıfırdır.

### B. AWS VPC CNI (Ağ Arabirimi)
EKS'in en büyük güçlerinden biri, K8s podlarına doğrudan AWS VPC (Virtual Private Cloud) içerisinden gerçek IP'ler atamasıdır.
* **Nasıl Çalışır?** Standart K8s ağlarında (Flannel vb.) podlar sanal bir overlay ağdadır ve dış dünyayla konuşurken NAT (Network Address Translation) yaparlar. AWS VPC CNI ise her pod için EC2 sunucusuna bir ENI (Elastic Network Interface) bağlar ve pod doğrudan şirketin veya VPC'nin gerçek bir IP'sini alır. Bu sayede ağ gecikmesi (Network Latency) minimuma iner.

---

## Ders 7 Kendi Kendine Sorular (Troubleshooting & Mülakat Soruları)

1. Kubernetes Secrets içindeki veriler neden güvenli kabul edilmez? Bunları production ortamlarında nasıl güvenli hale getirebiliriz?
2. HashiCorp Vault'un "Transit Encryption" (Geçiş Şifrelemesi) özelliği nedir ve veritabanı güvenliği için neden kritik bir senior özelliğidir?
3. Bir e-ticaret firmasının monolitik uygulamasını AWS üzerine taşırken hangi "R" stratejisini (Rehost, Replatform, Refactor) seçmesi daha mantıklıdır? Nedenleriyle açıklayınız.
4. AWS EKS mimarisinde Control Plane ile Data Plane arasındaki sorumluluk paylaşımı (Shared Responsibility) nasıldır?
5. AWS Fargate (Serverless K8s) kullanmanın, geleneksel EC2 tabanlı Worker Node'lara göre operasyonel ve maliyet açısından avantaj ve dezavantajları nelerdir?
