# Çalışma Yol Arkadaşım

Kişisel çalışma asistanı. Haftalık ders programına dayalı günlük çalışma planları
oluşturur; soru hedeflerini, çalışma sürelerini ve ilerlemeyi takip eder; gerçek
verilere dayalı bir yapay zekâ çalışma koçu sunar.

> **Veri kaynağı:** Uygulama, sağlanan **haftalık ders programı görselinden** birebir
> çıkarılan ders/saat/öğretmen bilgisini kullanır (bkz. `src/lib/timetable.ts`).
> Program görselinde **konu başlıkları** ve **soru hedefleri yer almadığından**,
> bunlar uygulama tarafından **uydurulmaz**; Günlük Plan ve Soru Hedefleri
> bölümlerinden kendin ekleyebilirsin.

## Özellikler

- **Genel Bakış:** Günlük özet, soru/süre ilerlemesi, program ilerlemesi, sınav geri
  sayımı, çalışma serisi, bugünkü tekrarlar, haftalık grafik, ders bazında ilerleme ve
  koç önerisi.
- **Günlük Plan:** Programdan otomatik görev oluşturma, manuel görev, tamamla/başla/
  ertele/sil, günlük hedef düzenleme, süre kaydı. Ertelenen görevler kaybolmaz.
- **Dersler ve Konular:** Haftalık ders programı tablosu + ders bazlı konu yönetimi.
- **Soru Hedefleri:** Ders/konu bazında toplam/doğru/yanlış/boş girişi. Yalnızca toplam
  girildiğinde dağılım uydurulmaz. Kayıtlar düzenlenip silinebilir.
- **Pomodoro:** Zaman damgası tabanlı sayaç (sekme/yenileme süreyi bozmaz), 25/5-50/10
  ön ayarları, yarım oturum kaydedilmez.
- **Tekrar Merkezi:** Aralıklı tekrar (1-3-7-14-30 gün), kolay/orta/zor değerlendirmesi,
  mükerrer kayıt engeli.
- **Notlar ve Yanlış Defteri:** Ekle/düzenle/sil/ara/filtrele; girilmeyen doğru cevap
  uydurulmaz.
- **Hedefler ve Kilometre Taşları:** Otomatik (soru/konu/süre/tekrar) veya elle takip;
  ilerleme gerçek kayıtlardan; süresi geçen hedefler işaretlenir.
- **Çalışma Takvimi:** Aylık görünüm; görev/çalışma/tekrar yoğunluğu; güne tıklayınca
  detay.
- **Enerji ve Motivasyon:** İsteğe bağlı 1–5 kayıt; en az 3 kayıtta ortalama gösterilir.
- **İlerleme ve İstatistikler:** Grafikler, doğru oranı (yeterli veride), zayıf konular.
- **AI Çalışma Koçu:** Sunucu tarafı; `OPENAI_API_KEY` yoksa kural tabanlı öneri.
- **Hatırlatmalar:** Tarayıcı bildirim izni/destek kontrolü.
- **Veri ve Yedekleme:** Tam JSON yedeği, soru kayıtları CSV; doğrulamalı, onaylı geri
  yükleme (geçersiz dosya mevcut veriyi bozmaz, sırlar yedeğe konmaz).

## Teknolojiler

- Next.js 16 (App Router) + TypeScript
- PostgreSQL + Drizzle ORM
- Tailwind CSS
- Vitest (birim testleri)

## Kurulum

1. Bağımlılıkları yükle:
   ```bash
   npm install
   ```
2. Ortam değişkenlerini ayarla (`.env`):
   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/app_db
   # Yapay zekâ koçu (opsiyonel):
   OPENAI_API_KEY=...
   OPENAI_MODEL=gpt-4o-mini          # opsiyonel
   OPENAI_BASE_URL=https://api.openai.com/v1  # opsiyonel
   ```
3. Veritabanı şemasını uygula:
   ```bash
   npx drizzle-kit push
   ```
4. Geliştirme sunucusu:
   ```bash
   npm run dev
   ```
   Üretim:
   ```bash
   npm run build && npm run start
   ```

İlk açılışta dersler, haftalık program ve varsayılan ayarlar otomatik olarak
(bir kez, veriyi çoğaltmadan) yüklenir.

## Testler

```bash
npx vitest run
```

Testler tarih hesaplamalarını, program çıkarımını, koç kural motorunu ve yardımcı
fonksiyonları kapsar.

## Yapay zekâ anahtarı yoksa

Uygulama çalışmaya devam eder. Koç, gerçek çalışma verilerine dayalı öneriler sunar
ve ilgili ekranda anahtarın tanımlı olmadığı açıkça belirtilir. Hiçbir gizli anahtar
istemciye veya kaynak koda gömülmez; tüm yapay zekâ çağrıları `src/app/api/coach`
altındaki sunucu tarafı rotalardan yapılır.

## Veri modeli (özet)

`subjects`, `schedule_slots`, `topics`, `tasks`, `question_logs`,
`study_sessions`, `daily_goals`, `settings`, `coach_messages`
(bkz. `src/db/schema.ts`).
