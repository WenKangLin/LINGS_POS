const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../data/backups');
const KEEP = 30;              // days of nightly backups to retain
const RUN_AT_HOUR = 4;        // 04:00 local — after close, before open

// Writes a consistent snapshot of the live DB (safe under WAL) to data/backups/orders-YYYY-MM-DD.db
function runBackup(db) {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const target = path.join(BACKUP_DIR, `orders-${stamp}.db`);
  if (fs.existsSync(target)) fs.unlinkSync(target); // VACUUM INTO refuses to overwrite
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  prune();
  return target;
}

function prune() {
  const files = fs.readdirSync(BACKUP_DIR).filter(f => /^orders-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) fs.unlinkSync(path.join(BACKUP_DIR, f));
}

function msUntilNextRun() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(RUN_AT_HOUR, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

function schedule(db) {
  const tick = () => {
    try { console.log('Nightly backup written:', runBackup(db)); }
    catch (e) { console.error('Nightly backup failed:', e); }
    setTimeout(tick, msUntilNextRun());
  };
  setTimeout(tick, msUntilNextRun());
}

module.exports = { runBackup, schedule, BACKUP_DIR };
