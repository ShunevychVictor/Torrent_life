const fs = require('fs');
const path = require('path');
const parseTorrent = require('parse-torrent');

const TORRENTS_DIR = path.join(__dirname, '../torrents');
const OUTPUT_FILE = path.join(__dirname, '../torrents.json');

async function buildCatalog() {
  // Перевіряємо чи існує папка з торентами
  if (!fs.existsSync(TORRENTS_DIR)) {
    fs.mkdirSync(TORRENTS_DIR);
  }

  const files = fs.readdirSync(TORRENTS_DIR).filter(f => f.endsWith('.torrent'));
  const catalog = [];

  for (const file of files) {
    const filePath = path.join(TORRENTS_DIR, file);
    const buf = fs.readFileSync(filePath);

    try {
      // Зчитуємо дані з .torrent файлу
      const parsed = await parseTorrent(buf);
      
      // Формуємо magnet-посилання
      const magnetURI = parseTorrent.toMagnetURI(parsed);

      // Форматуємо розмір файлу
      const sizeMB = parsed.length ? (parsed.length / (1024 * 1024)).toFixed(1) + ' MB' : 'N/A';

      catalog.push({
        id: parsed.infoHash,
        title: parsed.name || file.replace('.torrent', ''),
        size: sizeMB,
        date: new Date().toISOString().split('T')[0],
        magnet: magnetURI,
        fileUrl: `torrents/${encodeURIComponent(file)}` // Посилання для скачування самого .torrent файлу
      });
    } catch (err) {
      console.error(`Помилка читання файлу ${file}:`, err.message);
    }
  }

  // Записуємо готовий json
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2));
  console.log(`Успішно оброблено ${catalog.length} торент-файлів!`);
}

buildCatalog();
