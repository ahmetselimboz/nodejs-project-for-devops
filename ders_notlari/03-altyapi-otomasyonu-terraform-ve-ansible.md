# Ders 3: Altyapı Otomasyonu (IaC) — Terraform ve Ansible

Bu ders notunda; Altyapı olarak Kod (Infrastructure as Code - IaC) felsefesini, Terraform mimarisini, State yönetimini, modüler yapıları, Ansible'ın konfigürasyon yönetimi gücünü ve sunucumuzu Ansible ile sıfırdan otomatik kuracak Playbook tasarımlarını en ince detayına kadar ele alacağız.

---

## 1. Infrastructure as Code (IaC) Felsefesi

### A. IaC Nedir? Neden İhtiyaç Duyduk?
Geleneksel sistem yönetiminde sunucular, diskler, ağ ayarları ve güvenlik kuralları sistem yöneticileri tarafından bulut panellerinden (AWS, GCP Console) veya fiziksel arayüzlerden manuel olarak tıklanarak oluşturulurdu. 
Bu manuel sürecin dezavantajları:
* **Hata Eğilimi:** Bir ayarın (örn: bir firewall kuralı) unutulması veya yanlış girilmesi kolaydır.
* **Tekrarlanamazlık:** Aynı altyapıyı Test, Staging ve Production için 3 kez kurmak çok zaman alır ve aralarında farklar oluşur.
* **Dökümantasyon Eksikliği:** Canlıda neyin kurulu olduğunu gösteren tek şey çalışan sistemin kendisidir.

**IaC (Altyapı olarak Kod)**, altyapının tıpkı yazılım kodu gibi tanımlanmasını sağlar. Altyapı dosyaları Git'te saklanır, sürümlendirilir ve otomatik olarak uygulanır.

### B. Provisioning (Altyapı Sağlama) vs Configuration Management (Konfigürasyon Yönetimi)
DevOps ekosisteminde IaC araçları ikiye ayrılır:
1. **Provisioning (Sağlayıcı - Örn: Terraform):** Sıfırdan sanal makineler, VPC ağları, diskler, load balancer'lar gibi "ham altyapı bileşenlerini" buluttan veya sanallaştırma katmanından talep eder ve oluşturur.
2. **Configuration Management (Yapılandırma Yönetimi - Örn: Ansible):** Terraform'un oluşturduğu boş işletim sistemlerinin içine girerek gerekli paketleri kurar (Nginx, Docker vb.), kullanıcıları açar, dosyaları kopyalar ve servisleri yapılandırır.

### C. Deklaratif (Declarative) vs İmperatif (Procedural) Yaklaşımlar
* **İmperatif (Yordamsal - Örn: Bash script veya Ansible kısmen):** Sunucuya ne yapacağını adım adım talep edersin: *"Nginx kur, config kopyala, restart et."*
* **Deklaratif (Tanımlayıcı - Örn: Terraform):** Sunucunun veya altyapının olması gereken son halini (Desire State) tanımlarsın: *"Bana 3 tane CPU'su olan makine ver."* Terraform arkadaki adımları kendisi hesaplar. Eğer o makine zaten varsa hiçbir şey yapmaz.

---

## 2. Terraform Mimari Konseptleri ve State Yönetimi

Terraform, HashiCorp tarafından geliştirilen, deklaratif ve açık kaynaklı bir IaC aracıdır.

### A. Temel Yapı Taşları
* **Providers:** Terraform'un hedef API ile konuşmasını sağlayan eklentilerdir (örn: AWS, Google, Proxmox, Hetzner, Null).
* **Resources:** Oluşturulacak altyapı bileşenleridir (`resource "aws_instance" "web" { ... }`).
* **Data Sources:** Terraform dışında var olan veya başka bir sistemin oluşturduğu verileri içeriye okumak için kullanılır (`data "aws_ami" "ubuntu" { ... }`).
* **Variables & Outputs:** `Variables` dışarıdan parametre almayı, `Outputs` ise işlem sonundaki bilgileri (örn: makinenin IP adresi) ekrana yazdırmayı sağlar.

---

### B. State (Durum) Yönetimi: Terraform'un Beyni
Terraform, oluşturduğu altyapının son durumunu ve kod ile gerçek dünya arasındaki eşleşmeyi `terraform.tfstate` adında bir JSON dosyasında saklar.
* **Neden Önemli?** Kodu ikinci kez çalıştırdığında neyin değiştiğini anlamak için bu dosyaya bakar. State dosyası kaybolursa Terraform canlıda ne olduğunu unutur ve her şeyi sıfırdan kurmaya çalışır (bu bir felakettir!).

#### Local State vs Remote State:
* **Local State (Varsayılan):** State dosyası projeyi çalıştırdığın bilgisayarda (Mac'inde) durur. Ekip çalışmasında diğer mühendisler kod üzerinde çalıştığında kimsenin bir diğerinin oluşturduğu kaynaklardan haberi olmaz.
* **Remote State (Senior Best Practice):** State dosyası ortak ve güvenli bir depolama alanında (AWS S3, Consul, Terraform Cloud) saklanır.
* **State Locking (Durum Kilitleme):** İki DevOps mühendisi aynı anda `terraform apply` komutunu çalıştırırsa state dosyası bozulabilir. State kilitleme (örn: AWS DynamoDB veya Consul yardımıyla) işlem yapan ilk kişiden sonra diğerini kilitler, işlem bitince kilidi açar.

#### State Sorun Giderme (Troubleshooting) Komutları:
* `terraform state list`: State dosyasında kayıtlı tüm kaynakları listeler.
* `terraform state show <kaynak_adi>`: Belirli bir kaynağın detaylarını gösterir.
* `terraform import <kaynak_adi> <gercek_id>`: Kodda tanımlanmamış, manuel kurulmuş eski bir kaynağı Terraform yönetimine (state dosyasına) dahil etmek için kullanılır.

---

## 3. Modüler Terraform Yapısı

### A. Klasik Yapı (Monolitik) vs Modüler Yapı
* **Klasik Yapı (Monolitik):** Tüm kaynaklar tek bir `main.tf` içine yazılır. Proje büyüdükçe yönetimi imkansızlaşır.
* **Modüler Yapı (Modular):** Altyapıyı bağımsız parçalara (örn: Network modülü, VM modülü, DB modülü) böleriz. Modüller parametre alabilir (Input) ve çıktı üretebilir (Output).

#### Klasik Yapı (`classic-version`):
```hcl
resource "proxmox_vm_qemu" "server" {
  name = "devops-server"
  cores = 2
  memory = 4096
  # Tüm disk, network ve SSH ayarları tek dosyada
}
```

#### Modüler Yapı (`moduler-version`):
Ana dosya (`main.tf`) sadece modülü çağırır:
```hcl
module "sanal_makine" {
  source      = "./modules/vm"
  vm_name     = "devops-server"
  cpu_cores   = 2
  ram_memory  = 4096
}
```

---

## 4. Ansible Mimari Konseptleri

Ansible, Red Hat tarafından geliştirilen, deklaratif/imperatif karma konfigürasyon yönetim aracıdır.

### A. Ajanless (Agentless) Mimari
* **Farkı:** Chef veya Puppet gibi araçlar hedef sunuculara bir "ajan yazılım" kurmayı gerektirir.
* **Ansible:** Hedef sunucuda **hiçbir şey kurulumu gerektirmez**. Sadece Python ve SSH yüklü olması yeterlidir. Sunucuya SSH üzerinden bağlanır, komutları (Python scriptlerini) gönderir, çalıştırır ve siler.

### B. Temel Yapı Taşları
* **Inventory (Envanter - `hosts.ini`):** Ansible'ın yöneteceği sunucuların IP adreslerini, SSH portlarını ve gruplarını tuttuğu dosyadır.
* **Ad-hoc Komutlar:** Tek satırlık hızlı komutlardır (örn: `ansible all -m ping` ile sunucuların erişimini test etme).
* **Playbooks:** Süreçleri otomatize ettiğimiz YAML formatındaki senaryo dosyalarıdır.
* **Tasks & Handlers:** `Tasks` yapılacak işleri tanımlar. `Handlers` ise sadece bir Task tetiklendiğinde çalışan reaktif işlerdir (örn: config değiştiyse Nginx'i restart et).
* **Roles:** Playbook dosyalarını temiz tutmak için görevleri klasörlere bölme yapısıdır (örn: `common`, `webserver`, `database` rolleri).

---

## 5. Uygulamalı Görev 3.2: Terraform Klasik ve Modüler Yapı Analizi ve Refactor

Projemizdeki [terraform](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/terraform) dizinindeki iki farklı yaklaşımı analiz ettik ve tespit ettiğimiz bir yapısal hatayı düzelttik:

### A. Tespit Edilen Yapısal Hata ve Düzeltilmesi (Best Practice)
* **Hata:** Projenin `classic-version` dizinindeki [variables.tf](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/terraform/classic-version/variables.tf) dosyasının 1. satırında `resource "serverspace_ssh" "terraform"` kaynak (resource) bloğu tanımlanmıştı. 
* **Neden Hatalı?** Terraform, klasördeki tüm `.tf` dosyalarını birleştirip okuduğu için bu teknik olarak çalışır. Ancak değişken dosyalarının (`variables.tf`) içinde altyapı kaynakları (resource) tanımlamak senior standartlarında **kötü bir pratiktir (bad practice)**. Dosya isimleri içeriklerini yansıtmalıdır; değişkenler değişken dosyasında, kaynaklar ise ana dosyada (`main.tf`) bulunmalıdır.
* **Refactor/Düzeltme Adımı:** `serverspace_ssh` kaynak bloğunu `variables.tf` dosyasından keserek [main.tf](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/terraform/classic-version/main.tf) dosyasının en üstüne taşıdık. Değişkenler dosyasında sadece temiz tanımlamalar bıraktık.

---

### B. Mimarilerin Karşılaştırmalı Analizi

#### 1. Monolitik Yapı (`classic-version`)
Tüm altyapı bileşenleri (Sanal Sunucu, SSH Anahtarı, İzole Ağ) doğrudan aynı klasördeki `.tf` dosyalarında tanımlıdır.
* **Dosyalar:**
  * [main.tf](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/terraform/classic-version/main.tf): Sunucunun CPU, RAM, disk, IP ve ağ kartı (nic) ayarları doğrudan burada tanımlıdır.
  * [variables.tf](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/terraform/classic-version/variables.tf): Token, SSH yolları, bölge ve sunucu ismi değişkenleri.
  * [providers.tf](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/terraform/classic-version/providers.tf): Serverspace bulut sağlayıcı tanımlaması.

#### 2. Modüler Yapı (`moduler-version`)
Sanal sunucu oluşturma mantığı tamamen paketlenmiş ve dışarıya bağımsız bir **Modül** haline getirilmiştir.
* **Modül Klasörü:** [serverspace-compute](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/terraform/moduler-version/modules/serverspace-compute)
  * Modülün kendi `main.tf`, `variables.tf`, `outputs.tf` ve `providers.tf` dosyaları vardır. Bu modül dışarıdan `server_name`, `cpu`, `ram`, `isolated_network_id` gibi girdiler (input variables) alır ve sunucu IP adresini (output) dışarıya fırlatır.
* **Ana Dosya:** [main.tf](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/terraform/moduler-version/main.tf)
  * Modülü çağırır:
    ```hcl
    module "compute_module" {
      source      = "./modules/serverspace-compute"
      server_name = var.server_name
      location    = var.region
      cpu         = 1
      ram         = 1024
      # ...
    }
    ```
* **Neden Modüler Yapı?** Yarın sunucu sayısını 3'e çıkarmak istediğimizde, kopyala-yapıştır ile 3 sunucu bloğu yazmak yerine, sadece bu modülü farklı isimlerle 3 kez çağırırız. Kod temiz, sürdürülebilir ve tekrar kullanılabilir kalır.

---

## 6. Uygulamalı Görev 3.3: Ansible ile Sunucu Yapılandırma Otomasyonu

1. Aşamada elle (manuel) yaptığımız bağımlılık yükleme, UFW güvenlik duvarı kuralları, Docker deposu kurma, yetkisiz gruba ekleme ve Fail2Ban ayarlarının tamamını tek bir **Ansible Playbook** ile otomatize ettik. 

Projemizde [ansible](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/ansible) dizinini oluşturduk ve içine şu iki dosyayı tanımladık:

### A. Envanter Dosyası: [hosts.ini](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/ansible/hosts.ini)
Ansible'ın hangi sunucularla ve nasıl (port, private key) konuşacağını tanımlarız:
```ini
[devops_servers]
78.111.90.75 ansible_port=2222 ansible_user=devops ansible_ssh_private_key_file=~/.ssh/id_ed25519
```

### B. Otomasyon Dosyası: [playbook.yml](file:///Users/selimboz/Documents/GitHub/nodejs-project-for-devops/ansible/playbook.yml)
Playbook içerisinde Ubuntu'nun kod adını algılayıp `plucky` (25.10) ise otomatik olarak `noble` (24.04 LTS) Docker deposuna eşleyen senior düzeyde bir mantık kurguladık:
```yaml
---
- name: Sunucu Hazırlama ve Docker Kurulum Otomasyonu
  hosts: devops_servers
  become: yes # Tüm komutları sudo ile çalıştır
  vars:
    target_ports:
      - '2222'
      - '80'
      - '443'

  tasks:
    # 1. Aşama: Paket Güncellemeleri
    - name: Sistem paket depolarını güncelle ve yükselt (apt upgrade)
      apt:
        update_cache: yes
        upgrade: safe

    - name: Temel araçları kur (curl, ca-certificates, gnupg, fail2ban)
      apt:
        name:
          - curl
          - ca-certificates
          - gnupg
          - fail2ban
        state: present

    # 2. Aşama: Güvenlik Duvarı (UFW)
    - name: Gerekli portlara UFW üzerinden izin ver
      ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop: "{{ target_ports }}"

    - name: UFW Güvenlik Duvarını aktif et
      ufw:
        state: enabled

    # 3. Aşama: Docker Depo Hazırlığı (Senior Codenames Yönetimi)
    - name: Docker GPG anahtarı için dizin oluştur
      file:
        path: /etc/apt/keyrings
        state: directory
        mode: '0755'

    - name: Docker GPG anahtarını indir
      get_url:
        url: https://download.docker.com/linux/ubuntu/gpg
        dest: /etc/apt/keyrings/docker.asc
        mode: '0644'

    # Ubuntu 25.10 (plucky) uyuşmazlığını aşmak için sürüm kontrolü yapıyoruz
    - name: Ubuntu kod adını belirle (plucky ise noble sürümüne eşle)
      set_fact:
        docker_codename: "{{ 'noble' if ansible_facts['distribution_release'] == 'plucky' else ansible_facts['distribution_release'] }}"

    - name: Docker resmi reposunu APT kaynaklarına ekle
      apt_repository:
        repo: "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu {{ docker_codename }} stable"
        state: present
        filename: docker

    # 4. Aşama: Docker ve Eklentilerinin Kurulması
    - name: Docker Engine, CLI ve Docker Compose eklentisini kur
      apt:
        name:
          - docker-ce
          - docker-ce-cli
          - containerd.io
          - docker-buildx-plugin
          - docker-compose-plugin
        state: present
        update_cache: yes

    # 5. Aşama: Yetkilendirme (Sudo-less Docker)
    - name: devops kullanıcısını docker grubuna ekle
      user:
        name: devops
        groups: docker
        append: yes

    # 6. Aşama: Fail2Ban Yapılandırma Otomasyonu
    - name: Fail2Ban jail.local dosyasını şablon olarak oluştur
      copy:
        dest: /etc/fail2ban/jail.local
        content: |
          [DEFAULT]
          bantime = 1h
          findtime = 10m
          maxretry = 3

          [sshd]
          enabled = true
          port = 2222
          backend = systemd
        mode: '0644'
      notify: restart fail2ban

  handlers:
    - name: restart fail2ban
      service:
        name: fail2ban
        state: restarted
```

### C. Playbook'u MacBook (Lokal) Üzerinden Çalıştırma
Ansible agentless çalıştığı için komutu sunucuda değil kendi **MacBook terminalinde** çalıştırırsın.

1. **Mac'te Ansible Kurulumu (Eğer yoksa):**
   ```bash
   brew install ansible
   ```
2. **Playbook'u Çalıştırma:**
   `ansible` klasörünün içindeyken şu komutu çalıştırırız:
   ```bash
   ansible-playbook -i hosts.ini playbook.yml --ask-become-pass
   ```
   * `--ask-become-pass` parametresi, Ansible sunucuda `become: yes` (sudo) komutlarını çalıştırırken `devops` kullanıcısının sudo şifresini girmemizi sağlar.

3. **Çıktı Analizi:**
   Ansible işlem bittiğinde ekrana bir özet basar. `failed=0` ise tüm adımlar sunucuda sıfırdan başarıyla uygulanmış demektir. İkinci kez çalıştırdığımızda `changed=0` olur (idempotency kanıtı).

---

## 7. Geri Alma (Rollback) ve Hata Arama (Troubleshooting)

### A. Terraform Rollback
* **Yanlış Kaynak Oluşturma:** Eğer `terraform apply` sonrasında sunucu veya kaynak hatalı oluşursa, kodu eski stabil haline getirip (veya git commit revert edip) tekrar `terraform apply` çalıştırmak en güvenli yoldur. Terraform state dosyasına bakarak aradaki farkı hesaplar ve hatalı kaynakları otomatik siler/düzeltir.
* **Tüm Altyapıyı Silme:** Altyapıyı tamamen temizlemek için:
  ```bash
  terraform destroy
  ```

### B. Ansible Rollback, "Idempotency" (Eşgüçlülük) Mantığı ve Canlı Hata Analizleri

* **Ansible Idempotence (Eşgüçlülük):** Bir playbook'u 1 kez de çalıştırsan 100 kez de çalıştırsan sunucunun durumu değişmez. Örneğin, Docker zaten kuruluysa Ansible o adımı atlar (`Ok`), kurulu değilse kurar (`Changed`).
* **Hata Durumunda Rollback:** Ansible playbook yarıda kalırsa sunucu tutarsız bir durumda kalabilir. Bu durumda en iyi pratik, hatalı adımı düzelttikten sonra playbook'u **tekrar çalıştırmaktır**. Ansible kaldığı yerden güvenli bir şekilde devam eder.

---

### C. Canlıda Yaşadığımız Konfigürasyon Hataları ve Çözümleri (Vaka Analizleri)

#### VAKA 1: "Timeout waiting for privilege escalation prompt" (Sudo Zaman Aşımı) Hatası
* **Yaşanılan Sorun:** Playbook'u `--ask-become-pass` ile çalıştırıp doğru şifreyi girmemize rağmen Ansible `Gathering Facts` aşamasında takıldı ve şu hatayla kilitlendi:
  `fatal: [78.111.90.75]: UNREACHABLE! => {"msg": "Task failed: Timeout (12s) waiting for privilege escalation prompt:"}`
* **Neden Kaynaklandı?** Sunucu işletim sistemi olan Ubuntu 25.10 sürümünde geleneksel C tabanlı `sudo` yerine Rust tabanlı yeni **`sudo-rs`** paketi varsayılan olarak kuruludur. Bu paket şifre isterken standardın dışında `[sudo: authenticate] Password:` şeklinde bir prompt basar. Ansible'ın içindeki regex motoru bu yeni Rust tabanlı promptu tanıyamadığı için kilitlenip zaman aşımına uğramaktadır.
* **Senior Çözüm (NOPASSWD):** Otomasyon süreçlerinde şifre ekranlarını tamamen bertaraf etmek için kullanıcıya şifresiz sudo yetkisi verilir. Sunucuda root yetkisiyle şu komutu çalıştırarak `sudoers.d` altına kural ekledik ve playbook'u şifre parametresi olmadan (`ansible-playbook -i hosts.ini playbook.yml`) çalıştırarak sorunu aştık:
  ```bash
  echo "devops ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/devops
  ```

#### VAKA 2: "INJECT_FACTS_AS_VARS" Deprecation (Sürüm Uyumsuzluğu) Uyarısı
* **Yaşanılan Sorun:** Playbook çalışırken sistem değişkenlerini okuduğumuz aşamalarda şu uyarı alındı:
  `[DEPRECATION WARNING]: INJECT_FACTS_AS_VARS default to True is deprecated... Use ansible_facts["fact_name"] instead.`
* **Neden Kaynaklandı?** Eski Ansible sürümlerinde `ansible_distribution_release` gibi sistem değişkenleri doğrudan global değişkenmiş gibi enjekte edilirdi. Yeni Ansible sürümlerinde bu kullanım kaldırılmaktadır.
* **Senior Çözüm (Modern Syntax):** Playbook dosyasındaki tüm eski tip fact çağrılarını modern `ansible_facts` sözdizimine dönüştürerek uyarıyı temizledik:
  ```yaml
  # Eski Hatalı Kullanım:
  docker_codename: "{{ 'noble' if ansible_distribution_release == 'plucky' else ansible_distribution_release }}"

  # Yeni Modern Kullanım:
  docker_codename: "{{ 'noble' if ansible_facts['distribution_release'] == 'plucky' else ansible_facts['distribution_release'] }}"
  ```

#### VAKA 3: Canlı Çalıştırma recap Raporu Analizi
Playbook başarıyla sonlandığında ekrana basılan rapor:
`78.111.90.75 : ok=13 changed=3 unreachable=0 failed=0`
* **Analiz:** Toplam 13 görevin 10 tanesi yeşil (`ok`) döndü, yani sunucuda zaten bu ayarlar olduğu için dokunulmadı (Idempotency). Sadece 3 adımda (`changed=3`) değişiklik yapıldı: Sunucu paketleri güncellendi, fail2ban konfigürasyon dosyası sıfırdan oluşturuldu ve fail2ban servisi yeniden başlatıldı.

---

## Ders 3 Kendi Kendine Sorular (Troubleshooting & Mülakat Soruları)

1. Provisioning araçları (Terraform) ile Configuration Management araçları (Ansible) arasındaki temel kullanım farkı nedir?
2. `terraform.tfstate` dosyası nedir? Ortak projelerde bu dosyanın çakışmasını engellemek için hangi yöntemler kullanılır?
3. Ansible'ın "Agentless" mimarisinin, hedef sunucular açısından avantajı ve dezavantajı nedir?
4. Ansible'daki **Idempotency** kavramı ne anlama gelir ve DevOps otomasyonları için neden hayati önem taşır?
5. Terraform'da monolitik (`classic-version`) bir yapıyı modüler (`moduler-version`) bir yapıya bölmenin bakımı (maintenance) kolaylaştırma sebepleri nelerdir?
