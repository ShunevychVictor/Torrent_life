const fs = require('fs');
const path = require('path');

const TORRENTS_DIR = path.join(__dirname, '../torrents');
const OUTPUT_FILE = path.join(__dirname, '../torrents.json');

async function buildCatalog() {
  const { default: parseTorrent } = await import('parse-torrent');

  if (!fs.existsSync(TORRENTS_DIR)) {
    fs.mkdirSync(TORRENTS_DIR, { recursive: true });
  }

  // Зчитуємо старий JSON, щоб зберегти дати додавання
  let existingCatalogMap = new Map();
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const oldData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      oldData.forEach(item => existingCatalogMap.set(item.id, item.date));
    } catch (e) {
      console.log('Старий torrents.json відсутній або пошкоджений, створюємо новий');
    }
  }

  const files = fs.readdirSync(TORRENTS_DIR).filter(f => f.toLowerCase().endsWith('.torrent'));
  const catalog = [];

  for (const file of files) {
    const filePath = path.join(TORRENTS_DIR, file);
    const buf = fs.readFileSync(filePath);

    try {
      const parsed = await parseTorrent(buf);
      const magnetURI = `magnet:?xt=urn:btih:${parsed.infoHash}&dn=${encodeURIComponent(parsed.name || file)}`;

      let sizeFormatted = 'N/A';
      if (parsed.length) {
        const sizeMB = parsed.length / (1024 * 1024);
        sizeFormatted = sizeMB >= 1024 
          ? (sizeMB / 1024).toFixed(2) + ' GB' 
          : sizeMB.toFixed(1) + ' MB';
      }

      // Якщо торент вже був у базі, зберігаємо його дату, інакше — ставимо дату файла або сьогоднішню
      const stats = fs.statSync(filePath);
      const fileDate = stats.mtime.toISOString().split('T')[0];
      const existingDate = existingCatalogMap.get(parsed.infoHash);

      catalog.push({
        id: parsed.infoHash,
        title: parsed.name || file.replace(/\.torrent$/i, ''),
        size: sizeFormatted,
        date: existingDate || fileDate, // <--- Зберігає старанну дату
        magnet: magnetURI,
        fileUrl: `torrents/${encodeURIComponent(file)}`
      });
      
    } catch (err) {
      console.error(`Помилка читання файлу ${file}:`, err.message);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2));
  console.log(`Базу оновлено! Всього торентів: ${catalog.length}`);
}

buildCatalog().catch(err => {
  console.error('Критична помилка:', err);
  process.exit(1);
});
