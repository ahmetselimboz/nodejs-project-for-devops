# Ders 6: Dağıtık Gözlemlenebilirlik (Observability) - Prometheus, Grafana, Loki ve OpenTelemetry

Bu ders notunda; özellikle mikroservis ve dağıtık mimarilerde sistem sağlığını izlemenin, hataları anında tespit etmenin ve performans darboğazlarını analiz etmenin yegane yolu olan **Gözlemlenebilirlik (Observability)** konusunu ele alacağız. Prometheus, Grafana, Loki, Promtail ve OpenTelemetry gibi sektör standardı araçları, teorik mimarileri ve pratik uygulamalarıyla derinlemesine inceleyeceğiz.

---

## 1. Gözlemlenebilirlik (Observability) Nedir? (3 Pillars)

Gözlemlenebilirlik, bir sistemin iç durumunu, sadece dışarıya verdiği çıktılara (loglar, metrikler vb.) bakarak ne derece anlayabildiğimizin ölçüsüdür. İzleme (Monitoring) sistemin "çalışıp çalışmadığını" söylerken, Gözlemlenebilirlik "neden çalışmadığını" bulmamızı sağlar.

Gözlemlenebilirliğin 3 temel sütunu (**Three Pillars**) vardır:

```
                  ┌──────────────────────────────┐
                  │        OBSERVABILITY         │
                  └──────────────┬───────────────┘
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
    ┌───────────┐          ┌───────────┐          ┌───────────┐
    │  METRICS  │          │   LOGS    │          │  TRACES   │
    │ (Metrik)  │          │  (Loglar) │          │ (İzler)   │
    └───────────┘          └───────────┘          └───────────┘
```

1. **Metrics (Metrikler):** Zamana bağlı nümerik (sayısal) verilerdir (örn: CPU kullanımı %85, API yanıt süresi 120ms, anlık kullanıcı sayısı 500). Sistem sağlığını ve kaynak tüketimini genel düzeyde izlemek için kullanılır.
2. **Logs (Loglar):** Sistemde gerçekleşen belirli olayların (events) zaman damgalı metin kayıtlarıdır (örn: *"14:02:11 - Kullanıcı 42 veritabanına bağlanamadı"*). Hatanın tam olarak nerede ve neden gerçekleştiğini bulmak için kullanılır.
3. **Traces (İzler / Distributed Tracing):** Bir isteğin (request) mikroservis mimarisindeki servisler arasında yaptığı yolculuğun haritasıdır. İstek A servisinden B'ye, oradan DB'ye geçerken nerede ne kadar milisaniye harcandığını gösterir (darboğaz tespiti).

---

## 2. Prometheus Mimarisi ve Çalışma Prensibi

Prometheus, CNCF (Cloud Native Computing Foundation) bünyesinde barındırılan, özellikle Kubernetes uyumlu, zaman serisi tabanlı (Time-Series Database - TSDB) açık kaynaklı bir izleme ve alarm sistemidir.

### A. Temel Bileşenler ve Mimarisi
* **Prometheus Server:** Metrikleri çeken (scrape), TSDB'ye kaydeden ve alarm kurallarını çalıştıran ana beyindir.
* **Pull-Based (Çekme) Modeli:** Prometheus, izlenecek hedeflerin (targets) IP/port adreslerine kendisi belirli aralıklarla (örn: her 15 saniyede bir) HTTP istekleri atarak metrikleri çeker (Scraping). Push-based (gönderme) modellerinin aksine, hedeflerin Prometheus'tan haberdar olması gerekmez.
* **Exporters (Dışa Aktarıcılar):** Prometheus metrik formatını desteklemeyen eski veya bağımsız sistemlerin (örn: Linux işletim sistemi, MySQL) metriklerini Prometheus'un anlayacağı formatta dışarıya açan ajanlardır.
  * **Node Exporter:** Linux işletim sisteminin CPU, RAM, Disk, Ağ metriklerini toplar.
  * **Blackbox Exporter:** Ağ üzerinden HTTP/TCP pingleri atarak servislerin ayakta olup olmadığını kontrol eder.
* **Pushgateway:** Çok kısa süreli işlerin (CronJobs/Batch Jobs) metriklerini bitmeden önce gönderebileceği geçici bir ara bellektir.
* **Alertmanager:** Tanımlanan alarm kuralları tetiklendiğinde Slack, E-posta, PagerDuty gibi kanallara bildirim gönderir.

### B. Zaman Serisi Veri Modeli ve PromQL
Prometheus verileri zaman serisi formatında tutar:
`metrik_adi{etiket1="deger1", etiket2="deger2"} deger zaman_damgasi`
*Örnek:* `http_requests_total{method="POST", status="200"} 1053`
* **PromQL (Prometheus Query Language):** Bu metrikleri sorgulamak için kullanılan güçlü bir sorgu dilidir.
  * *Anlık CPU Oranı:* `100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`

---

## 3. Grafana Mimarisi

Grafana; Prometheus, Elasticsearch, Loki, InfluxDB gibi farklı veri kaynaklarından (Data Sources) gelen verileri tek bir yerde birleştiren, görselleştiren ve dashboard'lar tasarlamayı sağlayan zengin bir analiz platformudur.
* **Veri Depolamaz:** Grafana kendi üzerinde metrik verisi barındırmaz. Sadece tanımlanan veri kaynağına (örn: Prometheus) sorgu atar ve gelen sonuçları grafiklere dönüştürür.
* **Grafana Live:** Sunucuyla tarayıcı arasında kurulan WebSocket bağlantıları sayesinde canlı sistem verilerini anlık (real-time) izlemenizi sağlar.

---

## 4. Uygulama Metrikleri: Node.js Entegrasyonu

Bir Node.js API'sinden Prometheus formatında metrik üretebilmek için en popüler kütüphaneler `prom-client` ve Express tabanlı `express-prom-bundle`'dır.

### A. Metrik Tipleri
1. **Counter (Sayaç):** Sadece artan veya sıfırlanan değerlerdir (örn: toplam HTTP isteği sayısı, toplam hata sayısı). Asla azalmazlar.
2. **Gauge (Ölçer):** Artıp azalabilen anlık değerlerdir (örn: aktif kullanıcı sayısı, bellek kullanımı, DB bağlantı sayısı).
3. **Histogram:** Değerlerin belirli aralıklara (buckets) göre dağılımını ölçer (örn: API yanıt süresi 0-50ms arası kaç istek, 50-100ms arası kaç istek). Yanıt süresi yüzdeliklerini (percentiles) hesaplamak için kullanılır.
4. **Summary:** Histogram'a benzer şekilde çalışır ancak yüzdelik hesaplamalarını doğrudan client (istemci) tarafında yapar.

---

## 5. Dağıtık Log Yönetimi: Loki ve Promtail

Dağıtık sistemlerde logların her bir podun veya sunucunun içine girilerek manuel incelenmesi imkansızdır. Logların tek bir merkezde toplanması (**Log Aggregation**) gerekir.

### Loki ve Promtail Mimarisi
Grafana firması tarafından geliştirilen **Loki**, *"Loglar için Prometheus"* felsefesiyle tasarlanmış, hafif ve yüksek performanslı bir log toplama sistemidir.

```
┌─────────────────┐
│ Kubernetes Pods │
└────────┬────────┘
         │ (Konteyner Logları - /var/log/pods)
         ▼
    ┌──────────┐
    │ Promtail │  (DaemonSet olarak her Node'da çalışır)
    └────┬─────┘
         │ (Logları JSON/Batch olarak gönderir)
         ▼
    ┌──────────┐
    │   Loki   │  (Logları indeksler ve saklar)
    └────┬─────┘
         │ (Sorguları yanıtlar - LogQL)
         ▼
    ┌──────────┐
    │ Grafana  │  (Logları arayüzde görselleştirir)
    └──────────┘
```

* **Promtail:** Her sunucuda (veya K8s cluster'ında DaemonSet olarak) çalışan ve yerel log dosyalarını (örneğin `/var/log/pods`) takip edip Loki'ye gönderen log toplayıcı ajandır.
* **Loki:** Gelen logları teslim alan veritabanıdır. Geleneksel ELK Stack (Elasticsearch) mimarisinin aksine, logların tüm içeriğini indekslemez. Sadece logların etiketlerini (labels) indeksler. Bu sayede disk kullanımı ve RAM tüketimi Elasticsearch'e göre **10 kat daha düşüktür**.
* **LogQL:** Loki üzerindeki logları sorgulamak için kullanılan, PromQL benzeri sorgu dilidir.
  * *Hata Loglarını Bulma:* `{app="nodejs-api"} |= "error" or |= "failed"`

---

## 6. Distributed Tracing ve OpenTelemetry Giriş

Mikroservis mimarisinde bir istek sırasıyla API Gateway -> Auth Service -> Product Service -> Database zincirini izlerken yavaşlık yaşanırsa, hatanın hangi serviste olduğunu bulmak zordur.

* **Distributed Tracing (Dağıtık İzleme):** İstek sisteme girdiğinde ona benzersiz bir `Trace ID` atanır. İstek diğer servislere aktarılırken bu ID HTTP header'larında (`X-Trace-Id`) taşınır. Her serviste geçen süreye `Span` denir.
* **OpenTelemetry (OTel):** Metrik, log ve trace verilerini toplamak, işlemek ve ihraç etmek için oluşturulmuş, üretici bağımsız (vendor-agnostic) ortak bir standart ve SDK kütüphanesidir. Toplanan veriler Jaeger, Zipkin, Dynatrace veya Datadog gibi platformlara gönderilebilir.

---

## 7. Uygulamalı Görev 6.4: Grafana ve Prometheus Subpath Hata Analizi (Troubleshooting Case)

Grafana üzerinde Prometheus veri kaynağı (Data Source) eklenirken `404 Not Found - There was an error returned querying the Prometheus API` hatasıyla karşılaşılabilir.

### A. Sorunun Analizi ve Tespiti
* **Neden:** Prometheus container'ımız başlatılırken `--web.external-url=https://api.selimboz.com/prometheus/` parametresi verilmiştir.
* Bu parametre, Prometheus'un tüm API yollarını ve sorgu servislerini `/prometheus/` alt dizini (subpath) arkasından sunmaya zorlar.
* Grafana'ya varsayılan olarak `http://prometheus:9090` adresi girildiğinde, Grafana doğrudan `http://prometheus:9090/api/v1/...` istekleri atar. Ancak Prometheus bunu `/prometheus/api/v1/...` altında beklediği için **HTTP 404** hatası döner.

---

### B. Çözüm
Grafana üzerindeki veri kaynağı URL tanımı, alt dizini de içerecek şekilde güncellenmelidir:
* **Hatalı URL:** `http://prometheus:9090`
* **Doğru URL:** `http://prometheus:9090/prometheus` (Sondaki slash olmadan)

Bu güncellemeden sonra Grafana, Prometheus API'sini başarıyla sorgulayabilir hale gelir.

---

## 8. Uygulamalı Görev 6.4: Grafana Datasource UID Hatası (Troubleshooting Case)

Başka bir ortamdan ihraç (export) edilen bir Grafana Dashboard JSON modeli içeri aktarılırken, panellerde `Datasource dfnrw28iwprlsc was not found` hatası alınabilir ve grafikler `No data` durumunda kalabilir.

### A. Sorunun Analizi ve Tespiti
* **Neden:** İhraç edilen JSON modelindeki paneller, eski ortamdaki Prometheus veri kaynağının benzersiz kimliğine (**UID - `dfnrw28iwprlsc`**) hardcoded (sabit kodlu) olarak bağlanmıştır.
* Yeni ortamda oluşturulan Prometheus veri kaynağının UID'si farklı olduğu için Grafana bu eşleşmeyi kuramaz ve veri çekemez.

---

### B. Çözüm (En Pratik Yöntem)
Bu sorunu çözmek için panellere tek tek girmek yerine **Dashboard'u silip yeniden import etmek ve import esnasında veri kaynağını seçmek** en doğru yöntemdir:
1. Hatalı dashboard Grafana üzerinden silinir.
2. Yeniden **Import** ekranına gelinir ve JSON dosyası yüklenir.
3. Import yapılandırma ekranının en altında bulunan **Prometheus (select a data source)** açılır listesinden yeni oluşturduğumuz aktif Prometheus veri kaynağı seçilir ve **Import** butonuna basılır.
4. Grafana, JSON içindeki tüm eski hardcoded UID'leri otomatik olarak bizim yeni veri kaynağımızın UID'si ile toplu şekilde günceller ve grafikler anında dolmaya başlar.

---

## Ders 6 Kendi Kendine Sorular (Troubleshooting & Mülakat Soruları)

1. Gözlemlenebilirlik (Observability) ile İzleme (Monitoring) arasındaki temel fark nedir?
2. Prometheus neden "Pull-based" model kullanır? Push-based model ile arasındaki avantaj/dezavantaj farkları nelerdir?
3. Prometheus'taki `Counter` ile `Gauge` veri tipleri arasındaki farkı birer örnekle açıklayınız.
4. Grafana Loki'nin ELK Stack'e (Elasticsearch) kıyasla kaynak tüketimi (RAM/Disk) açısından en büyük avantajı nedir ve bunu nasıl başarır?
5. Distributed Tracing mimarisinde `Trace ID` ve `Span ID` kavramları neyi ifade eder? İsteklerin izi servisler arasında nasıl sürülür?
