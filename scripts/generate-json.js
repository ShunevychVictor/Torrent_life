const fs = require('fs');
const path = require('path');

const TORRENTS_DIR = path.join(__dirname, '../torrents');
const OUTPUT_FILE = path.join(__dirname, '../torrents.json');

async function buildCatalog() {
  // Динамічно імпортуємо parse-torrent для підтримки ES Modules
  const { default: parseTorrent } = await import('parse-torrent');

  if (!fs.existsSync(TORRENTS_DIR)) {
    fs.mkdirSync(TORRENTS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(TORRENTS_DIR).filter(f => f.toLowerCase().endsWith('.torrent'));
  const catalog = [];

  for (const file of files) {
    const filePath = path.join(TORRENTS_DIR, file);
    const buf = fs.readFileSync(filePath);

    try {
      const parsed = await parseTorrent(buf);
      
      // Формування Magnet-посилання
      const magnetURI = `magnet:?xt=urn:btih:${parsed.infoHash}&dn=${encodeURIComponent(parsed.name || file)}`;

      // Форматування розміру файлу
      let sizeFormatted = 'N/A';
      if (parsed.length) {
        const sizeMB = parsed.length / (1024 * 1024);
        sizeFormatted = sizeMB >= 1024 
          ? (sizeMB / 1024).toFixed(2) + ' GB' 
          : sizeMB.toFixed(1) + ' MB';
      }

      catalog.push({
        id: parsed.infoHash,
        title: parsed.name || file.replace(/\.torrent$/i, ''),
        size: sizeFormatted,
        date: new Date().toISOString().split('T')[0],
        magnet: magnetURI,
        fileUrl: `torrents/${encodeURIComponent(file)}`
      });
      
      console.log(`Успішно оброблено: ${file}`);
    } catch (err) {
      console.error(`Помилка читання файлу ${file}:`, err.message);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2));
  console.log(`Всього додано торентів у базу: ${catalog.length}`);
}

buildCatalog().catch(err => {
  console.error('Критична помилка виконання:', err);
  process.exit(1);
});
