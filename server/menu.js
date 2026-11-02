const fs = require('fs');
const path = require('path');

// Menu data — based on Ling's Chinese Takeaway, Tagoat. Edit menu.json; it is reloaded automatically.
const MENU_FILE = path.join(__dirname, 'menu.json');

let menu = null;
let itemsById = new Map();

function index(m) {
  const map = new Map();
  for (const s of m.sections) {
    for (const i of s.items || []) map.set(String(i.id), { item: i, section: s });
    for (const sub of s.subsections || []) for (const i of sub.items || []) map.set(String(i.id), { item: i, section: s });
  }
  return map;
}

function load() {
  const parsed = JSON.parse(fs.readFileSync(MENU_FILE, 'utf-8'));
  if (!Array.isArray(parsed.sections)) throw new Error('menu.json: "sections" must be an array');
  menu = parsed;
  itemsById = index(parsed);
  return menu;
}

// Reload from disk; on failure keep the previous menu and rethrow so the caller can report it
function reload() {
  const next = load();
  console.log(`Menu reloaded: ${itemsById.size} items`);
  return next;
}

load();

// Re-read when the file changes (debounced — editors often write in several bursts)
let timer = null;
fs.watch(MENU_FILE, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { reload(); } catch (e) { console.error('menu.json not reloaded — fix the error and save again:', e.message); }
  }, 300);
});

const sizeLabel = key => key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

// Resolve the authoritative price for a cart line id.
// Ids look like "<itemId>" | "<itemId>_<variant>" | either followed by "|mod|mod" (modifiers never affect price).
// Variant is a BYO size key, a BYO protein name, a Chef's Special protein name, a wing/rib style, or a drink flavour.
function priceFor(lineId) {
  const [withVariant] = String(lineId).split('|');
  const us = withVariant.indexOf('_');
  const baseId = us === -1 ? withVariant : withVariant.slice(0, us);
  const variant = us === -1 ? null : withVariant.slice(us + 1);

  const entry = itemsById.get(baseId);
  if (!entry) return null;
  const { item, section } = entry;

  if (section.buildYourOwn) {
    if (!variant) return null;
    if (section.sizes && variant in section.sizes) return section.sizes[variant];
    const protein = (section.proteins || []).find(p => p.name === variant);
    return protein ? protein.price : null;
  }
  if (item.proteinOptions?.length) {
    const protein = item.proteinOptions.find(p => p.name === variant);
    return protein ? protein.price : null;
  }
  // options / drinkOptions / plain items all use the item's own price
  return typeof item.price === 'number' ? item.price : null;
}

module.exports = { get: () => menu, reload, priceFor, sizeLabel };
