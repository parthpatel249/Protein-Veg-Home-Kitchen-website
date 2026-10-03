/* Protein Veg Home Kitchen — shared data + demo store.
   Everything here mirrors the Business Plan (v2). State lives in localStorage so the
   customer app (index.html) and the kitchen console (kitchen.html) stay in sync. */
window.PV = (() => {
  const KEY = 'pvhk_demo_v4';

  /* ---------- dates ---------- */
  const pad = n => String(n).padStart(2, '0');
  const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ds(d); };
  const today = () => ds(new Date());
  const isDeliveryDay = s => pd(s).getDay() !== 0; // Monday to Saturday, no Sunday
  const nextDeliveryDays = (n, from = today()) => {
    const out = []; let s = from;
    while (out.length < n) { if (isDeliveryDay(s)) out.push(s); s = addDays(s, 1); }
    return out;
  };
  const serviceDate = () => nextDeliveryDays(1)[0];
  const fmtDate = (s, opt) => pd(s).toLocaleDateString('en-IN', opt || { weekday: 'short', day: 'numeric', month: 'short' });
  const dayLabel = s => s === today() ? 'Today' : s === addDays(today(), 1) ? 'Tomorrow' : fmtDate(s, { weekday: 'long' });
  const inr = n => (n < 0 ? '−' : '') + '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtMin = m => { const h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}:${pad(mm)}`; };
  const win = ([a, b]) => `${fmtMin(a)}–${fmtMin(b)} ${b >= 720 ? 'PM' : 'AM'}`;

  /* ---------- slots & cut-offs (plan §4, §5) ---------- */
  const SLOTS = {
    breakfast: { label: 'Breakfast', icon: 'sunrise', cutoff: '9:00 PM the day before', range: [435, 555] },
    lunch: { label: 'Lunch', icon: 'sun', cutoff: '9:30 AM same day', range: [705, 825] },
    dinner: { label: 'Dinner', icon: 'moon', cutoff: '4:30 PM same day', range: [1155, 1275] },
  };
  const SLOT_IDS = ['breakfast', 'lunch', 'dinner'];
  const cutoffAt = (date, slot) => {
    const d = pd(slot === 'breakfast' ? addDays(date, -1) : date);
    if (slot === 'breakfast') d.setHours(21, 0, 0, 0);
    else if (slot === 'lunch') d.setHours(9, 30, 0, 0);
    else d.setHours(16, 30, 0, 0);
    return d;
  };
  const isOpen = (date, slot) => isDeliveryDay(date) && new Date() < cutoffAt(date, slot);

  /* ---------- zones (plan §5). Map positions are approximate. ---------- */
  const KITCHEN = { name: 'Home kitchen · Kudasan', ll: [23.1852, 72.6297] };
  const ZONE_BASE = {
    A: { id: 'A', name: 'Zone A', color: '#15803D', open: true, wins: { breakfast: [450, 495], lunch: [720, 765], dinner: [1170, 1215] } },
    B: { id: 'B', name: 'Zone B', color: '#2563EB', open: true, wins: { breakfast: [495, 540], lunch: [765, 810], dinner: [1215, 1260] } },
    C: { id: 'C', name: 'Zone C', color: '#7C3AED', open: false, wins: null },
  };
  const C_SUGGESTED = { breakfast: [540, 585], lunch: [810, 855], dinner: [1260, 1305] };
  const AREAS = [
    { id: 'kudasan', name: 'Kudasan', zone: 'A', ll: [23.1885, 72.6325] },
    { id: 'sargasan', name: 'Sargasan', zone: 'A', ll: [23.1975, 72.6165] },
    { id: 'randesan', name: 'Randesan', zone: 'A', ll: [23.1748, 72.6440] },
    { id: 'raysan', name: 'Raysan', zone: 'B', ll: [23.1640, 72.6560] },
    { id: 'pdeu', name: 'PDEU area', zone: 'B', ll: [23.1545, 72.6668] },
    { id: 'gift', name: 'GIFT City', zone: 'B', ll: [23.1620, 72.6842] },
    { id: 'infocity', name: 'Infocity', zone: 'C', ll: [23.2030, 72.6385] },
    { id: 'sectors', name: 'Gandhinagar Sectors', zone: 'C', ll: [23.2230, 72.6500] },
  ];
  const area = id => AREAS.find(a => a.id === id);
  const WAITLIST_TARGET = 15, RIDER_CAP = 25, ONE_TIME_CAP = 15;

  /* ---------- menu (plan §2). Protein figures are targets until recipes are weighed. ---------- */
  const VARIANTS = {
    protein: { label: 'Protein', min: 30, kcal: '550–650', oneTime: 269, note: 'Larger paneer, soya or tofu portion, full carbs' },
    diet: { label: 'Diet', min: 20, kcal: '400–450', oneTime: 249, note: 'Same dishes, smaller carb portion, less oil' },
  };
  const L = ['lunch', 'dinner'], B = ['breakfast'];
  const DISHES = [
    { id: 'bhurji', day: 1, name: 'Paneer Bhurji Meal', desc: 'Paneer bhurji, 2 multigrain rotis, moong dal, salad', slots: L, p: 32, kcal: 610, dp: 22, dkcal: 440, key: ['Paneer', 110, 75] },
    { id: 'pulao', day: 2, name: 'Soya Chunk Pulao', desc: 'Soya chunk pulao, raita, sprouts salad', slots: L, p: 34, kcal: 600, dp: 23, dkcal: 430, key: ['Soya chunks (dry)', 50, 35] },
    { id: 'rajma', day: 3, name: 'Rajma Brown Rice', desc: 'Rajma, brown rice, paneer tikka bites, salad', slots: L, p: 30, kcal: 640, dp: 21, dkcal: 450, key: ['Rajma (dry)', 60, 45] },
    { id: 'tofu', day: 4, name: 'Tofu Capsicum Quinoa', desc: 'Tofu-capsicum stir fry, quinoa, dal', slots: L, p: 30, kcal: 560, dp: 21, dkcal: 410, key: ['Tofu', 150, 100] },
    { id: 'chole', day: 5, name: 'Chole Chilla Plate', desc: 'Chole, 2 besan-oats chillas, curd', slots: L, p: 31, kcal: 620, dp: 22, dkcal: 440, key: ['Chole (dry)', 60, 45] },
    { id: 'tikka', day: 6, name: 'Paneer Tikka Bowl', desc: 'Paneer tikka bowl, masala soya, 2 rotis', slots: L, p: 35, kcal: 630, dp: 24, dkcal: 450, key: ['Paneer', 120, 80] },
    { id: 'chilla', name: 'Moong Chilla with Paneer', desc: 'Moong-besan chillas stuffed with paneer, mint chutney', slots: B, p: 30, kcal: 560, dp: 21, dkcal: 400, key: ['Moong dal (dry)', 60, 45] },
    { id: 'poha', name: 'Soya Poha Bowl', desc: 'Soya poha, hung-curd and sprouts on the side', slots: B, p: 30, kcal: 570, dp: 20, dkcal: 410, key: ['Soya granules (dry)', 40, 30] },
    { id: 'paratha', planOnly: true, name: 'Paneer Paratha with Curd', desc: 'Paneer paratha, curd', slots: B, p: 31, kcal: 600, dp: 21, dkcal: 430, key: ['Paneer', 90, 60] },
    { id: 'curdbowl', planOnly: true, name: 'Hung-curd Sprouts Bowl', desc: 'Hung curd, moong sprouts, seeds', slots: B, p: 30, kcal: 550, dp: 22, dkcal: 400, key: ['Hung curd', 200, 150] },
  ].map(d => ({ ...d, img: d.planOnly ? null : `assets/img/${d.id}.jpg` }));
  const dish = id => DISHES.find(d => d.id === id);
  const MENU = DISHES.filter(d => !d.planOnly); // the 8 meals on the home page
  const BF_ROTATION = ['chilla', 'poha', 'paratha', 'curdbowl', 'chilla', 'poha'];
  const dishOfDay = (date, slot) => {
    const wd = pd(date).getDay(); // 1..6
    return slot === 'breakfast' ? BF_ROTATION[wd - 1] : DISHES.find(d => d.day === wd).id;
  };
  const macros = (d, v) => v === 'diet' ? { p: d.dp, kcal: d.dkcal } : { p: d.p, kcal: d.kcal };

  /* ---------- plans (plan §3) ---------- */
  const PLANS = [
    { id: 'trial', name: '3-Day Trial', variant: null, days: 3, per: 250, total: 749, pause: 0 },
    { id: 'protein26', name: 'Protein · 26 days', variant: 'protein', days: 26, per: 219, total: 5694, validity: 35, pause: 4 },
    { id: 'protein14', name: 'Protein · 14 days', variant: 'protein', days: 14, per: 249, total: 3486, validity: 20, pause: 2 },
    { id: 'diet26', name: 'Diet · 26 days', variant: 'diet', days: 26, per: 199, total: 5174, validity: 35, pause: 4 },
    { id: 'diet14', name: 'Diet · 14 days', variant: 'diet', days: 14, per: 229, total: 3206, validity: 20, pause: 2 },
  ];
  const plan = id => PLANS.find(p => p.id === id);

  /* ---------- rewards (plan §8) ---------- */
  const TRAINERS = [
    { code: 'FITRAJ', name: 'Raj S.', gym: 'Gym partner · Kudasan' },
    { code: 'COACHMEERA', name: 'Meera D.', gym: 'Gym partner · Raysan' },
  ];
  const FRIEND_CODE = 'FRIEND';
  const codeInfo = (code, p) => {
    if (!code || !p || p.id === 'trial') return null;
    const c = code.trim().toUpperCase();
    if (TRAINERS.some(t => t.code === c)) return { code: c, kind: 'trainer', off: 100, label: `Trainer code ${c}` };
    if (c === FRIEND_CODE) return { code: c, kind: 'friend', off: p.days === 26 ? 200 : 100, label: 'Friend referral' };
    return null;
  };

  /* ---------- unit economics (plan §6, §12) ---------- */
  const ECON = {
    price: 210,
    costs: [
      ['Ingredients', 80], ['Packaging: container, bag, label', 18], ['Gas and electricity', 6], ['Delivery fuel', 6],
      ['Payment gateway (about 2%)', 4], ['Wastage and free replacements', 8], ['Referral and trainer rewards', 5], ['GST reserve (5%)', 10],
    ],
    fixed: [
      ["Cook's helper", 14000], ['Second helper (above ~50 meals/day)', 12000], ['2 delivery riders', 26000],
      ['Marketing: flyers, Instagram, tastings', 10000], ['Website, hosting, WhatsApp tools', 2000], ['Cleaning, repairs, licences', 3000],
    ],
    milestones: [
      { m: 1, meals: 15, fixed: 40000, focus: 'Trials, recipe fixes' }, { m: 2, meals: 30, fixed: 40000, focus: 'Convert trials, website live' },
      { m: 3, meals: 45, fixed: 40000, focus: 'Referrals, trainer network' }, { m: 4, meals: 60, fixed: 67000, focus: 'Second helper, second rider' },
      { m: 5, meals: 75, fixed: 67000, focus: 'Open zone C if ready' }, { m: 6, meals: 90, fixed: 67000, focus: 'Hold steady at target' },
    ],
    breakEven: 35, target: 88,
  };
  ECON.cost = ECON.costs.reduce((a, c) => a + c[1], 0);        // 137
  ECON.profit = ECON.price - ECON.cost;                         // 73
  ECON.fixedTotal = ECON.fixed.reduce((a, c) => a + c[1], 0);   // 67,000
  const SCHEDULE = [
    [330, 435, 'Breakfast cooking, packing and labelling'], [450, 540, 'Breakfast deliveries; lunch prep starts'],
    [540, 675, 'Lunch cooking'], [675, 720, 'Lunch portioning, packing and labelling'], [720, 810, 'Lunch deliveries, zone A then zone B'],
    [990, 1155, 'Dinner prep, cooking and packing'], [1170, 1260, 'Dinner deliveries'],
  ];

  const STATUS = ['placed', 'cooking', 'packed', 'out', 'delivered'];
  const STATUS_LABEL = { placed: 'Confirmed', cooking: 'Cooking', packed: 'Packed', out: 'Out for delivery', delivered: 'Delivered' };

  /* ---------- store ---------- */
  let S = null;
  const listeners = [];
  const blank = () => ({ user: null, cart: {}, variant: 'protein', area: null, address: '', orders: [], subs: [], waitlist: [], status: {}, ratings: {}, coins: 0, coinLog: [], zoneC: null, seeded: [] });
  const load = () => { try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; } if (!S) { S = blank(); seedBase(); } seedDay(serviceDate()); return S; };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode: demo still works in memory */ } listeners.forEach(f => f()); };
  const state = () => S || load();
  const on = f => listeners.push(f);
  window.addEventListener('storage', e => { if (e.key === KEY) { try { S = JSON.parse(e.newValue) || S; } catch (x) { } listeners.forEach(f => f()); } });
  const reset = () => { S = blank(); seedBase(); seedDay(serviceDate()); save(); };
  const uid = p => p + Date.now().toString(36).slice(-5).toUpperCase() + Math.floor(Math.random() * 36).toString(36).toUpperCase();

  /* ---------- demo seed: test subscribers and orders ---------- */
  const NAMES = ['Aarav P.', 'Diya S.', 'Kabir M.', 'Isha T.', 'Vivaan J.', 'Riya D.', 'Arjun B.', 'Meera K.', 'Dhruv C.', 'Anaya R.', 'Yash V.', 'Kavya N.', 'Rohan G.', 'Sneha L.', 'Harsh A.', 'Pooja H.', 'Neel O.', 'Tanvi U.', 'Jay Z.', 'Nidhi F.', 'Parth Q.', 'Krisha W.', 'Manav E.', 'Aditi I.', 'Om Y.', 'Zara X.', 'Dev R.', 'Hetal B.', 'Mihir S.', 'Jiya P.', 'Smit K.', 'Khushi M.', 'Rahul T.', 'Bhumi D.', 'Tirth J.', 'Avni C.'];
  const SOC = ['Green Park Residency', 'Sunrise Heights', 'Lake View Apartments', 'Orchid Greens', 'Maple Homes', 'Skyline PG', 'Tower 2, Office Park'];
  const OPEN_AREAS = ['kudasan', 'raysan', 'sargasan', 'gift', 'pdeu', 'randesan'];
  const phone = i => `98${pad(i * 7 % 100)}•••${pad(i * 13 % 100)}${pad(i * 3 % 100)}`;
  const addr = i => `${'ABCD'[i % 4]}-${101 + (i * 37) % 800}, ${SOC[i % SOC.length]}`;

  function seedBase() {
    const t = today();
    S.subs = NAMES.map((name, i) => {
      const planId = ['protein26', 'diet26', 'protein26', 'protein14', 'diet14', 'protein26', 'diet26', 'trial'][i % 8];
      const p = plan(planId);
      const slot = i % 9 < 5 ? 'lunch' : i % 9 < 7 ? 'dinner' : 'breakfast';
      const back = planId === 'trial' ? i % 3 : p.days === 14 ? (i * 3) % 12 : (i * 7) % 30;
      return {
        id: 'S' + (100 + i), name, phone: phone(i + 3), area: OPEN_AREAS[(i * 5 + (i >> 2)) % 6], address: addr(i), planId,
        variant: p.variant || (i % 2 ? 'diet' : 'protein'), days: p.days, slot, start: nextDeliveryDays(1, addDays(t, -back))[0],
        pauses: i % 13 === 5 ? [serviceDate()] : [], status: 'active', code: i % 6 === 0 ? 'FITRAJ' : i % 11 === 3 ? 'COACHMEERA' : i % 7 === 2 ? FRIEND_CODE : null, paid: p.total,
      };
    });
    S.waitlist = ['Nisha G.', 'Karan P.', 'Ritu S.', 'Jatin M.', 'Foram D.', 'Uday K.', 'Maitri V.', 'Sagar B.', 'Ekta J.'].map((name, i) => ({ name, phone: phone(i + 50), area: i % 3 ? 'sectors' : 'infocity', ts: Date.now() - (i + 1) * 864e5 }));
    S.ratings = { demo1: 5, demo2: 5, demo3: 4, demo4: 5, demo5: 4, demo6: 5, demo7: 3, demo8: 5 };
  }
  // Demo one-time orders for a service day, and "already delivered" marks for runs that are over.
  function seedDay(date) {
    if (S.seeded.includes(date)) return;
    S.seeded.push(date);
    const rows = [['Ankit R.', 'kudasan', 'lunch', [['tikka', 'protein', 1]]], ['Shreya M.', 'gift', 'lunch', [['pulao', 'protein', 2]]], ['Vatsal D.', 'raysan', 'lunch', [['tofu', 'diet', 1]]],
    ['Pinal K.', 'sargasan', 'dinner', [['bhurji', 'protein', 1], ['rajma', 'diet', 1]]], ['Hiren T.', 'pdeu', 'dinner', [['chole', 'protein', 1]]], ['Urvi S.', 'kudasan', 'breakfast', [['chilla', 'protein', 1]]]];
    rows.forEach(([name, a, slot, items], i) => S.orders.push({
      id: `D${date.slice(5).replace('-', '')}${i + 1}`, name, phone: phone(i + 70), area: a, address: addr(i + 40), date, slot,
      items: items.map(([dishId, variant, qty]) => ({ dishId, variant, qty })), total: items.reduce((s, [, v, q]) => s + VARIANTS[v].oneTime * q, 0), method: 'UPI', ts: Date.now(),
    }));
    if (date === today()) {
      const now = new Date().getHours() * 60 + new Date().getMinutes();
      deliveries(date).forEach(d => { if (now > SLOTS[d.slot].range[1]) S.status[d.id] = 'delivered'; });
    }
    save();
  }

  /* ---------- derived ---------- */
  const zone = id => {
    const z = { ...ZONE_BASE[id], areas: AREAS.filter(a => a.zone === id) };
    if (id === 'C' && state().zoneC) { z.open = true; z.wins = state().zoneC; }
    return z;
  };
  const zoneOf = areaId => zone(area(areaId).zone);
  const slotWin = (areaId, slot) => { const z = zoneOf(areaId); return z.wins ? win(z.wins[slot]) : 'To be set'; };

  const subDates = sub => {
    const out = []; let s = sub.start, guard = 0;
    while (out.length < sub.days && guard++ < 90) {
      if (sub.endedOn && s >= sub.endedOn) break;
      if (isDeliveryDay(s) && !sub.pauses.includes(s)) out.push(s);
      s = addDays(s, 1);
    }
    return out;
  };
  const subInfo = sub => {
    const dates = subDates(sub), t = today();
    const done = dates.filter(d => d < t || (d === t && S.status[`${d}:${sub.id}`] === 'delivered')).length;
    return { dates, done, left: dates.length - done, end: dates[dates.length - 1], next: dates.find(d => d >= t && S.status[`${d}:${sub.id}`] !== 'delivered'), active: sub.status === 'active' && dates.length - done > 0 };
  };
  const areaIdx = id => AREAS.findIndex(a => a.id === id);
  function deliveries(date) {
    const st = state(), out = [];
    st.subs.forEach(sub => {
      if (sub.status !== 'active' && !sub.endedOn) return;
      if (!subDates(sub).includes(date)) return;
      const p = plan(sub.planId);
      out.push({ id: `${date}:${sub.id}`, kind: 'plan', ref: sub.id, mine: !!sub.mine, name: sub.name, phone: sub.phone, area: sub.area, zone: area(sub.area).zone, address: sub.address, slot: sub.slot, items: [{ dishId: dishOfDay(date, sub.slot), variant: sub.variant, qty: 1 }], amount: p.per, planName: p.name, date });
    });
    st.orders.filter(o => o.date === date).forEach(o => out.push({ id: o.id, kind: 'order', ref: o.id, mine: !!o.mine, name: o.name, phone: o.phone, area: o.area, zone: area(o.area).zone, address: o.address, slot: o.slot, items: o.items, amount: o.total, planName: 'One-time', date }));
    out.forEach(d => { d.status = st.status[d.id] || 'placed'; d.meals = d.items.reduce((a, i) => a + i.qty, 0); });
    // fixed route order: slot, then zone, then area sequence from the kitchen outward, then address
    out.sort((a, b) => SLOT_IDS.indexOf(a.slot) - SLOT_IDS.indexOf(b.slot) || a.zone.localeCompare(b.zone) || areaIdx(a.area) - areaIdx(b.area) || a.address.localeCompare(b.address));
    const seq = {};
    out.forEach(d => { const k = d.slot + d.zone; d.stop = seq[k] = (seq[k] || 0) + 1; });
    return out;
  }
  const setStatus = (id, s) => { state().status[id] = s; save(); };
  const advance = id => { const cur = state().status[id] || 'placed'; const i = STATUS.indexOf(cur); if (i < STATUS.length - 1) setStatus(id, STATUS[i + 1]); };
  const oneTimeUsed = date => state().orders.filter(o => o.date === date).reduce((a, o) => a + o.items.reduce((x, i) => x + i.qty, 0), 0);
  const oneTimeLeft = date => Math.max(0, ONE_TIME_CAP - oneTimeUsed(date));

  return {
    KEY, SLOTS, SLOT_IDS, KITCHEN, AREAS, VARIANTS, DISHES, MENU, PLANS, TRAINERS, FRIEND_CODE, ECON, SCHEDULE, STATUS, STATUS_LABEL, WAITLIST_TARGET, RIDER_CAP, ONE_TIME_CAP, C_SUGGESTED,
    ds, pd, addDays, today, isDeliveryDay, nextDeliveryDays, serviceDate, fmtDate, dayLabel, inr, esc, win, fmtMin, cutoffAt, isOpen,
    area, zone, zoneOf, slotWin, dish, dishOfDay, macros, plan, codeInfo, state, save, on, reset, uid,
    subDates, subInfo, deliveries, setStatus, advance, oneTimeUsed, oneTimeLeft,
  };
})();
