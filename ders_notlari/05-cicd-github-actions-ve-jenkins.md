# Ders 5: CI/CD Pipelines (GitHub Actions & Jenkins) ve Mikroservis Otomasyonu

Bu ders notunda; yazılım geliştirme süreçlerinin kalbi olan Sürekli Entegrasyon (Continuous Integration - CI) ve Sürekli Dağıtım/Teslimat (Continuous Delivery/Deployment - CD) felsefesini, Git dallanma (Branch) stratejilerini, modern CI/CD araçları olan GitHub Actions ve Jenkins'in mimarisini ve mikroservis mimarilerinde sıfır kesintili otomatik canlıya alım (Deployment) süreçlerini en ince detayına kadar ele alacağız.

---

## 1. CI/CD Felsefesi ve Temel Kavramlar

### A. Continuous Integration (CI - Sürekli Entegrasyon)
Geliştiricilerin yazdığı kodlerin günde birden fazla kez ana dallarla (örn: `main` veya `develop`) birleştirilmesini, her birleştirmede otomatik olarak testlerin koşulmasını ve kod kalitesinin doğrulanmasını sağlayan süreçtir.
* **Amaç:** Kod birleştirme (merge) çatışmalarını en aza indirmek ve hataları daha geliştirme aşamasındayken yakalamak.
* **Tipik CI Adımları:**
  1. Kodun repoya gönderilmesi (Push/PR).
  2. Bağımlılıkların yüklenmesi (`npm install`, `pip install` vb.).
  3. Linter ve Statik Kod Analizi (ESLint, SonarQube).
  4. Unit (Birim) ve Entegrasyon Testlerinin çalıştırılması.
  5. Docker imajının derlenmesi (build) ve taranması (security scanning).

### B. Continuous Delivery vs Continuous Deployment (CD)
* **Continuous Delivery (Sürekli Teslimat):** CI adımlarını başarıyla geçen kodun, otomatik olarak canlıya (Production) hazır hale getirilmesidir. Ancak canlıya alım adımı **manuel bir onay (button click)** gerektirir.
* **Continuous Deployment (Sürekli Dağıtım):** CI testlerini geçen her değişikliğin, hiçbir insan müdahalesi olmadan **otomatik olarak doğrudan canlı ortama (Production)** deploy edilmesidir.

```
┌────────┐    ┌───────┐    ┌───────┐         ┌─────────┐         ┌────────────┐
│  Code  │───►│ Build │───►│ Test  │────────►│ Release │────────►│   Deploy   │
└────────┘    └───────┘    └───────┘         └─────────┘         └────────────┘
 └───────────────── CI ─────────────────┘     ├────────────── CD (Delivery) ─┤ (Manuel Onay)
                                              └────────── CD (Deployment) ───┘ (Tam Otomatik)
```

---

## 2. Git Branch (Dallanma) Stratejileri

CI/CD pipeline'larının tetiklenme kuralları, kullanılan Git stratejisine doğrudan bağımlıdır.

### A. Gitflow Stratejisi
Büyük, sürüm bazlı (release-based) çalışan projeler için tasarlanmış klasik ve katı bir modeldir.
* **Dallar (Branches):**
  * `main/master`: Sadece canlıya çıkmış, stabil ve etiketlenmiş (v1.0.0 gibi) kodları barındırır.
  * `develop`: Bir sonraki sürüme ait geliştirilen tüm kodların birleştiği ana daldır.
  * `feature/*`: Yeni özellikler geliştirmek için `develop` dalından ayrılan kısa ömürlü dallar.
  * `release/*`: Canlıya çıkış öncesi son testlerin ve bugfix'lerin yapıldığı geçici dal.
  * `hotfix/*`: Canlıdaki acil hataları düzeltmek için doğrudan `main`'den ayrılan ve işi bitince hem `main` hem de `develop`'a birleştirilen dal.
* **CI/CD Entegrasyonu:** Farklı dallara push yapıldığında farklı ortamlara (feature -> dev, release -> staging, main -> prod) otomatik deploy tetiklenir.

### B. Trunk-Based Development (Senior Pratiği)
Modern, mikroservis mimarisine uygun ve hızlı canlıya çıkmayı (time-to-market) hedefleyen esnek bir modeldir.
* **Çalışma Mantığı:** Geliştiriciler uzun ömürlü dallar oluşturmazlar. Herkes doğrudan tek bir ana dala (`trunk` veya `main`) çok kısa ömürlü (1-2 günlük) feature dallarından sık sık (günde birkaç kez) PR açıp birleştirir.
* **Feature Flags (Özellik Bayrakları):** Bitmemiş kodlar bile ana dala birleştirilebilir, ancak bu kodlar canlı ortamda bir "bayrak/ayar" ile gizlenir.
* **CI/CD Entegrasyonu:** Ana dala (`main`) yapılan her merge işlemi doğrudan CI/CD pipeline'ını tetikler ve çok hızlı bir şekilde canlıya taşınır.

---

## 3. GitHub Actions Mimarisi ve Bileşenleri

GitHub Actions, GitHub depolarınızla tamamen entegre çalışan bulut tabanlı bir CI/CD platformudur.

### A. Temel Bileşenler
* **Workflow (İş Akışı):** Deponuzda `.github/workflows/` dizininde tanımlanan, en az bir tetikleyici ile çalışan YAML dosyalarıdır.
* **Events (Tetikleyiciler):** İş akışını başlatan olaylardır (örn: `push`, `pull_request`, `schedule` (cron) veya manuel `workflow_dispatch`).
* **Jobs (İşler):** Aynı Runner üzerinde koşan adımlar (steps) bütünüdür. Varsayılan olarak birden fazla Job **paralel** çalışır (bağımlılık tanımlanarak sıralı hale getirilebilir).
* **Steps (Adımlar):** Bir Job içindeki sırayla koşan bireysel görevlerdir. Bir kabuk (shell) komutu çalıştırabilir veya hazır bir Action (`uses: actions/checkout@v4`) çağırabilir.
* **Runners (Çalıştırıcılar):** Job'ları fiziksel veya sanal olarak koşturan sunuculardır. GitHub tarafından sağlanan hazır runner'lar (GitHub-hosted) olabileceği gibi kendi sunucunuzu da (Self-hosted) sisteme bağlayabilirsiniz.

---

## 4. Jenkins Mimarisi ve Jenkinsfile

Jenkins, JAVA tabanlı, açık kaynaklı, yüzlerce eklentiye (plugin) sahip klasik ve son derece güçlü bir otomasyon sunucusudur.

### A. Mimarisi (Controller-Agent Yapısı)
* **Jenkins Controller (Master):** İşlerin zamanlanmasını, logların tutulmasını, kullanıcı arayüzünü (GUI) ve konfigürasyonları yöneten ana beyindir. İşleri kendisi koşturmaz (best practice olarak).
* **Jenkins Agents (Node):** Controller'dan gelen emirlerle işleri (build, test vb.) üzerinde koşturan işçi sunuculardır. SSH veya JNLP protokolü ile Master'a bağlanırlar.

### B. Jenkinsfile (Pipeline as Code)
Jenkins pipeline'ları projenin kök dizinindeki `Jenkinsfile` dosyasında kod olarak tanımlanır. İki farklı sözdizimi (syntax) vardır:

1. **Declarative Pipeline (Modern & Önerilen):** Daha okunabilir, şablon tabanlı ve hata yapması zor olan deklaratif sözdizimidir.
   ```groovy
   pipeline {
       agent any
       stages {
           stage('Build') {
               steps {
                   echo 'Building...'
               }
           }
       }
   }
   ```
2. **Scripted Pipeline (Klasik / Groovy):** Groovy dilinin tüm esnekliğini barındıran, çok karmaşık senaryolar için kullanılan programatik sözdizimidir.

---

## 5. GitHub Actions vs Jenkins Karşılaştırması

| Özellik / Kriter | GitHub Actions | Jenkins |
| :--- | :--- | :--- |
| **Barındırma (Hosting)** | **Bulut (SaaS):** GitHub tarafından yönetilir, bakım gerektirmez. | **Self-hosted:** Kendi sunucuna kurup bakımını ve güncellemelerini yönetmen gerekir. |
| **Entegrasyon** | **Yerleşik:** GitHub PR, Issue ve Repo mekanizmalarıyla kusursuz entegre. | **Eklenti Bağımlı:** Neredeyse her şey için plugin yükleyip yapılandırman gerekir. |
| **Yapılandırma** | YAML dosyaları kullanılır. Öğrenmesi ve yazması çok kolaydır. | Jenkinsfile (Groovy) veya GUI üzerinden kurulur. Öğrenme eğrisi daha diktir. |
| **Kaynak Tüketimi** | GitHub sunucularını kullandığı için kendi sunucundan RAM/CPU yemez. | Kendi sunucunda çalıştığı için özellikle Java mimarisi nedeniyle yüksek RAM tüketir. |

### A. Firmalar Neden Hala Jenkins'i Tercih Ediyor? (İlanlardaki Jenkins Gizemi)

Günümüzde GitHub Actions, GitLab CI gibi modern bulut çözümleri varken, iş ilanlarında hala neden yoğun bir şekilde **Jenkins** bilgisi arandığının senior sebepleri şunlardır:

1. **Maliyet ve Ölçek (Milyonlarca Build):**
   * GitHub Actions veya GitLab CI gibi SaaS araçları derleme dakikaları (build minutes) üzerinden ücretlendirilir.
   * Günde binlerce kez build alan büyük bir şirkette aylık SaaS faturaları on binlerce doları bulabilir.
   * Jenkins ise tamamen ücretsiz ve açık kaynaklıdır. Şirketler kendi donanımları (On-premise sunucular) üzerine Jenkins kurarak sadece elektrik/donanım parası öder, build dakikası sınırına takılmazlar.

2. **Veri Güvenliği ve Regülasyonlar (BDDK, KVKK, HIPAA):**
   * Bankalar, savunma sanayii firmaları, devlet kurumları ve sağlık şirketleri kodlarını veya build esnasında kullanılan hassas çevre değişkenlerini (secrets) bulut sağlayıcılarına (GitHub/GitLab) teslim edemezler.
   * Jenkins, tamamen kapalı bir iç ağda (Air-gapped network), internete hiç bağlanmadan çalışacak şekilde yapılandırılabilir.

3. **Devasa Eklenti (Plugin) Ekosistemi:**
   * Jenkins yaklaşık 20 yıllık bir geçmişe sahiptir. Piyasada var olan en eski ana bilgisayar (Mainframe) sistemlerinden en yeni Kubernetes araçlarına kadar hemen hemen her şey için yazılmış bir Jenkins eklentisi mevcuttur.

4. **Groovy ile Sınırsız Esneklik:**
   * GitHub Actions YAML dosyaları deklaratiftir, karmaşık mantıksal döngüleri (if-else, try-catch, dinamik paralel iş çalıştırma) yazmak zordur.
   * Jenkins, pipeline kodlamada programlama dili olan **Groovy**'i kullanır. Bu sayede pipeline içinde algoritma yazar gibi sınırsız esneklikte iş akışları tasarlanabilir.

5. **Miras Altyapılar (Legacy Pipelines):**
   * Büyük şirketlerin 10 yıldır tıkır tıkır çalışan yüzlerce Jenkins pipeline'ı vardır. Bu devasa yapıları modern sistemlere göç ettirmek (migration) hem çok risklidir hem de aylar sürecek bir iş gücü maliyetidir.

---

## 6. Mikroservis CI/CD Stratejileri

Mikroservis mimarisinde tek bir devasa monolit yerine onlarca bağımsız servis bulunur. Bu durum CI/CD tasarımlarında şu zorlukları getirir:

### A. Sadece Değişen Servisi Build Etmek (Monorepo Yaklaşımı)
Eğer tüm mikroservisler tek bir Git reposunda (Monorepo) duruyorsa, her kod pushlandığında tüm servisleri baştan derlemek zaman ve kaynak israfıdır.
* **Çözüm:** GitHub Actions üzerindeki `paths` filtresini kullanmaktır.
  ```yaml
  on:
    push:
      paths:
        - 'api/**' # Sadece api klasöründe değişiklik varsa bu workflow çalışır
  ```

### B. Sürüm Etiketleme (Semantic Versioning)
Her canlıya çıkışta imajlara `:latest` etiketi basmak senior pratiği değildir. Hata anında hangi sürüme döneceğimizi bilemeyiz.
* **Çözüm:** Git commit hash'ini (`sha`) veya anlamsal sürüm etiketlerini (`v1.2.3`) imaj tag'i olarak kullanmak ve K8s deployment dosyasında bu spesifik etiketi güncellemek.

---

## 7. Uygulamalı Görev 5.1: GitHub Actions ile CI/CD Pipeline Tasarımı

Projemizin kod kalitesini güvenceye almak ve her değişiklikte Docker imajını otomatik olarak oluşturup Docker Hub'a pushlamak için bir GitHub Actions workflow'u hazırlayacağız.

### A. Pipeline İş Akışı Şeması
```
[Geliştirici Kod Pushlar (main)]
               │
               ▼ (Trigger)
     ┌──────────────────┐
     │  GitHub Runner   │
     └─────────┬────────┘
               │
      (Job 1: Test & Lint)
               ├─► ESLint kontrolü (Kod standartları)
               ├─► Jest Unit Testleri
               │
      (Job 2: Build & Push - Yalnızca testler geçerse)
               ├─► Docker Hub Girişi (Secrets kullanılarak)
               ├─► Docker Build (Sürüm tag'i ile)
               └─► Docker Hub'a Push
```

---

## 8. Uygulamalı Görev 5.2: CI Pipeline'ı ve Karşılaşılan ESLint Hatası (Troubleshooting Case)

GitHub Actions workflow dosyamızı oluşturup pushladığımızda, ilk çalıştırılan CI adımında `Run ESLint (Lint)` job'ı 27 hata ve 9 uyarı ile patladı.

### A. Sorunun Analizi ve Vaka Tespiti

1. **Test Dosyalarındaki `no-undef` Hataları:**
   * ESLint; `tests/integration/categories.test.js` vb. test dosyalarımızda kullanılan `describe`, `it`, `expect`, `beforeAll` ve `afterAll` gibi test kütüphanesine (Jest) ait global değişkenleri tanımadı.
   * Bu tanımların yapılandırılmadığı durumlarda ESLint `no-undef` (tanımlanmamış değişken) hatası fırlatarak çalışmayı durdurur.

2. **ESLint Modern Flat Config (eslint.config.mjs) Uyumsuzluğu:**
   * Eski ESLint sürümlerinde `.eslintrc.json` dosyasına `"env": { "jest": true }` yazarak bu sorun çözülüyordu.
   * Ancak modern **ESLint v9/v10 (Flat Config)** sisteminde `env` anahtarı ve `extends: [...]` kullanımı tamamen kaldırılmıştır.
   * `extends` kullanıldığında sistem `A config object is using the "extends" key, which is not supported in flat config system` hatası fırlatır.

---

### B. Çözüm: Flat Config Güncellemesi

ESLint flat config sisteminde Jest global değişkenlerini tanıtmak ve kuralları doğru yapılandırmak için [api/eslint.config.mjs](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/api/eslint.config.mjs) dosyasını şu şekilde güncelledik:

1. **`js.configs.recommended` Nesnesinin Doğrudan Aktarılması:**
   * `extends: ["js/recommended"]` yerine `@eslint/js` paketinden gelen `js.configs.recommended` nesnesi doğrudan konfigürasyon dizisine eklendi.
2. **Jest Globals Tanıtımı:**
   * `globals` kütüphanesinden `globals.jest` ortamı çekildi ve sadece test dosyalarını hedefleyecek şekilde `{ files: ["**/*.test.js", "tests/**/*.js"], languageOptions: { globals: { ...globals.jest, ...globals.node } } }` bloğu eklendi.

### Güncellenmiş eslint.config.mjs:
```javascript
import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  { 
    files: ["**/*.{js,mjs,cjs}"], 
    languageOptions: { globals: { ...globals.browser, ...globals.node } }, 
    rules: { "no-unused-vars": "warn" } 
  },
  { 
    files: ["**/*.js"], 
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } }, 
    rules: { "no-unused-vars": "warn" } 
  },
  { 
    files: ["**/*.test.js", "tests/**/*.js"], 
    languageOptions: { globals: { ...globals.jest, ...globals.node } } 
  }
];
```

Bu değişiklikten sonra local testlerimizde linter `0 errors, 9 warnings` ile başarıyla tamamlandı.

---

## Ders 5 Kendi Kendine Sorular (Troubleshooting & Mülakat Soruları)

1. Continuous Delivery vs Continuous Deployment arasındaki fark nedir? Hangi durumlarda Delivery tercih edilir?
2. Trunk-based development stratejisinde test edilmemiş veya tamamlanmamış bir özelliği canlıya kesintisiz nasıl gönderirsiniz? (Feature Flags mantığı)
3. GitHub Actions'ta bir Job'ın diğer Job'ın tamamlanmasını beklemesini nasıl sağlarsınız? (`needs` parametresi)
4. Docker Hub şifresi gibi hassas verileri GitHub Actions workflow'larında doğrudan YAML içerisine yazmadan nasıl güvenle yönetirsiniz? (GitHub Secrets)
5. Jenkins'in Controller-Agent mimarisi ne işe yarar? Master sunucuda neden doğrudan build işi koşturulmamalıdır?
