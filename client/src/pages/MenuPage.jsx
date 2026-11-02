import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Send, CheckCircle, Leaf, X, AlertTriangle, Info, Pencil } from 'lucide-react';

function AllergenBadges({ allergens, allergenMap, activeFilters = [], className = '' }) {
  if (!allergens || allergens.length === 0) return <p className={`text-stone-500 text-xs ${className}`}>No listed allergens</p>;
  return (
    <div className={`flex gap-1 flex-wrap ${className}`}>
      {allergens.map(a => {
        const hit = activeFilters.includes(a);
        return (
          <span key={a} className={`text-xs px-1.5 py-0.5 rounded border whitespace-nowrap ${hit ? 'bg-red-500/20 text-red-300 border-red-500/50 font-bold' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
            {allergenMap[a]}
          </span>
        );
      })}
    </div>
  );
}

// Returns 'unsafe' | 'adaptable' | 'ok' for an item against the selected allergen filters.
// 'adaptable' means every matching allergen is listed in item.removable (kitchen can leave it out).
function allergenStatus(item, filters) {
  if (!filters.length) return 'ok';
  const hits = (item.allergens || []).filter(a => filters.includes(a));
  if (!hits.length) return 'ok';
  const removable = item.removable || [];
  return hits.every(a => removable.includes(a)) ? 'adaptable' : 'unsafe';
}

function ItemRow({ item, allergenMap, currency, onAdd, onAddWithOptions, onBuildYourOwn, onDrinkOptions, onProteinOptions, onInfo, cartQty, filters }) {
  const status = allergenStatus(item, filters);
  const cardStyle = {
    ok: 'bg-stone-800 border-stone-700 hover:border-stone-600',
    adaptable: 'bg-amber-900/30 border-amber-500/60 hover:border-amber-400',
    unsafe: 'bg-red-950/40 border-red-500/60 opacity-60',
  }[status];
  const handleAdd = () => {
    if (item.buildYourOwn) {
      onBuildYourOwn(item);
    } else if (item.proteinOptions && item.proteinOptions.length > 0) {
      onProteinOptions(item);
    } else if (item.drinkOptions && item.drinkOptions.length > 0) {
      onDrinkOptions(item);
    } else if (item.options && item.options.length > 0) {
      onAddWithOptions(item);
    } else {
      onAdd(item);
    }
  };
  return (
    <div className={`px-4 py-3 rounded-lg border transition-all group cursor-pointer ${cardStyle}`} onClick={handleAdd}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold tracking-wide text-lg leading-tight ${status === 'unsafe' ? 'text-red-300' : 'text-white'}`}>{item.name}</p>
            {item.vegetarian && (
              <span title="Vegetarian" className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-bold">
                <Leaf className="w-2.5 h-2.5" /> VG
              </span>
            )}
            {status === 'adaptable' && <span className="text-xs font-bold text-amber-300 uppercase">Ask kitchen</span>}
          </div>
          {item.description && <p className="text-stone-500 text-sm mt-0.5">{item.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {item.price != null && <span className="text-amber-500 font-bold text-base whitespace-nowrap">{currency}{item.price.toFixed(2)}</span>}
          <div className="flex items-center gap-1">
            {cartQty > 0 && (
              <span className="text-[10px] font-bold bg-amber-500 text-stone-900 rounded-full w-5 h-5 flex items-center justify-center">{cartQty}</span>
            )}
            <button
              onClick={e => { e.stopPropagation(); onInfo(item); }}
              title="Allergen info"
              className="w-7 h-7 rounded-full text-stone-500 hover:text-white hover:bg-stone-700 transition-all flex items-center justify-center"
            >
              <Info size={14} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleAdd(); }}
              className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-stone-900 transition-all flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const [menu, setMenu] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeSection, setActiveSection] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [form, setForm] = useState({ customerName: '', phone: '', address: '', notes: '', orderType: 'collection' });
  const [optionsPopup, setOptionsPopup] = useState(null); // { item, showSauces: false }
  const [buildPopup, setBuildPopup] = useState(null); // { sauceItem, size: null, protein: null, section }
  const [drinkPopup, setDrinkPopup] = useState(null); // { item }
  const [proteinPopup, setProteinPopup] = useState(null); // { item with proteinOptions }
  const [infoPopup, setInfoPopup] = useState(null); // item
  const [modifierPopup, setModifierPopup] = useState(null); // { item, selected: [], note, qty }
  const [filters, setFilters] = useState([]); // allergen ids to avoid
  const sectionRefs = useRef(new Map());
  const centreRef = useRef(null);

  useEffect(() => {
    fetch('/api/menu').then(r => r.json()).then(data => {
      setMenu(data);
      if (data.sections?.length) setActiveSection(data.sections[0].name);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const observers = [];
    const root = centreRef.current;
    menu.sections.forEach(section => {
      const el = sectionRefs.current.get(section.name);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(section.name); },
        { root, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [menu]);


  const scrollToSection = (name) => {
    const el = sectionRefs.current.get(name);
    const container = centreRef.current;
    if (el && container) {
      const y = el.offsetTop - 20;
      container.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const addToCart = (item, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => (i.id === item.id ? { ...i, quantity: i.quantity + qty } : i));
      return [...prev, { ...item, quantity: qty }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(i => (i.id === id ? { ...i, quantity: i.quantity + delta } : i)).filter(i => i.quantity > 0));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const currency = menu?.currency || '€';
  const allergenMap = menu?.allergens || {};
  const modifierOptions = menu?.modifiers || [];
  // Quantity per menu item, collapsing option/modifier variants (ids look like "12_BBQ|No Onion")
  const cartMap = {};
  cart.forEach(i => { const base = String(i.baseId ?? i.id).split('_')[0]; cartMap[base] = (cartMap[base] || 0) + i.quantity; });

  // Collect all item IDs from main course sections (flagged with mainCourse: true in menu.json)
  const mainCourseIds = new Set();
  if (menu) {
    menu.sections.filter(s => s.mainCourse).forEach(s => {
      if (s.items) s.items.forEach(i => mainCourseIds.add(i.id));
      if (s.subsections) s.subsections.forEach(sub => sub.items.forEach(i => mainCourseIds.add(i.id)));
    });
  }
  // Also count Build Your Own protein picks as main courses
  const buildYourOwnIds = new Set();
  if (menu) {
    const byo = menu.sections.find(s => s.buildYourOwn);
    if (byo) byo.items.forEach(i => buildYourOwnIds.add(i.id));
  }
  const sizeKeys = ['small', 'medium', 'large', 'smallTray', 'largeTray'];
  const mainCourseCount = cart.filter(i => {
    const baseId = i.baseId ?? i.id;
    if (mainCourseIds.has(baseId)) return true;
    // Check if this is a Build Your Own protein item (not a sauce-only size)
    const idStr = String(baseId);
    for (const byoId of buildYourOwnIds) {
      const prefix = String(byoId) + '_';
      if (idStr.startsWith(prefix) && !sizeKeys.includes(idStr.slice(prefix.length))) return true;
    }
    return false;
  }).reduce((sum, i) => sum + i.quantity, 0);

  // Quick-add side items
  const quickAddNames = ['Chips', 'Boiled Rice', 'Egg Fried Rice', 'Fried Noodles', 'Salt & Chilli Chips', '1/2 & 1/2 (Chips & Rice)'];
  const quickAddItems = [];
  if (menu) {
    menu.sections.forEach(s => {
      (s.items || []).forEach(item => {
        if (quickAddNames.includes(item.name)) quickAddItems.push(item);
      });
    });
    quickAddItems.sort((a, b) => quickAddNames.indexOf(a.name) - quickAddNames.indexOf(b.name));
  }

  // Build Your Own sauces double as the "Other" sauce list for wings / ribs
  const buildSection = menu?.sections.find(s => s.buildYourOwn);
  const chefSauces = (buildSection?.items || []).map(i => i.name);

  const mergeField = (field, ...parts) => [...new Set(parts.flatMap(p => p?.[field] || []))].sort((a, b) => a - b);
  const mergeAllergens = (...parts) => mergeField('allergens', ...parts);
  const toggleFilter = (id) => setFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  // Every add (except drinks) goes through the modifier popup.
  // Allergens the kitchen can leave out ("removable") that match an active filter are pre-ticked as "No X".
  const openModifiers = (cartItem) => {
    const removable = cartItem.removable || [];
    const autoMods = (cartItem.allergens || []).filter(a => filters.includes(a) && removable.includes(a)).map(a => `No ${allergenMap[a]}`);
    setModifierPopup({ item: cartItem, selected: autoMods, note: '', qty: 1 });
  };
  // Re-open the popup for an existing cart line, pre-filled with its current selections
  const editCartLine = (line) => {
    const { id, name, quantity, baseId, baseName, modifiers = [], note = '', ...rest } = line;
    const base = { ...rest, id: baseId ?? id, name: baseName ?? name };
    setModifierPopup({ item: base, selected: modifiers, note, qty: quantity, editingId: id });
  };
  const toggleModifier = (mod) => setModifierPopup(p => ({ ...p, selected: p.selected.includes(mod) ? p.selected.filter(m => m !== mod) : [...p.selected, mod] }));
  const confirmModifiers = () => {
    if (!modifierPopup) return;
    const { item, selected, note, qty, editingId } = modifierPopup;
    const trimmed = note.trim();
    const extras = [...selected, ...(trimmed ? [trimmed] : [])];
    const suffix = extras.length ? ` (${extras.join(', ')})` : '';
    const idSuffix = extras.length ? `|${extras.join('|')}` : '';
    const line = { ...item, baseId: item.id, baseName: item.name, modifiers: selected, note: trimmed, id: `${item.id}${idSuffix}`, name: `${item.name}${suffix}` };
    if (editingId) removeFromCart(editingId);
    addToCart(line, qty);
    setModifierPopup(null);
  };

  const openOptionsPopup = (item) => {
    setOptionsPopup({ item, showSauces: false });
  };

  const addWithOption = (option) => {
    if (!optionsPopup) return;
    if (option === 'Other') {
      setOptionsPopup(prev => ({ ...prev, showSauces: true }));
      return;
    }
    const { item } = optionsPopup;
    // options are plain strings (wing styles) or { name, allergens, removable } (e.g. rice choice)
    const opt = typeof option === 'string' ? { name: option } : option;
    const label = opt.name === 'Plain' ? '' : ` (${opt.name})`;
    const sauce = optionsPopup.showSauces ? buildSection?.items.find(i => i.name === opt.name) : null;
    const { options, skipModifiers, ...base } = item;
    const cartItem = { ...base, id: `${item.id}_${opt.name}`, name: `${item.name}${label}`, allergens: mergeAllergens(item, sauce, opt), removable: mergeField('removable', item, sauce, opt) };
    setOptionsPopup(null);
    if (skipModifiers) addToCart({ ...cartItem, baseId: cartItem.id, baseName: cartItem.name });
    else openModifiers(cartItem);
  };

  // Build Your Own handlers
  const openBuildPopup = (sauceItem) => {
    setBuildPopup({ sauceItem, size: null, protein: null, section: buildSection });
  };
  const confirmBuild = () => {
    if (!buildPopup) return;
    const { sauceItem, size, protein, section } = buildPopup;
    if (!size && !protein) return;
    let price, label, cartId, allergens = sauceItem.allergens || [], removable = sauceItem.removable || [];
    if (size) {
      price = section.sizes[size];
      const cap = size.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
      label = `${sauceItem.name} (${cap})`;
      cartId = `${sauceItem.id}_${size}`;
    } else {
      price = protein.price;
      label = `${protein.name} in ${sauceItem.name}`;
      cartId = `${sauceItem.id}_${protein.name}`;
      allergens = mergeAllergens(sauceItem, protein);
      removable = mergeField('removable', sauceItem, protein);
    }
    setBuildPopup(null);
    openModifiers({ id: cartId, name: label, price, allergens, removable });
  };

  // Drink options handler
  const openDrinkPopup = (item) => setDrinkPopup(item);
  const addDrink = (drink) => {
    const label = `${drinkPopup.drinkPrefix}${drink}`;
    addToCart({ id: `${drinkPopup.id}_${drink}`, name: label, price: drinkPopup.price, allergens: [] });
    setDrinkPopup(null);
  };

  // Protein options handler (Chef's Special)
  const openProteinPopup = (item) => setProteinPopup(item);
  const addProteinChoice = (protein) => {
    const label = `${protein.name} in ${proteinPopup.name}`;
    const cartItem = { id: `${proteinPopup.id}_${protein.name}`, name: label, price: protein.price, allergens: mergeAllergens(proteinPopup, protein), removable: mergeField('removable', proteinPopup, protein) };
    setProteinPopup(null);
    openModifiers(cartItem);
  };

  const needsAddress = form.orderType === 'delivery' && !form.address.trim();
  const canSubmit = form.customerName && form.phone && !needsAddress && cart.length > 0;

  const submitOrder = async () => {
    if (!canSubmit) return;
    setOrderError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: cart.map(({ id, name, quantity }) => ({ id, name, quantity })),
        }),
      });
      if (res.ok) {
        setOrderSuccess(true);
        setCart([]);
        setForm({ customerName: '', phone: '', address: '', notes: '', orderType: 'collection' });
        setTimeout(() => setOrderSuccess(false), 3000);
      } else {
        const body = await res.json().catch(() => ({}));
        setOrderError(body.error || `Order failed (${res.status})`);
      }
    } catch (err) { console.error(err); setOrderError('Could not reach the server'); }
  };

  if (!menu) {
    return <div className="flex items-center justify-center py-32"><div className="text-stone-500 text-lg">Loading menu...</div></div>;
  }


  return (
    <div className="bg-stone-900 overflow-hidden" style={{ height: 'calc(100vh - 5rem)' }}>
      <div className="max-w-[1600px] mx-auto px-4 py-4 h-full">
        <div className="flex gap-6 h-full">

          {/* ===== LEFT SIDEBAR: Categories ===== */}
          <div className="w-[180px] lg:w-[200px] flex-shrink-0">
            <div className="h-full flex flex-col">
              {/* Scrollable categories */}
              <nav className="flex-1 overflow-y-auto scrollbar-hide space-y-1 min-h-0">
                {menu.sections.map(section => (
                  <button
                    key={section.name}
                    onClick={() => scrollToSection(section.name)}
                    className={`w-full text-left px-3 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all ${
                      activeSection === section.name
                        ? 'bg-amber-500 text-stone-900'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800'
                    }`}
                  >
                    {section.name}
                  </button>
                ))}
              </nav>

              {/* Pinned bottom: counter + quick-add */}
              <div className="flex-shrink-0 border-t border-stone-800 pt-3 mt-2">
                {/* Main course counter */}
                <div className="mx-2 bg-stone-800 border border-stone-700 rounded-lg p-3 mb-3">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Main Courses</p>
                  <p className="text-2xl font-bold text-amber-500">{mainCourseCount}</p>
                  <p className="text-[10px] text-stone-600">in order</p>
                </div>

                {/* Quick-add sides */}
                <div className="px-2">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Quick Add Sides</p>
                  <div className="space-y-1.5">
                    {quickAddItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => item.options?.length ? openOptionsPopup(item) : addToCart(item)}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-stone-800 border border-stone-700 hover:border-stone-600 hover:bg-stone-750 transition-all group text-left"
                      >
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate">{item.name}</p>
                          <p className="text-amber-500 text-[10px] font-bold">{currency}{item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {cartMap[item.id] > 0 && (
                            <span className="text-[10px] font-bold bg-amber-500 text-stone-900 rounded-full w-5 h-5 flex items-center justify-center">{cartMap[item.id]}</span>
                          )}
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 group-hover:bg-amber-500 group-hover:text-stone-900 transition-all flex items-center justify-center">
                            <Plus size={12} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== CENTRE: Menu Items ===== */}
          <div ref={centreRef} className="flex-1 min-w-0 overflow-y-auto scrollbar-hide">
            {/* Allergen filter bar */}
            <div className="sticky top-0 z-10 bg-stone-900/95 backdrop-blur-sm pb-3 mb-4 border-b border-stone-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] font-bold text-stone-500 uppercase tracking-widest mr-1">
                  <AlertTriangle size={12} /> Avoid
                </span>
                {Object.entries(allergenMap).map(([idStr, name]) => {
                  const aid = Number(idStr);
                  const on = filters.includes(aid);
                  return (
                    <button
                      key={aid}
                      onClick={() => toggleFilter(aid)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                        on ? 'bg-red-500 text-white border-red-500' : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-500'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
                {filters.length > 0 && (
                  <button onClick={() => setFilters([])} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-stone-400 hover:text-white border border-transparent hover:border-stone-600">
                    <X size={12} /> Clear
                  </button>
                )}
              </div>
              {filters.length > 0 && (
                <div className="flex gap-4 mt-2 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-red-500/60 bg-red-950/40" /> Contains — not available</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-amber-500/60 bg-amber-900/30" /> Can be made without — check with kitchen</span>
                </div>
              )}
            </div>


            {/* Menu sections */}
            <div>
              {menu.sections.map((section, sectionIdx) => (
                <div key={section.name}>
                  <div ref={el => { if (el) sectionRefs.current.set(section.name, el); }} className="pt-2">
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-3">{section.name}</h2>
                    {section.subsections ? (
                      <div className="space-y-6">
                        {section.subsections.map(sub => (
                          <div key={sub.name}>
                            <h3 className="text-amber-500 uppercase tracking-widest text-[10px] font-bold mb-2 pl-1">{sub.name}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                              {sub.items.map(item => (
                                <ItemRow key={item.id} item={item} allergenMap={allergenMap} currency={currency} onAdd={openModifiers} onAddWithOptions={openOptionsPopup} onBuildYourOwn={openBuildPopup} onDrinkOptions={openDrinkPopup} onProteinOptions={openProteinPopup} onInfo={setInfoPopup} cartQty={cartMap[item.id] || 0} filters={filters} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {(section.items || []).filter(item => !(section.name === 'Side Orders' && quickAddNames.includes(item.name))).map(item => (
                          <ItemRow key={item.id} item={item} allergenMap={allergenMap} currency={currency} onAdd={openModifiers} onAddWithOptions={openOptionsPopup} onBuildYourOwn={openBuildPopup} onDrinkOptions={openDrinkPopup} onProteinOptions={openProteinPopup} onInfo={setInfoPopup} cartQty={cartMap[item.id] || 0} filters={filters} />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Separator line between categories */}
                  {sectionIdx < menu.sections.length - 1 && (
                    <div className="border-t border-stone-700 my-8" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ===== RIGHT: Order Panel ===== */}
          <div className="hidden lg:block w-[320px] flex-shrink-0">
            <div className="h-full">
              <div className="bg-stone-800 border border-stone-700 rounded-lg overflow-hidden h-full flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b border-stone-700 bg-stone-800/80">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShoppingCart size={16} className="text-amber-500" />
                    New Order
                    {cartCount > 0 && <span className="text-[10px] bg-amber-500 text-stone-900 rounded-full px-1.5 py-0.5">{cartCount}</span>}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {orderSuccess ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <CheckCircle size={48} className="text-green-500 mb-3" />
                      <h3 className="text-lg font-bold text-white mb-1">Order Placed!</h3>
                      <p className="text-stone-400 text-sm">Sent to kitchen successfully.</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {/* Customer Info */}
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] mb-1 text-stone-500 uppercase tracking-wider font-bold">Name *</label>
                          <input
                            type="text" value={form.customerName}
                            onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                            className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Customer name"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] mb-1 text-stone-500 uppercase tracking-wider font-bold">Phone *</label>
                          <input
                            type="tel" value={form.phone}
                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                            className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Phone number"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] mb-1 text-stone-500 uppercase tracking-wider font-bold">Address{form.orderType === 'delivery' && ' *'}</label>
                          <input
                            type="text" value={form.address}
                            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                            className={`w-full px-3 py-2 bg-stone-900 border rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 ${needsAddress ? 'border-red-500/60' : 'border-stone-700'}`}
                            placeholder={form.orderType === 'delivery' ? 'Delivery address (required)' : 'Delivery address'}
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setForm(f => ({ ...f, orderType: 'collection' }))}
                            className={`flex-1 py-1.5 rounded text-xs font-bold uppercase tracking-wide border transition-colors ${
                              form.orderType === 'collection' ? 'bg-amber-500 text-stone-900 border-amber-500' : 'bg-stone-900 text-white border-stone-700 hover:bg-stone-700'
                            }`}
                          >Collection</button>
                          <button
                            onClick={() => setForm(f => ({ ...f, orderType: 'delivery' }))}
                            className={`flex-1 py-1.5 rounded text-xs font-bold uppercase tracking-wide border transition-colors ${
                              form.orderType === 'delivery' ? 'bg-amber-500 text-stone-900 border-amber-500' : 'bg-stone-900 text-white border-stone-700 hover:bg-stone-700'
                            }`}
                          >Delivery</button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-stone-700" />

                      {/* Cart Items */}
                      {cart.length === 0 ? (
                        <p className="text-center text-stone-600 py-6 text-sm">Add items from the menu</p>
                      ) : (
                        <div className="space-y-1.5">
                          {cart.map(item => (
                            <div key={item.id} className="flex items-center gap-2 bg-stone-900 rounded p-2 border border-stone-700 hover:border-stone-500 transition-colors">
                              <button onClick={() => editCartLine(item)} title="Edit item" className="flex-1 min-w-0 text-left group/edit">
                                <p className="font-medium text-white text-sm leading-tight flex items-start gap-1.5">
                                  <span className="flex-1">{item.baseName ?? item.name}</span>
                                  <Pencil size={12} className="flex-shrink-0 mt-0.5 text-stone-600 group-hover/edit:text-amber-400" />
                                </p>
                                {(item.modifiers?.length > 0 || item.note) && (
                                  <p className="text-amber-300/80 text-xs mt-0.5">{[...(item.modifiers || []), ...(item.note ? [item.note] : [])].join(', ')}</p>
                                )}
                                <p className="text-amber-500 text-xs font-semibold mt-0.5">{currency}{(item.price * item.quantity).toFixed(2)}</p>
                              </button>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded bg-stone-700 hover:bg-stone-600 text-white flex items-center justify-center">
                                  <Minus size={12} />
                                </button>
                                <span className="text-xs font-bold w-4 text-center text-white">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded bg-stone-700 hover:bg-stone-600 text-white flex items-center justify-center">
                                  <Plus size={12} />
                                </button>
                                <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded text-red-500 hover:bg-red-500/10 flex items-center justify-center ml-0.5">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {cart.length > 0 && (
                        <textarea
                          value={form.notes}
                          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                          className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                          rows={2}
                          placeholder="Order notes..."
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Footer with total + submit */}
                {cart.length > 0 && !orderSuccess && (
                  <div className="border-t border-stone-700 p-4 space-y-2 bg-stone-800/80">
                    <div className="flex justify-between font-bold">
                      <span className="text-white">Total</span>
                      <span className="text-amber-500 text-lg">{currency}{cartTotal.toFixed(2)}</span>
                    </div>
                    {needsAddress && <p className="text-red-400 text-xs">Delivery orders need an address</p>}
                    {orderError && <p className="text-red-400 text-xs">{orderError}</p>}
                    <button
                      onClick={submitOrder}
                      disabled={!canSubmit}
                      className="w-full bg-green-600 hover:bg-green-500 disabled:bg-stone-700 disabled:text-stone-500 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded transition-colors flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
                    >
                      <Send size={14} /> Place Order
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile: floating cart summary (only shown on small screens) */}
      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-stone-800 border-t border-stone-700 p-3 z-50">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="text-white text-sm">
              <span className="font-bold">{cartCount}</span> items — <span className="text-amber-500 font-bold">{currency}{cartTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={submitOrder}
              disabled={!canSubmit}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500 text-stone-900 font-bold px-4 py-2 rounded text-xs uppercase tracking-wide"
            >
              Place Order
            </button>
          </div>
        </div>
      )}

      {/* Options popup modal */}
      {optionsPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOptionsPopup(null)}>
          <div className="bg-stone-800 border border-stone-700 rounded-xl w-[340px] max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700">
              <h3 className="text-white font-bold text-sm">{optionsPopup.item.name}</h3>
              <button onClick={() => setOptionsPopup(null)} className="text-stone-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <AllergenBadges allergens={optionsPopup.item.allergens} allergenMap={allergenMap} activeFilters={filters} className="mb-3" />
              <p className="text-stone-400 text-xs mb-3 uppercase tracking-wider font-bold">
                {optionsPopup.showSauces ? 'Choose a sauce' : 'Choose a style'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {optionsPopup.showSauces ? (
                  chefSauces.map(sauce => (
                    <button
                      key={sauce}
                      onClick={() => addWithOption(sauce)}
                      className="px-3 py-2.5 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs font-medium hover:border-amber-500 hover:bg-amber-500/10 transition-all text-left"
                    >
                      {sauce}
                    </button>
                  ))
                ) : (
                  optionsPopup.item.options.map(opt => {
                    const o = typeof opt === 'string' ? { name: opt } : opt;
                    const unsafe = allergenStatus(o, filters) === 'unsafe';
                    return (
                      <button
                        key={o.name}
                        onClick={() => addWithOption(opt)}
                        className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                          unsafe ? 'bg-red-950/40 border-red-500/60 text-red-300 opacity-60' : 'bg-stone-900 border-stone-700 text-white hover:border-amber-500 hover:bg-amber-500/10'
                        }`}
                      >
                        {o.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Build Your Own popup modal */}
      {buildPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setBuildPopup(null)}>
          <div className="bg-stone-800 border border-stone-700 rounded-xl w-[480px] max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700">
              <h3 className="text-white font-bold text-sm">{buildPopup.sauceItem.name}</h3>
              <button onClick={() => setBuildPopup(null)} className="text-stone-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <AllergenBadges allergens={buildPopup.protein ? mergeAllergens(buildPopup.sauceItem, buildPopup.protein) : buildPopup.sauceItem.allergens} allergenMap={allergenMap} activeFilters={filters} />
              <div className="flex gap-4">
                {/* Sauce only sizes */}
                <div className="flex-1">
                  <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider font-bold">Sauce Only</p>
                  <div className="space-y-1.5">
                    {Object.entries(buildPopup.section.sizes).map(([size, price]) => (
                      <button
                        key={size}
                        onClick={() => setBuildPopup(prev => ({ ...prev, size, protein: null }))}
                        className={`w-full px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left flex justify-between items-center ${
                          buildPopup.size === size && !buildPopup.protein
                            ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                            : 'border-stone-700 bg-stone-900 text-white hover:border-amber-500 hover:bg-amber-500/10'
                        }`}
                      >
                        <span className="font-bold capitalize">{size.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-stone-400">{currency}{price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="flex flex-col items-center gap-2 pt-7">
                  <div className="w-px flex-1 bg-stone-700" />
                  <span className="text-stone-600 text-[10px] font-bold uppercase">or</span>
                  <div className="w-px flex-1 bg-stone-700" />
                </div>

                {/* Main dish with protein */}
                <div className="flex-1">
                  <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider font-bold">Main Dish</p>
                  <div className="space-y-1.5">
                    {buildPopup.section.proteins.map(p => (
                      <button
                        key={p.name}
                        onClick={() => setBuildPopup(prev => ({ ...prev, protein: p, size: null }))}
                        className={`w-full px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left flex justify-between items-center ${
                          buildPopup.protein?.name === p.name && !buildPopup.size
                            ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                            : allergenStatus(p, filters) === 'unsafe'
                              ? 'border-red-500/60 bg-red-950/40 text-red-300 opacity-60'
                              : 'border-stone-700 bg-stone-900 text-white hover:border-amber-500 hover:bg-amber-500/10'
                        }`}
                      >
                        <span>{p.name}</span>
                        <span className="text-stone-400">{currency}{p.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={confirmBuild}
                disabled={!buildPopup.size && !buildPopup.protein}
                className="w-full py-2.5 rounded-lg bg-amber-500 text-stone-900 font-bold text-xs uppercase tracking-wide hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
              >
                Add to Order
                {buildPopup.size && !buildPopup.protein ? ` — ${currency}${buildPopup.section.sizes[buildPopup.size].toFixed(2)}` : ''}
                {buildPopup.protein && !buildPopup.size ? ` — ${currency}${buildPopup.protein.price.toFixed(2)}` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protein options popup modal */}
      {proteinPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setProteinPopup(null)}>
          <div className="bg-stone-800 border border-stone-700 rounded-xl w-[360px] max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700">
              <h3 className="text-white font-bold text-sm">{proteinPopup.name}</h3>
              <button onClick={() => setProteinPopup(null)} className="text-stone-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <AllergenBadges allergens={proteinPopup.allergens} allergenMap={allergenMap} activeFilters={filters} className="mb-3" />
              <p className="text-stone-400 text-xs mb-3 uppercase tracking-wider font-bold">Choose a protein</p>
              <div className="space-y-2">
                {proteinPopup.proteinOptions.map(protein => (
                  <button
                    key={protein.name}
                    onClick={() => addProteinChoice(protein)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left flex justify-between items-center ${
                      allergenStatus(protein, filters) === 'unsafe'
                        ? 'bg-red-950/40 border-red-500/60 text-red-300 opacity-60'
                        : 'bg-stone-900 border-stone-700 text-white hover:border-amber-500 hover:bg-amber-500/10'
                    }`}
                  >
                    <span>{protein.name}</span>
                    <span className="text-stone-400">{currency}{protein.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drink options popup */}
      {drinkPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDrinkPopup(null)}>
          <div className="bg-stone-800 border border-stone-700 rounded-xl w-[340px] max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700">
              <h3 className="text-white font-bold text-sm">{drinkPopup.name} — {currency}{drinkPopup.price.toFixed(2)}</h3>
              <button onClick={() => setDrinkPopup(null)} className="text-stone-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-stone-400 text-xs mb-3 uppercase tracking-wider font-bold">Choose a drink</p>
              <div className="grid grid-cols-2 gap-2">
                {drinkPopup.drinkOptions.map(drink => (
                  <button
                    key={drink}
                    onClick={() => addDrink(drink)}
                    className="px-3 py-2.5 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs font-medium hover:border-amber-500 hover:bg-amber-500/10 transition-all text-left"
                  >
                    {drink}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modifier popup — final step before anything is added to the order */}
      {modifierPopup && (() => {
        const { item, selected, note, qty } = modifierPopup;
        const unsafeHits = (item.allergens || []).filter(a => filters.includes(a) && !(item.removable || []).includes(a));
        const autoMods = (item.allergens || []).filter(a => (item.removable || []).includes(a)).map(a => `No ${allergenMap[a]}`);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModifierPopup(null)}>
            <div className="bg-stone-800 border border-stone-700 rounded-xl w-[420px] max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700">
                <h3 className="text-white font-bold text-base">{item.name} <span className="text-amber-500 ml-1">{currency}{item.price.toFixed(2)}</span></h3>
                <button onClick={() => setModifierPopup(null)} className="text-stone-500 hover:text-white transition-colors"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-4">
                <AllergenBadges allergens={item.allergens} allergenMap={allergenMap} activeFilters={filters} />
                {unsafeHits.length > 0 && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-xs">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>Contains <b>{unsafeHits.map(a => allergenMap[a]).join(', ')}</b> — cannot be made without.</span>
                  </div>
                )}
                {autoMods.length > 0 && (
                  <div>
                    <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider font-bold">Allergen requests</p>
                    <div className="flex flex-wrap gap-2">
                      {autoMods.map(mod => {
                        const on = selected.includes(mod);
                        return (
                          <button key={mod} onClick={() => toggleModifier(mod)} className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${on ? 'bg-amber-500 text-stone-900 border-amber-500' : 'bg-stone-900 text-white border-amber-500/50 hover:bg-amber-500/10'}`}>{mod}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider font-bold">Modifications</p>
                  <div className="flex flex-wrap gap-2">
                    {modifierOptions.map(mod => {
                      const on = selected.includes(mod);
                      return (
                        <button key={mod} onClick={() => toggleModifier(mod)} className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${on ? 'bg-amber-500 text-stone-900 border-amber-500' : 'bg-stone-900 text-white border-stone-700 hover:border-amber-500 hover:bg-amber-500/10'}`}>{mod}</button>
                      );
                    })}
                  </div>
                </div>
                <input
                  type="text" value={note}
                  onChange={e => setModifierPopup(p => ({ ...p, note: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') confirmModifiers(); }}
                  autoFocus
                  placeholder="Other request for this item..."
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-stone-900 border border-stone-700 rounded-lg p-1">
                    <button onClick={() => setModifierPopup(p => ({ ...p, qty: Math.max(1, p.qty - 1) }))} className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-white flex items-center justify-center"><Minus size={14} /></button>
                    <span className="w-8 text-center text-white font-bold">{qty}</span>
                    <button onClick={() => setModifierPopup(p => ({ ...p, qty: p.qty + 1 }))} className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-white flex items-center justify-center"><Plus size={14} /></button>
                  </div>
                  <button onClick={confirmModifiers} className="flex-1 py-2.5 rounded-lg bg-amber-500 text-stone-900 font-bold text-sm uppercase tracking-wide hover:bg-amber-400 transition-colors">
                    {modifierPopup.editingId ? "Update" : "Add to Order"} — {currency}{(item.price * qty).toFixed(2)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Allergen info popup */}
      {infoPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setInfoPopup(null)}>
          <div className="bg-stone-800 border border-stone-700 rounded-xl w-[360px] max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700">
              <h3 className="text-white font-bold text-sm">{infoPopup.name}</h3>
              <button onClick={() => setInfoPopup(null)} className="text-stone-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider font-bold">Contains</p>
                <AllergenBadges allergens={infoPopup.allergens} allergenMap={allergenMap} activeFilters={filters} />
              </div>
              {infoPopup.removable?.length > 0 && (
                <div>
                  <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider font-bold">Can be left out on request</p>
                  <AllergenBadges allergens={infoPopup.removable} allergenMap={allergenMap} />
                </div>
              )}
              {infoPopup.proteinOptions?.length > 0 && (
                <div>
                  <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider font-bold">Protein choices</p>
                  <div className="space-y-1.5">
                    {infoPopup.proteinOptions.map(p => (
                      <div key={p.name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-white">{p.name}</span>
                        <AllergenBadges allergens={p.allergens} allergenMap={allergenMap} activeFilters={filters} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-stone-500 text-[11px] pt-2 border-t border-stone-700">Always confirm severe allergies with the kitchen. All dishes are prepared in a kitchen that handles every listed allergen.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
