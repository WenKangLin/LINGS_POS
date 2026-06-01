import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Send, CheckCircle, Leaf, X } from 'lucide-react';

function AllergenBadges({ allergens, allergenMap }) {
  if (!allergens || allergens.length === 0) return null;
  return (
    <div className="flex gap-1 mt-2 overflow-x-auto scrollbar-hide">
      {allergens.map(a => (
        <span key={a} title={allergenMap[a]} className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded cursor-help whitespace-nowrap flex-shrink-0">
          {allergenMap[a]}
        </span>
      ))}
    </div>
  );
}

function ItemRow({ item, allergenMap, currency, onAdd, onAddWithOptions, onBuildYourOwn, onDrinkOptions, onProteinOptions, cartQty }) {
  const isGlutenFree = !item.allergens?.includes(1);
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
    <div className="bg-stone-800 px-4 py-3 rounded-lg border border-stone-700 hover:border-stone-600 transition-all group cursor-pointer" onClick={handleAdd}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-medium tracking-wide text-sm">{item.name}</p>
            {item.vegetarian && (
              <span title="Vegetarian" className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-bold">
                <Leaf className="w-2.5 h-2.5" /> VG
              </span>
            )}
            {isGlutenFree && (
              <span title="Gluten Free" className="px-1 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[10px] font-bold">GF</span>
            )}
          </div>
          {item.description && <p className="text-stone-500 text-xs mt-0.5">{item.description}</p>}
          <AllergenBadges allergens={item.allergens} allergenMap={allergenMap} />
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          {item.price != null && <span className="text-amber-500 font-bold text-xs whitespace-nowrap">{currency}{item.price.toFixed(2)}</span>}
          <div className="flex items-center gap-1">
            {cartQty > 0 && (
              <span className="text-[10px] font-bold bg-amber-500 text-stone-900 rounded-full w-5 h-5 flex items-center justify-center">{cartQty}</span>
            )}
            <button
              onClick={e => { e.stopPropagation(); handleAdd(); }}
              className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-stone-900 transition-all flex items-center justify-center opacity-70 group-hover:opacity-100"
            >
              <Plus size={14} />
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
  const [form, setForm] = useState({ customerName: '', phone: '', address: '', notes: '', orderType: 'collection' });
  const [optionsPopup, setOptionsPopup] = useState(null); // { item, showSauces: false }
  const [buildPopup, setBuildPopup] = useState(null); // { sauceItem, size: null, protein: null, section }
  const [drinkPopup, setDrinkPopup] = useState(null); // { item }
  const [proteinPopup, setProteinPopup] = useState(null); // { item with proteinOptions }
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

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(i => (i.id === id ? { ...i, quantity: i.quantity + delta } : i)).filter(i => i.quantity > 0));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const currency = menu?.currency || '€';
  const cartMap = Object.fromEntries(cart.map(i => [i.id, i.quantity]));

  // Main course sections that need the counter
  const mainCourseSections = ["Chef's Special Dishes", "Sweet & Sour Dishes"];

  // Collect all item IDs from main course sections
  const mainCourseIds = new Set();
  if (menu) {
    menu.sections.filter(s => mainCourseSections.includes(s.name)).forEach(s => {
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
    if (mainCourseIds.has(i.id)) return true;
    // Check if this is a Build Your Own protein item (not a sauce-only size)
    const idStr = String(i.id);
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

  // Collect sauce names from Chef's Special subsections for the "Other" option
  const chefSauces = [];
  if (menu) {
    const chefSection = menu.sections.find(s => s.name === "Chef's Special Dishes");
    if (chefSection?.subsections) {
      chefSection.subsections.forEach(sub => {
        if (sub.name !== 'Pork Dishes') chefSauces.push(sub.name);
      });
    }
  }

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
    const label = option === 'Plain' ? '' : ` (${option})`;
    const cartItem = { ...item, id: `${item.id}_${option}`, name: `${item.name}${label}` };
    addToCart(cartItem);
    setOptionsPopup(null);
  };

  // Build Your Own handlers
  const buildSection = menu?.sections.find(s => s.buildYourOwn);
  const openBuildPopup = (sauceItem) => {
    setBuildPopup({ sauceItem, size: null, protein: null, section: buildSection });
  };
  const confirmBuild = () => {
    if (!buildPopup) return;
    const { sauceItem, size, protein, section } = buildPopup;
    if (!size && !protein) return;
    let price, label, cartId;
    if (size) {
      price = section.sizes[size];
      const cap = size.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
      label = `${sauceItem.name} (${cap})`;
      cartId = `${sauceItem.id}_${size}`;
    } else {
      price = protein.price;
      label = `${protein.name} in ${sauceItem.name}`;
      cartId = `${sauceItem.id}_${protein.name}`;
    }
    addToCart({ id: cartId, name: label, price, allergens: sauceItem.allergens });
    setBuildPopup(null);
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
    addToCart({ id: `${proteinPopup.id}_${protein.name}`, name: label, price: protein.price, allergens: proteinPopup.allergens });
    setProteinPopup(null);
  };

  const submitOrder = async () => {
    if (!form.customerName || !form.phone || cart.length === 0) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
        }),
      });
      if (res.ok) {
        setOrderSuccess(true);
        setCart([]);
        setForm({ customerName: '', phone: '', address: '', notes: '', orderType: 'collection' });
        setTimeout(() => setOrderSuccess(false), 3000);
      }
    } catch (err) { console.error(err); }
  };

  if (!menu) {
    return <div className="flex items-center justify-center py-32"><div className="text-stone-500 text-lg">Loading menu...</div></div>;
  }

  const allergenMap = menu.allergens || {};

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
                        onClick={() => addToCart(item)}
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
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl mb-3 text-white font-bold tracking-wider">OUR MENU</h1>
              <div className="flex justify-center gap-3 text-xs">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/15 border border-green-500/30 text-green-400 font-bold">
                  <Leaf className="w-3 h-3" /> VG — Vegetarian
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-400 font-bold">
                  GF — Gluten Free
                </span>
              </div>
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
                                <ItemRow key={item.id} item={item} allergenMap={allergenMap} currency={currency} onAdd={addToCart} onAddWithOptions={openOptionsPopup} onBuildYourOwn={openBuildPopup} onDrinkOptions={openDrinkPopup} onProteinOptions={openProteinPopup} cartQty={cartMap[item.id] || 0} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {(section.items || []).filter(item => !(section.name === 'Side Orders' && quickAddNames.includes(item.name))).map(item => (
                          <ItemRow key={item.id} item={item} allergenMap={allergenMap} currency={currency} onAdd={addToCart} onAddWithOptions={openOptionsPopup} onBuildYourOwn={openBuildPopup} onDrinkOptions={openDrinkPopup} onProteinOptions={openProteinPopup} cartQty={cartMap[item.id] || 0} />
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
                          <label className="block text-[10px] mb-1 text-stone-500 uppercase tracking-wider font-bold">Address</label>
                          <input
                            type="text" value={form.address}
                            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                            className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Delivery address"
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
                            <div key={item.id} className="flex items-center gap-2 bg-stone-900 rounded p-2 border border-stone-700">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-xs truncate">{item.name}</p>
                                <p className="text-amber-500 text-xs font-semibold">{currency}{(item.price * item.quantity).toFixed(2)}</p>
                              </div>
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
                    <button
                      onClick={submitOrder}
                      disabled={!form.customerName || !form.phone}
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
              disabled={!form.customerName || !form.phone}
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
                  optionsPopup.item.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => addWithOption(opt)}
                      className="px-3 py-2.5 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs font-medium hover:border-amber-500 hover:bg-amber-500/10 transition-all text-left"
                    >
                      {opt}
                    </button>
                  ))
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
              <p className="text-stone-400 text-xs mb-3 uppercase tracking-wider font-bold">Choose a protein</p>
              <div className="space-y-2">
                {proteinPopup.proteinOptions.map(protein => (
                  <button
                    key={protein.name}
                    onClick={() => addProteinChoice(protein)}
                    className="w-full px-3 py-2.5 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs font-medium hover:border-amber-500 hover:bg-amber-500/10 transition-all text-left flex justify-between items-center"
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
    </div>
  );
}
