/* Customer app — hash-routed single page. All data and rules come from js/data.js. */
(() => {
  const { SLOTS, SLOT_IDS, AREAS, VARIANTS, MENU, PLANS, ECON, STATUS, STATUS_LABEL, inr, esc, today, addDays, fmtDate, dayLabel } = PV;
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app'), sheetEl = $('#sheet'), toastEl = $('#toast');
  let S = PV.state();
  let flow = null;                       // active checkout: { type:'order'|'plan', step, ... }
  const ui = { filter: 'all', mapMeal: 'lunch', auth: { sent: false, phone: '' }, planVariant: 'protein' };
  const ic = (n, cls = '') => `<i data-lucide="${n}" class="${cls}" aria-hidden="true"></i>`;

  /* ---------- helpers ---------- */
  const cartLines = () => Object.entries(S.cart).map(([k, qty]) => { const [id, variant] = k.split('|'); return { key: k, dish: PV.dish(id), variant, qty, price: VARIANTS[variant].oneTime }; });
  const cartCount = () => cartLines().reduce((a, l) => a + l.qty, 0);
  const cartTotal = () => cartLines().reduce((a, l) => a + l.qty * l.price, 0);
  const cartKind = () => { const l = cartLines()[0]; return l ? (l.dish.slots[0] === 'breakfast' ? 'breakfast' : 'main') : null; };
  const myOrders = () => S.orders.filter(o => o.mine);
  const mySubs = () => S.subs.filter(s => s.mine);
  const hadTrial = () => mySubs().some(s => s.planId === 'trial');
  const auto150 = p => p.days === 26 && (mySubs().some(s => s.planId === 'trial' && s.start >= addDays(today(), -14)) || myOrders().length >= 3);
  const toast = msg => { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.hidden = true, 2600); };
  const go = h => { if (location.hash === h) render(); else location.hash = h; };
  const openSheet = html => { sheetEl.innerHTML = `<div class="scrim" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`; sheetEl.hidden = false; icons(); const f = $('input,button.btn', sheetEl); if (f) f.focus({ preventScroll: true }); };
  const closeSheet = () => { sheetEl.hidden = true; sheetEl.innerHTML = ''; };
  const icons = () => window.lucide && lucide.createIcons();
  const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : null; };

  /* ---------- shared pieces ---------- */
  const nav = p => `<nav class="tabbar" aria-label="Main">${[['home', 'house', 'Home'], ['plans', 'calendar-check', 'Plans'], ['zones', 'map', 'Zones'], ['orders', 'receipt', 'Orders'], ['account', 'user', 'Account']]
    .map(([id, i, l]) => `<a href="#/${id}" class="${p === id ? 'on' : ''}" ${p === id ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></a>`).join('')}</nav>`;
  const cartBar = () => cartCount() ? `<a class="cartbar" href="#/cart"><span><b>${cartCount()} meal${cartCount() > 1 ? 's' : ''}</b> · ${inr(cartTotal())}</span><span>View cart ${ic('arrow-right')}</span></a>` : '';
  const head = (title, back, sub = '') => `<header class="bar"><a class="iconbtn" href="${back}" aria-label="Back">${ic('arrow-left')}</a><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div></header>`;
  const seg = (name, opts, cur) => `<div class="seg" role="tablist">${opts.map(([v, l]) => `<button role="tab" aria-selected="${v === cur}" class="${v === cur ? 'on' : ''}" data-act="${name}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const stepper = (key, qty) => `<div class="stepper"><button data-act="dec" data-k="${key}" aria-label="Remove one">${ic('minus')}</button><b>${qty}</b><button data-act="inc" data-k="${key}" aria-label="Add one">${ic('plus')}</button></div>`;

  /* ---------- HOME ---------- */
  function home() {
    const a = S.area && PV.area(S.area), z = a && PV.zoneOf(a.id), v = S.variant;
    const sd = PV.serviceDate();
    const list = MENU.filter(d => ui.filter === 'all' || (ui.filter === 'breakfast' ? d.slots[0] === 'breakfast' : d.slots[0] !== 'breakfast'));
    const left = PV.oneTimeLeft(sd);
    const nudge = myOrders().length >= 3 && !mySubs().length;
    return `
    <header class="top">
      <button class="loc" data-act="pickArea">${ic('map-pin')}<span><b>${a ? esc(a.name) : 'Choose your area'} ${ic('chevron-down')}</b>
        <small>${a ? (z.open ? `${z.name} · Lunch ${PV.slotWin(a.id, 'lunch')}` : `${z.name} · Waitlist open`) : 'Gandhinagar only · area-wise slots'}</small></span></button>
      <a class="avatar" href="#/account" aria-label="Account">${S.user ? esc(S.user.name[0].toUpperCase()) : ic('user')}</a>
    </header>
    <section class="hero">
      <img src="assets/img/hero.jpg" alt="" width="800" height="560">
      <div class="hero-txt"><span class="pill">Home-cooked · 100% veg</span><h2>30g protein in every meal.</h2><p>Macros on every box. Delivered in your area’s fixed slot.</p></div>
    </section>
    <a class="why-cta" href="#/why">${ic('sparkles')}<span><b>Why us?</b><small>See where your ${inr(ECON.price)} goes — and why it beats a delivery app</small></span>${ic('chevron-right')}</a>

    <section class="block">
      <div class="block-h"><h2>Plans</h2><a href="#/plans">Compare all ${ic('chevron-right')}</a></div>
      <div class="rail">
        ${planChip('trial', 'Try 3 days', 'Either plan · one per customer', 'amber')}
        ${planChip('protein26', 'Protein · 26 days', '30g+ protein · 550–650 kcal', 'green', 'Best value')}
        ${planChip('diet26', 'Diet · 26 days', '20g+ protein · 400–450 kcal', 'blue')}
        ${planChip('protein14', 'Protein · 14 days', '30g+ protein', 'green')}
        ${planChip('diet14', 'Diet · 14 days', '20g+ protein', 'blue')}
      </div>
    </section>
    ${nudge ? `<a class="nudge" href="#/plans">${ic('gift')}<span><b>You’ve ordered ${myOrders().length} times.</b> Switch to a 26-day plan and get ₹150 off — it is ${inr(VARIANTS.protein.oneTime - 219)} cheaper per meal.</span></a>` : ''}

    <section class="block">
      <div class="block-h"><h2>Order a meal <small>8 on the menu</small></h2></div>
      <div class="controls">
        ${seg('setVariant', [['protein', `Protein · ${inr(269)}`], ['diet', `Diet · ${inr(249)}`]], v)}
        <div class="chips">${[['all', 'All'], ['main', 'Lunch & dinner'], ['breakfast', 'Breakfast']].map(([f, l]) => `<button class="chip ${ui.filter === f ? 'on' : ''}" data-act="filter" data-v="${f}">${l}</button>`).join('')}</div>
      </div>
      <p class="hint">${ic('info')} ${VARIANTS[v].label}: ${VARIANTS[v].min}g+ protein, ${VARIANTS[v].kcal} kcal. ${VARIANTS[v].note}. <b>${left} of ${PV.ONE_TIME_CAP}</b> one-time meals left for ${dayLabel(sd).toLowerCase()}.</p>
      <div class="meals">${list.map(d => mealCard(d, v, sd)).join('')}</div>
    </section>

    <section class="block how">
      <h2>How delivery works</h2>
      <ol>
        <li>${ic('map-pin')}<span><b>Pick your area.</b> We deliver in fixed zones around our Kudasan kitchen.</span></li>
        <li>${ic('clock')}<span><b>Pick a slot.</b> Order breakfast by 9 PM the day before, lunch by 9:30 AM, dinner by 4:30 PM.</span></li>
        <li>${ic('bike')}<span><b>One rider, one route.</b> Batch delivery keeps your meal at ${inr(199)}–${inr(269)} with no delivery fee.</span></li>
      </ol>
      <a class="btn ghost" href="#/zones">${ic('map')} See zones and time slots</a>
      <p class="fine">Monday to Saturday. No Sunday delivery. Protein figures are recipe targets.</p>
    </section>`;
  }
  const planChip = (id, title, sub, tone, tag) => { const p = PV.plan(id); return `<a class="pchip ${tone}" href="#/plans" data-act="seePlan" data-id="${id}">${tag ? `<em>${tag}</em>` : ''}<b>${title}</b><small>${sub}</small><span><strong>${inr(p.per)}</strong>/meal · ${inr(p.total)}</span></a>`; };
  function mealCard(d, v, sd) {
    const m = PV.macros(d, v), key = `${d.id}|${v}`, qty = S.cart[key] || 0;
    const onPlan = PV.dishOfDay(sd, d.slots[0]) === d.id;
    return `<article class="meal">
      <button class="meal-img" data-act="dish" data-id="${d.id}" aria-label="Details for ${esc(d.name)}">
        <img loading="lazy" src="${d.img}" alt="${esc(d.name)}" width="800" height="560">
        <span class="pbadge"><b>${m.p}g</b> protein</span>${onPlan ? `<span class="tag">On ${dayLabel(sd).toLowerCase()}’s plan menu</span>` : ''}
      </button>
      <div class="meal-b">
        <h3><span class="veg" title="Vegetarian"></span>${esc(d.name)}</h3>
        <p>${esc(d.desc)}</p>
        <div class="meta"><span>${ic('flame')} ${m.kcal} kcal</span><span>${ic(SLOTS[d.slots[0]].icon)} ${d.slots.map(s => SLOTS[s].label).join(' · ')}</span></div>
        <div class="buy"><div class="price">${inr(VARIANTS[v].oneTime)}<small>${VARIANTS[v].label} portion</small></div>
          ${qty ? stepper(key, qty) : `<button class="add" data-act="add" data-k="${key}">Add ${ic('plus')}</button>`}</div>
      </div></article>`;
  }

  /* ---------- PLANS ---------- */
  function plans() {
    const v = ui.planVariant, p26 = PV.plan(v + '26'), p14 = PV.plan(v + '14'), tr = PV.plan('trial');
    const card = (p, tag) => `<article class="plan ${tag ? 'best' : ''}" id="plan-${p.id}">${tag ? `<em>${tag}</em>` : ''}
      <div><h3>${p.days} delivery days</h3><p>${inr(p.per)} per meal · save ${inr(VARIANTS[v].oneTime - p.per)}/meal vs one-time</p>
      <ul><li>${ic('check')} Use within ${p.validity} days</li><li>${ic('check')} Pause up to ${p.pause} days</li>${auto150(p) ? `<li class="hl">${ic('gift')} ₹150 off unlocked for you</li>` : ''}</ul></div>
      <div class="plan-cta"><strong>${inr(p.total)}</strong><button class="btn" data-act="choosePlan" data-id="${p.id}">Choose</button></div></article>`;
    const week = PV.DISHES.filter(d => d.day).map(d => `<li><span>${['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.day]}</span><div><b>${esc(d.name)}</b><small>${esc(d.desc)}</small></div><em>${PV.macros(d, v).p}g</em></li>`).join('');
    return `${head('Plans', '#/home', 'Monthly plans first — the cheapest way to eat with us')}
    <section class="block">
      <article class="trial" id="plan-trial"><img src="assets/img/protein.jpg" alt="" loading="lazy"><div><span class="pill amber">Start here</span><h2>3-day trial · ${inr(tr.total)}</h2><p>Three meals, either plan. One per customer. Buy a 26-day plan within 7 days and get ₹150 off.</p>
        <button class="btn amber" data-act="choosePlan" data-id="trial" ${hadTrial() ? 'disabled' : ''}>${hadTrial() ? 'Trial already used' : 'Start my trial'}</button></div></article>
    </section>
    <section class="block">
      <div class="block-h"><h2>Choose your plan</h2></div>
      ${seg('planVariant', [['protein', 'Protein Plan'], ['diet', 'Diet Plan']], v)}
      <div class="vs"><div><b>${VARIANTS[v].min}g</b><small>protein minimum</small></div><div><b>${VARIANTS[v].kcal}</b><small>kcal per meal</small></div><p>${VARIANTS[v].note}.</p></div>
      ${card(p26, 'Best value')}${card(p14)}
    </section>
    <section class="block"><div class="block-h"><h2>A sample week <small>${VARIANTS[v].label}</small></h2></div><ul class="week">${week}</ul>
      <p class="fine">10–12 dishes rotate over two weeks. Breakfast plans get their own rotation: moong chilla with paneer, paneer paratha with curd, soya poha, hung-curd sprouts bowl.</p></section>
    <section class="block rules"><div class="block-h"><h2>Plan rules</h2></div>
      <details open><summary>One meal time, fixed for the plan</summary><p>Pick breakfast, lunch or dinner at signup. Delivery is Monday to Saturday in your zone’s slot.</p></details>
      <details><summary>Pause before 9 PM the day before</summary><p>Up to 4 days on a 26-day plan and 2 days on a 14-day plan. Paused days extend your end date. A 26-day plan must be used within 35 days; a 14-day plan within 20.</p></details>
      <details><summary>Cancellation</summary><p>Cancel within the first 5 days for a refund of unused days, minus a ₹200 fee. After that there is no refund, but you can pause.</p></details>
      <details><summary>Referrals and coins</summary><p>A friend’s code gives ₹200 off a 26-day plan (₹100 off 14-day); a trainer code gives ₹100 off. One code per customer. Coins pay for up to 20% of an order, expire after 90 days, and 1 coin = ₹1.</p></details>
    </section>`;
  }

  /* ---------- ZONES MAP ---------- */
  function zones() {
    const meal = ui.mapMeal, [r0, r1] = SLOTS[meal].range;
    const row = id => {
      const z = PV.zone(id), n = S.waitlist.length;
      const bar = z.wins ? (() => { const [a, b] = z.wins[meal]; const l = Math.max(0, (a - r0) / (r1 - r0) * 100), w = Math.min(100 - l, (b - a) / (r1 - r0) * 100); return `<div class="tl"><i style="left:${l}%;width:${w}%;background:${z.color}"></i></div>`; })()
        : `<div class="tl fill"><i style="width:${Math.min(100, n / PV.WAITLIST_TARGET * 100)}%;background:${z.color}"></i></div>`;
      return `<article class="zrow"><span class="zdot" style="background:${z.color}">${id}</span><div>
        <h3>${z.areas.map(a => a.name).join(', ')}</h3>
        <p>${z.wins ? `<b>${PV.win(z.wins[meal])}</b> · order by ${SLOTS[meal].cutoff}` : `<b>${n} of ${PV.WAITLIST_TARGET}</b> on the waitlist — opens at ${PV.WAITLIST_TARGET}`}</p>${bar}</div>
        ${z.open ? '' : `<button class="btn sm" data-act="waitlist">Join</button>`}</article>`;
    };
    return `${head('Zones & time slots', '#/home', 'One rider, one zone, one fixed route per slot')}
    <div class="scene-seg">${seg('mapMeal', SLOT_IDS.map(s => [s, SLOTS[s].label]), meal)}</div>${scene({ meal, selected: S.area, pick: 'mapPick' })}
    <section class="block">
      <div class="axis"><span>${PV.fmtMin(r0)}</span><span>${SLOTS[meal].label} run</span><span>${PV.fmtMin(r1)} ${r1 >= 720 ? 'PM' : 'AM'}</span></div>
      ${['A', 'B', 'C'].map(row).join('')}
      <p class="fine">Tap an area to deliver there. The picture shows route order, not exact distances. A new zone opens once ${PV.WAITLIST_TARGET} customers are on its waitlist.</p>
    </section>`;
  }
  /* Illustrated route scene: kitchen on the left, one road per zone, a rider looping along each open route. */
  const STOPS = { kudasan: [150, 66], sargasan: [243, 96], randesan: [336, 62], raysan: [150, 158], pdeu: [243, 180], gift: [336, 152], infocity: [160, 250], sectors: [272, 262] };
  const KPOS = [50, 158];
  function scene({ meal, selected, pick }) {
    const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const curve = pts => pts.map((q, i) => { if (!i) return `M${q[0]} ${q[1]}`; const o = pts[i - 1], mx = (o[0] + q[0]) / 2; return `C${mx} ${o[1]} ${mx} ${q[1]} ${q[0]} ${q[1]}`; }).join(' ');
    const sky = { breakfast: '<circle cx="356" cy="30" r="15" fill="#FDBA4D"/><g stroke="#FDBA4D" stroke-width="3" stroke-linecap="round"><path d="M356 6v-4M335 30h-5M341 14l-3-3M371 14l3-3"/></g>', lunch: '<circle cx="356" cy="30" r="17" fill="#FACC15"/>', dinner: '<path d="M362 14a17 17 0 1 0 12 26a14 14 0 0 1-12-26z" fill="#C7CCF5"/><g fill="#C7CCF5"><circle cx="300" cy="22" r="2"/><circle cx="212" cy="16" r="1.6"/><circle cx="110" cy="26" r="2"/></g>' }[meal || 'lunch'];
    const zones = ['A', 'B', 'C'].map((zid, k) => {
      const z = PV.zone(zid), d = curve([KPOS, ...z.areas.map(a => STOPS[a.id])]);
      const rider = z.open && !calm ? `<g class="rider"><circle r="12" fill="#fff"/><circle r="10" fill="${z.color}"/><g fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="-4" cy="3.5" r="2"/><circle cx="4.5" cy="3.5" r="2"/><path d="M-4 3.5l2.5-6h4l2 6M-1.5-2.5l-1-2h-2"/></g><rect x="1.5" y="-7" width="5" height="4" rx="1" fill="#fff"/>
        <animateMotion dur="${7 + k}s" repeatCount="indefinite" calcMode="linear" keyPoints="${k ? '0;0;1;1' : '0;1;1'}" keyTimes="${k ? '0;0.22;0.9;1' : '0;0.75;1'}"><mpath href="#rt${zid}"/></animateMotion></g>` : '';
      const stops = z.areas.map(a => {
        const [x, y] = STOPS[a.id], on = selected === a.id;
        return `<g class="stop ${on ? 'on' : ''}" transform="translate(${x} ${y})" role="button" tabindex="0" data-act="${pick}" data-id="${a.id}" aria-label="${a.name}, ${z.name}, ${z.open ? (meal ? PV.win(z.wins[meal]) : 'open') : 'waitlist'}">
        <circle class="halo" r="19" fill="${z.color}"/><circle r="12.5" fill="${z.open ? z.color : '#fff'}" stroke="${z.open ? '#fff' : z.color}" stroke-width="2.5" ${z.open ? '' : 'stroke-dasharray="4 3"'}/><text class="zl" y="4.5" fill="${z.open ? '#fff' : z.color}">${zid}</text>
        <text class="nm" y="29">${a.name}</text><text class="tm" y="41" fill="${z.color}">${z.open ? (meal ? PV.win(z.wins[meal]) : z.name) : `Waitlist ${S.waitlist.length}/${PV.WAITLIST_TARGET}`}</text></g>`;
      }).join('');
      return { road: `<path d="${d}" class="road"/><path id="rt${zid}" d="${d}" class="lane ${z.open ? '' : 'shut'}" stroke="${z.color}"/>`, stops, rider };
    });
    return `<svg class="scene m-${meal || 'lunch'}" viewBox="0 0 400 312" role="group" aria-label="Delivery routes from our kitchen to each area">
      <rect class="bg" width="400" height="312"/>${sky}
      <g class="cloud"><ellipse cx="70" cy="30" rx="22" ry="9"/><ellipse cx="88" cy="25" rx="16" ry="9"/></g><g class="cloud c2"><ellipse cx="230" cy="34" rx="20" ry="8"/><ellipse cx="246" cy="29" rx="14" ry="8"/></g>
      <g class="tree"><circle cx="24" cy="78" r="9"/><circle cx="386" cy="112" r="8"/><circle cx="30" cy="288" r="10"/><circle cx="376" cy="282" r="9"/><circle cx="92" cy="292" r="6"/><circle cx="204" cy="140" r="6"/></g>
      ${zones.map(z => z.road).join('')}
      <g class="home" transform="translate(${KPOS[0]} ${KPOS[1]})"><circle r="27" fill="#fff"/><path d="M-15 -2L0 -16L15 -2V14H-15Z" fill="#13201A"/><rect x="-4" y="3" width="8" height="11" fill="#FACC15"/><path class="steam" d="M7 -20q3 -4 0 -8M12 -18q3 -4 0 -8" fill="none" stroke="#13201A" stroke-width="1.8" stroke-linecap="round"/><text class="nm" y="42">Our kitchen</text></g>
      ${zones.map(z => z.stops).join('')}${zones.map(z => z.rider).join('')}</svg>`;
  }

  /* ---------- WHY US ---------- */
  function why() {
    const ours = ECON.price, food = 112, ourOther = ECON.cost - food, ourKeep = ECON.profit;
    const menu = 275, comm = Math.round(menu * .25), fees = 45 + Math.round(menu * .05), rent = 45, theirPay = menu + fees, theirKeep = menu - comm - food - rent;
    const cell = (n, good) => n ? `<td class="${good ? 'good' : ''}">${inr(n)}</td>` : `<td class="good">${ic('check')} ₹0</td>`;
    const row = (label, note, us, them, cls = '') => `<tr class="${cls}"><th scope="row">${label}<small>${note}</small></th>${cell(us, us < them || cls)}${us === them ? `<td>${inr(them)}</td>` : `<td class="${cls ? '' : 'bad'}">${inr(them)}</td>`}</tr>`;
    return `${head('Why us?', '#/home', 'A home kitchen, selling direct')}
    <section class="block whyhero"><span class="pill amber">Win-win</span>
      <h2>You pay <em>${inr(theirPay - ours)} less</em> per meal. We earn <em>${inr(ourKeep - theirKeep)} more</em>.</h2>
      <p>We cook in a home kitchen in Kudasan and take orders on our own website. There is no restaurant rent and no delivery-app commission, so the saving is shared between you and us.</p></section>
    <section class="block">
      <article class="h2h"><div class="us"><small>Direct from us</small><b>${inr(ours)}</b><span>delivery included</span></div><em>You save<strong>${inr(theirPay - ours)}</strong></em><div class="them"><small>Zomato or Swiggy</small><b>${inr(theirPay)}</b><span>same meal, restaurant</span></div></article>
      <article class="cmpt"><h3>Where the money goes</h3>
        <table class="diff"><thead><tr><td></td><th scope="col" class="us">Us<small>home kitchen</small></th><th scope="col">Delivery app<small>restaurant</small></th></tr></thead><tbody>
        ${row('Food, packaging, gas', 'Same meal, same box', food, food)}
        ${row('Rent and staff', 'We cook at home', 0, rent)}
        ${row('App commission', 'About 25%', 0, comm)}
        ${row('Delivery, fees, tax', 'One batch route', ourOther, fees)}
        ${row('Cook earns', 'Stays with the kitchen', ourKeep, theirKeep, 'keep')}
        </tbody><tfoot><tr><th scope="row">You pay</th><td class="us">${inr(ours)}</td><td class="bad">${inr(theirPay)}</td></tr></tfoot></table>
        <p class="verdict">${ic('lightbulb')} Same food. On an app, <b>${inr(rent + comm + fees)}</b> of your ${inr(theirPay)} goes to rent, commission and fees.</p></article>
      <div class="winwin"><div>${ic('wallet')}<b>${inr((theirPay - 219) * 26)}</b><small>saved by you over a 26-day Protein plan</small></div><div>${ic('chef-hat')}<b>${Math.round(ourKeep / ours * 100)}% vs ${Math.round(theirKeep / theirPay * 100)}%</b><small>of what you pay stays with the cook</small></div></div>
      <p class="fine">Our side uses our real cost sheet: ${inr(ECON.cost)} cost on an average ${inr(ours)} meal. The restaurant side is an illustrative estimate, using a menu price about 30% higher to cover a 20–30% commission, plus typical delivery and platform fees. Actual app fees vary.</p>
    </section>
    <section class="block"><div class="block-h"><h2>What a home kitchen means for you</h2></div><ul class="feat">
      <li>${ic('scale')}<div><b>Weighed portions</b><p>Paneer, soya and tofu are portioned by weight, so the protein number on the label is the same every day.</p></div></li>
      <li>${ic('tag')}<div><b>Macros on every box</b><p>Each container is sealed and labelled with dish, protein, calories and date.</p></div></li>
      <li>${ic('cooking-pot')}<div><b>Cooked fresh for your slot</b><p>Three cooking runs a day. Nothing cooked the day before goes out.</p></div></li>
      <li>${ic('route')}<div><b>Fixed slots instead of 30-minute rush</b><p>One rider covers one zone per slot. That is what keeps delivery free.</p></div></li>
      <li>${ic('message-circle')}<div><b>You talk to the people who cook</b><p>Weekly one-tap rating on WhatsApp, and any complaint is answered the same day.</p></div></li></ul>
      <a class="btn" href="#/plans">See plans from ${inr(199)} a meal</a></section>`;
  }

  /* ---------- CART ---------- */
  function cart() {
    const lines = cartLines();
    if (!lines.length) return `${head('Your cart', '#/home')}<div class="empty">${ic('shopping-bag')}<h2>Your cart is empty</h2><p>Add a meal from today’s menu, or start with the 3-day trial.</p><a class="btn" href="#/home">Browse meals</a></div>`;
    const save = lines.reduce((a, l) => a + l.qty * (l.price - PV.plan(l.variant + '26').per), 0);
    return `${head('Your cart', '#/home', `${cartCount()} meal${cartCount() > 1 ? 's' : ''} · delivered in one slot`)}
    <section class="block"><ul class="lines">${lines.map(l => `<li><img src="${l.dish.img}" alt=""><div><b>${esc(l.dish.name)}</b><small>${VARIANTS[l.variant].label} · ${PV.macros(l.dish, l.variant).p}g protein · ${inr(l.price)}</small></div>${stepper(l.key, l.qty)}</li>`).join('')}</ul>
      <a class="addmore" href="#/home">${ic('plus')} Add more meals</a></section>
    <a class="nudge" href="#/plans">${ic('piggy-bank')}<span><b>On a 26-day plan these meals cost ${inr(save)} less.</b> One-time orders fill spare capacity, so plans are always cheaper.</span></a>
    <section class="block"><div class="bill"><div><span>Meals</span><b>${inr(cartTotal())}</b></div><div><span>Delivery in your zone’s slot</span><b class="free">Free</b></div><div class="tot"><span>To pay</span><b>${inr(cartTotal())}</b></div></div></section>
    <div class="cta"><button class="btn block-btn" data-act="startOrder">Choose location and slot ${ic('arrow-right')}</button></div>`;
  }

  /* ---------- CHECKOUT: Location → Slot → Account → Payment ---------- */
  const STEPS = ['Location', 'Slot', 'Account', 'Payment'];
  function checkout() {
    if (!flow) { setTimeout(() => go('#/home')); return ''; }
    const p = flow.type === 'plan' ? PV.plan(flow.planId) : null;
    const title = p ? (p.id === 'trial' ? '3-day trial' : p.name) : 'One-time order';
    const body = [stepLocation, stepSlot, stepAccount, stepPay][flow.step](p);
    return `<header class="bar"><button class="iconbtn" data-act="back" aria-label="Back">${ic('arrow-left')}</button><div><h1>${title}</h1><p>${p ? `${inr(p.total)} · ${p.days} delivery days` : `${cartCount()} meal${cartCount() > 1 ? 's' : ''} · ${inr(cartTotal())}`}</p></div></header>
    <ol class="steps">${STEPS.map((s, i) => `<li class="${i < flow.step ? 'done' : i === flow.step ? 'on' : ''}"><span>${i < flow.step ? ic('check') : i + 1}</span><em>${s}</em></li>`).join('')}</ol>${body}`;
  }
  function stepLocation() {
    const a = flow.area && PV.area(flow.area), z = a && PV.zoneOf(a.id);
    return `${scene({ selected: flow.area, pick: 'flowArea' })}
    <section class="block"><div class="block-h"><h2>Where should we deliver?</h2></div>
      <div class="chips wrap">${AREAS.map(x => `<button class="chip ${flow.area === x.id ? 'on' : ''}" data-act="flowArea" data-id="${x.id}"><i class="dot" style="background:${PV.zone(x.zone).color}"></i>${x.name}</button>`).join('')}</div>
      ${!a ? `<p class="hint">${ic('info')} Tap your area on the picture or in the list.</p>` : z.open ? `
        <div class="zinfo" style="--zc:${z.color}"><b>${z.name} · ${esc(a.name)}</b><div>${SLOT_IDS.map(s => `<span>${ic(SLOTS[s].icon)} ${SLOTS[s].label}<em>${PV.win(z.wins[s])}</em></span>`).join('')}</div></div>
        <label class="field"><span>Flat, building or office</span><input id="f-addr" autocomplete="street-address" value="${esc(flow.address)}" placeholder="e.g. B-402, Lake View Apartments"></label>
        <label class="field"><span>Landmark <small>(optional)</small></span><input id="f-land" value="${esc(flow.landmark)}" placeholder="e.g. opposite the garden gate"></label>` : `
        <div class="wl"><h3>${ic('hourglass')} ${esc(a.name)} is not open yet</h3><p><b>${S.waitlist.length} of ${PV.WAITLIST_TARGET}</b> people are waiting. We open ${z.name} when ${PV.WAITLIST_TARGET} customers have joined.</p>
        <div class="tl fill"><i style="width:${Math.min(100, S.waitlist.length / PV.WAITLIST_TARGET * 100)}%;background:${z.color}"></i></div>
        <button class="btn" data-act="waitlist" data-id="${a.id}">Join the waitlist</button></div>`}
    </section>
    ${a && z.open ? `<div class="cta"><button class="btn block-btn" data-act="next">Continue to slot ${ic('arrow-right')}</button></div>` : ''}`;
  }
  function slotState(date, s) {
    if (flow.type === 'order') {
      if ((cartKind() === 'breakfast') !== (s === 'breakfast')) return cartKind() === 'breakfast' ? 'Your cart has breakfast meals' : 'Your cart has lunch and dinner meals';
      if (PV.oneTimeLeft(date) < cartCount()) return 'One-time orders are full for this day';
    }
    if (!PV.isOpen(date, s)) return `Closed — order by ${SLOTS[s].cutoff}`;
    return null;
  }
  function stepSlot(p) {
    const days = PV.nextDeliveryDays(5), isPlan = !!p;
    if (!flow.date || !days.includes(flow.date)) flow.date = days.find(d => SLOT_IDS.some(s => !slotState(d, s))) || days[0];
    if (flow.slot && slotState(flow.date, flow.slot)) { if (isPlan) flow.date = days.find(d => !slotState(d, flow.slot)); else flow.slot = null; }
    if (!flow.slot) { flow.slot = ['lunch', 'dinner', 'breakfast'].find(s => !slotState(flow.date, s)) || null; }
    const dayBtn = d => { const dead = isPlan ? !!slotState(d, flow.slot) : SLOT_IDS.every(s => slotState(d, s)); return `<button class="day ${flow.date === d ? 'on' : ''}" data-act="flowDate" data-v="${d}" ${dead ? 'disabled' : ''}><small>${dayLabel(d) === 'Today' || dayLabel(d) === 'Tomorrow' ? dayLabel(d) : fmtDate(d, { weekday: 'short' })}</small><b>${PV.pd(d).getDate()}</b><small>${fmtDate(d, { month: 'short' })}</small></button>`; };
    const slotBtn = s => { const why = isPlan ? (days.some(d => !slotState(d, s)) ? null : 'Closed') : slotState(flow.date, s); return `<button class="slot ${flow.slot === s ? 'on' : ''}" data-act="flowSlot" data-v="${s}" ${why ? 'disabled' : ''}>${ic(SLOTS[s].icon)}<span><b>${SLOTS[s].label}</b><small>${why || `Arrives ${PV.slotWin(flow.area, s)}`}</small></span>${flow.slot === s ? ic('circle-check', 'ok') : ''}</button>`; };
    const dates = `<div class="days">${days.map(dayBtn).join('')}</div>`, slots = `<div class="slots">${SLOT_IDS.map(slotBtn).join('')}</div>`;
    const a = PV.area(flow.area);
    return `<section class="block">
      <div class="where">${ic('map-pin')}<span><b>${esc(a.name)} · ${PV.zoneOf(a.id).name}</b><small>${esc(flow.address)}</small></span><button data-act="toStep" data-v="0">Change</button></div>
      ${isPlan ? `<div class="block-h"><h2>Which meal? <small>fixed for the whole plan</small></h2></div>${slots}<div class="block-h"><h2>Start date</h2></div>${dates}`
        : `<div class="block-h"><h2>Delivery day</h2></div>${dates}<div class="block-h"><h2>Time slot</h2></div>${slots}`}
      ${p && p.id === 'trial' ? `<div class="block-h"><h2>Which portion?</h2></div>${seg('flowVariant', [['protein', 'Protein · 30g+'], ['diet', 'Diet · 20g+']], flow.variant)}` : ''}
      <p class="hint">${ic('info')} ${flow.slot ? `Your rider reaches ${esc(a.name)} between <b>${PV.slotWin(flow.area, flow.slot)}</b>. ` : ''}${isPlan ? 'Delivery Monday to Saturday. No custom delivery times.' : 'One-time orders ride on our subscriber route, so there are no custom times.'}</p>
    </section>
    <div class="cta"><button class="btn block-btn" data-act="next" ${flow.slot && flow.date ? '' : 'disabled'}>${S.user ? 'Continue to payment' : 'Continue'} ${ic('arrow-right')}</button></div>`;
  }
  const authForm = () => !ui.auth.sent ? `
      <label class="field"><span>Mobile number</span><div class="tel"><em>+91</em><input id="f-phone" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel-national" placeholder="10-digit number" value="${esc(ui.auth.phone)}"></div><small>We send order updates on WhatsApp to this number.</small></label>
      <button class="btn block-btn" data-act="sendOtp">Send OTP</button>` : `
      <p class="hint">${ic('message-square')} OTP sent to +91 ${esc(ui.auth.phone)}. <button class="link" data-act="editPhone">Change</button></p>
      <label class="field"><span>4-digit OTP</span><input id="f-otp" inputmode="numeric" maxlength="4" autocomplete="one-time-code" placeholder="••••"><small>Demo mode: enter any 4 digits.</small></label>
      <label class="field"><span>Your name</span><input id="f-name" autocomplete="name" placeholder="Name on the delivery label"></label>
      <button class="btn block-btn" data-act="verifyOtp">Verify and continue</button>`;
  const stepAccount = () => `<section class="block"><div class="block-h"><h2>Sign in or create your account</h2></div><p class="sub">One step. No password to remember.</p>${authForm()}</section>`;

  function bill(p) {
    const sub = p ? p.total : cartTotal();
    let disc = 0, discLabel = '';
    if (p) {
      const c = PV.codeInfo(flow.code, p);
      if (c) { disc = c.off; discLabel = c.label; }
      if (auto150(p) && 150 > disc) { disc = 150; discLabel = hadTrial() ? 'Trial to plan offer' : 'Regular customer offer'; }
    }
    const coinMax = Math.min(S.coins, Math.floor((sub - disc) * .2)), coins = flow.coins ? coinMax : 0;
    return { sub, disc, discLabel, coinMax, coins, total: sub - disc - coins };
  }
  function stepPay(p) {
    const b = bill(p), a = PV.area(flow.area);
    const methods = [['gpay', 'Google Pay', 'UPI'], ['phonepe', 'PhonePe', 'UPI'], ['upi', 'Any UPI ID', 'UPI'], ['card', 'Credit or debit card', 'Card']];
    return `<section class="block">
      <div class="summary"><div>${ic('map-pin')}<span><b>${esc(a.name)}</b><small>${esc(flow.address)}</small></span></div>
        <div>${ic('clock')}<span><b>${SLOTS[flow.slot].label} · ${PV.slotWin(flow.area, flow.slot)}</b><small>${p ? `Starts ${fmtDate(flow.date)} · Mon–Sat` : fmtDate(flow.date)}</small></span></div>
        <div>${ic('user')}<span><b>${esc(S.user.name)}</b><small>+91 ${esc(S.user.phone)}</small></span></div></div>
      ${p ? `<div class="block-h"><h2>Referral or trainer code</h2></div>
        <div class="code"><input id="f-code" placeholder="Enter code" value="${esc(flow.code)}" autocapitalize="characters" aria-label="Referral or trainer code"><button class="btn sm" data-act="applyCode">Apply</button></div>
        <p class="fine">${p.id === 'trial' ? 'Codes apply to 14 and 26-day plans.' : flow.code && !PV.codeInfo(flow.code, p) ? '<span class="err">That code is not valid.</span> ' : ''}${p.id === 'trial' ? '' : 'Demo codes: FRIEND (referral) or FITRAJ (trainer). One code per customer.'}</p>` : ''}
      ${b.coinMax > 0 ? `<label class="coinrow"><input type="checkbox" data-act="toggleCoins" ${flow.coins ? 'checked' : ''}><span>${ic('coins')} Use ${b.coinMax} coins <small>You have ${S.coins}. Coins cover up to 20% of an order.</small></span></label>` : ''}
      <div class="bill"><div><span>${p ? esc(p.name) + (p.id === 'trial' ? ` · ${VARIANTS[flow.variant].label}` : '') : `${cartCount()} meal${cartCount() > 1 ? 's' : ''}`}</span><b>${inr(b.sub)}</b></div>
        ${b.disc ? `<div class="save"><span>${esc(b.discLabel)}</span><b>−${inr(b.disc)}</b></div>` : ''}${b.coins ? `<div class="save"><span>Coins</span><b>−${inr(b.coins)}</b></div>` : ''}
        <div><span>Delivery</span><b class="free">Free</b></div><div class="tot"><span>To pay</span><b>${inr(b.total)}</b></div></div>
      <div class="block-h"><h2>Pay with</h2></div>
      <div class="methods">${methods.map(([id, l, t]) => `<label class="${flow.method === id ? 'on' : ''}"><input type="radio" name="pm" value="${id}" data-act="method" ${flow.method === id ? 'checked' : ''}><span class="mlogo">${t === 'Card' ? ic('credit-card') : ic('smartphone')}</span><span><b>${l}</b><small>${t}</small></span></label>`).join('')}</div>
      <p class="fine">${ic('shield-check')} Demo checkout. In the live site this step opens a payment gateway such as Razorpay; no money moves here.</p>
    </section>
    <div class="cta"><button class="btn block-btn" data-act="pay">Pay ${inr(b.total)}</button></div>`;
  }
  function finish() {
    const p = flow.type === 'plan' ? PV.plan(flow.planId) : null, b = bill(p), u = S.user;
    const base = { name: u.name, phone: u.phone.slice(0, 2) + '•••' + u.phone.slice(-5), area: flow.area, address: flow.address + (flow.landmark ? `, ${flow.landmark}` : ''), slot: flow.slot, mine: true, method: flow.method === 'card' ? 'Card' : 'UPI', ts: Date.now() };
    let id;
    if (p) {
      id = PV.uid('S');
      const c = PV.codeInfo(flow.code, p);
      S.subs.push({ ...base, id, planId: p.id, variant: p.variant || flow.variant, days: p.days, start: flow.date, pauses: [], status: 'active', code: c ? c.code : null, paid: b.total });
    } else {
      id = PV.uid('O');
      S.orders.push({ ...base, id, date: flow.date, items: cartLines().map(l => ({ dishId: l.dish.id, variant: l.variant, qty: l.qty })), total: b.total });
      S.cart = {};
    }
    if (b.coins) { S.coins -= b.coins; S.coinLog.unshift({ t: today(), n: -b.coins, why: 'Used at checkout' }); }
    S.area = flow.area; S.address = flow.address;
    flow = null; PV.save(); go(`#/done/${id}`);
  }
  function done(id) {
    const sub = S.subs.find(s => s.id === id), o = S.orders.find(x => x.id === id), x = sub || o;
    if (!x) return home();
    const when = sub ? `${SLOTS[sub.slot].label}, ${PV.slotWin(sub.area, sub.slot)} · from ${fmtDate(sub.start)}` : `${fmtDate(o.date)} · ${SLOTS[o.slot].label}, ${PV.slotWin(o.area, o.slot)}`;
    return `<section class="done"><div class="tick">${ic('check')}</div><h1>${sub ? 'Plan confirmed' : 'Order confirmed'}</h1><p>${when}</p><p class="fine">${sub ? 'Plan' : 'Order'} #${esc(id)} · paid ${inr(sub ? sub.paid : o.total)}</p>
      <div class="wa"><small>WhatsApp preview</small><p>Hi ${esc(x.name.split(' ')[0])}, your ${sub ? esc(PV.plan(sub.planId).name) + ' plan' : 'order'} is confirmed. ${sub ? 'We will send the menu each morning.' : 'We will message you when the rider leaves the kitchen.'} Reply PAUSE before 9 PM to skip a day.</p></div>
      <a class="btn block-btn" href="#/orders">Track ${sub ? 'my plan' : 'my order'}</a><a class="btn ghost block-btn" href="#/home">Back to home</a></section>`;
  }

  /* ---------- ORDERS & PLAN MANAGEMENT ---------- */
  function tracker(d) {
    const i = STATUS.indexOf(d.status), total = PV.deliveries(d.date).filter(x => x.slot === d.slot && x.zone === d.zone).length;
    const note = { placed: 'The kitchen has your order.', cooking: 'Being cooked fresh for your slot.', packed: 'Sealed and labelled with your macros.', out: `Rider is on the ${PV.zone(d.zone).name} route — you are stop ${d.stop} of ${total}.`, delivered: 'Delivered. Enjoy your meal.' }[d.status];
    return `<article class="track"><header><div><small>${dayLabel(d.date)} · ${SLOTS[d.slot].label} · ${PV.slotWin(d.area, d.slot)}</small><h3>${d.items.map(x => `${x.qty} × ${esc(PV.dish(x.dishId).name)}`).join(', ')}</h3></div><span class="st st-${d.status}">${STATUS_LABEL[d.status]}</span></header>
      <ol class="prog">${STATUS.map((s, k) => `<li class="${k <= i ? 'on' : ''}"><i></i><span>${STATUS_LABEL[s]}</span></li>`).join('')}</ol><p>${note}</p>
      ${d.status === 'delivered' ? `<div class="rate"><span>${S.ratings[d.id] ? 'Thanks for rating' : 'Rate this meal'}</span><div>${[1, 2, 3, 4, 5].map(n => `<button data-act="rate" data-id="${d.id}" data-v="${n}" class="${(S.ratings[d.id] || 0) >= n ? 'on' : ''}" aria-label="${n} star${n > 1 ? 's' : ''}">${ic('star')}</button>`).join('')}</div></div>` : ''}</article>`;
  }
  function orders() {
    if (!S.user) return `${head('Orders', '#/home')}<div class="empty">${ic('receipt')}<h2>Sign in to see your orders</h2><p>Track today’s meal, pause a day or renew your plan.</p><button class="btn" data-act="signIn">Sign in</button></div>`;
    const t = today(), subs = mySubs(), ords = myOrders();
    const live = [];
    subs.forEach(s => { const inf = PV.subInfo(s); const d = inf.dates.includes(t) ? t : inf.next; if (d) { const x = PV.deliveries(d).find(y => y.ref === s.id); if (x) live.push(x); } });
    ords.filter(o => o.date >= t).forEach(o => { const x = PV.deliveries(o.date).find(y => y.ref === o.id); if (x) live.push(x); });
    const planCard = s => {
      const p = PV.plan(s.planId), inf = PV.subInfo(s), pct = inf.done / s.days * 100;
      return `<article class="myplan ${s.status}"><header><div><small>${VARIANTS[s.variant].label} · ${SLOTS[s.slot].label} · ${esc(PV.area(s.area).name)}</small><h3>${esc(p.name)}</h3></div><span class="ring" style="--p:${pct}"><b>${inf.left}</b><small>left</small></span></header>
        <p>${s.status === 'cancelled' ? 'Cancelled.' : inf.next ? `Next meal <b>${dayLabel(inf.next)}, ${PV.slotWin(s.area, s.slot)}</b> — ${esc(PV.dish(PV.dishOfDay(inf.next, s.slot)).name)}. Ends ${fmtDate(inf.end)}.` : 'Plan complete.'}</p>
        ${s.status === 'active' && inf.left ? `<div class="acts">${p.pause ? `<button class="btn sm ghost" data-act="pauseSheet" data-id="${s.id}">${ic('pause')} Pause a day <small>${s.pauses.length}/${p.pause}</small></button>` : ''}<button class="btn sm ghost" data-act="cancelSheet" data-id="${s.id}">Cancel</button>${inf.left <= 3 ? `<button class="btn sm" data-act="choosePlan" data-id="${p.id === 'trial' ? s.variant + '26' : p.id}">${p.id === 'trial' ? 'Get a plan · ₹150 off' : 'Renew'}</button>` : ''}</div>` : ''}</article>`;
    };
    const past = ords.filter(o => o.date < t);
    return `${head('Orders', '#/home', 'Updates live from our kitchen')}
    ${!live.length && !subs.length && !ords.length ? `<div class="empty">${ic('utensils')}<h2>No orders yet</h2><p>Your meals and plans will appear here.</p><a class="btn" href="#/home">Order a meal</a></div>` : ''}
    ${live.length ? `<section class="block"><div class="block-h"><h2>Up next</h2></div>${live.map(tracker).join('')}</section>` : ''}
    ${subs.length ? `<section class="block"><div class="block-h"><h2>My plans</h2></div>${subs.map(planCard).join('')}</section>` : ''}
    ${past.length ? `<section class="block"><div class="block-h"><h2>Earlier orders</h2></div><ul class="past">${past.map(o => `<li><div><b>${o.items.map(x => `${x.qty} × ${esc(PV.dish(x.dishId).name)}`).join(', ')}</b><small>${fmtDate(o.date)} · ${inr(o.total)}</small></div><button class="btn sm ghost" data-act="reorder" data-id="${o.id}">Reorder</button></li>`).join('')}</ul></section>` : ''}`;
  }

  /* ---------- ACCOUNT ---------- */
  function account() {
    const u = S.user;
    return `${head('Account', '#/home')}
    ${u ? `<section class="block"><div class="me"><span class="avatar lg">${esc(u.name[0].toUpperCase())}</span><div><h2>${esc(u.name)}</h2><p>+91 ${esc(u.phone)}${S.area ? ` · ${esc(PV.area(S.area).name)}` : ''}</p></div></div>
      <div class="wallet"><div>${ic('coins')}<b>${S.coins}</b><small>coins · 1 coin = ₹1</small></div><p>Pay up to 20% of any order with coins. They expire 90 days after you earn them and cannot be withdrawn.</p>
        ${S.coinLog.length ? `<ul>${S.coinLog.slice(0, 4).map(l => `<li><span>${esc(l.why)}</span><b class="${l.n > 0 ? 'plus' : ''}">${l.n > 0 ? '+' : ''}${l.n}</b></li>`).join('')}</ul>` : ''}</div>
      <div class="refer"><div><small>Your referral code</small><b>${esc(u.code)}</b></div><button class="btn sm" data-act="copyCode">${ic('copy')} Copy</button><p>Your friend gets ₹200 off a 26-day plan. You get 250 coins after their 5th delivered meal.</p></div></section>`
        : `<div class="empty">${ic('user')}<h2>Welcome</h2><p>Sign in to manage plans, coins and referrals.</p><button class="btn" data-act="signIn">Sign in</button></div>`}
    <section class="block"><ul class="menu">
      <li><a href="#/orders">${ic('receipt')} Orders and plans ${ic('chevron-right')}</a></li><li><a href="#/zones">${ic('map')} Zones and time slots ${ic('chevron-right')}</a></li>
      <li><a href="#/why">${ic('sparkles')} Why us? ${ic('chevron-right')}</a></li><li><a href="kitchen.html" target="_blank" rel="noopener">${ic('chef-hat')} Kitchen console (for our team) ${ic('external-link')}</a></li>
      ${u ? `<li><button data-act="signOut">${ic('log-out')} Sign out</button></li>` : ''}<li><button data-act="resetDemo">${ic('rotate-ccw')} Reset demo data</button></li></ul>
      <p class="fine">Demo build with test data. No real payments, OTPs or WhatsApp messages are sent.</p></section>`;
  }

  /* ---------- sheets ---------- */
  const sheets = {
    area() {
      openSheet(`<h2>Choose your area</h2><p class="sub">We deliver in fixed zones around our Kudasan kitchen.</p><ul class="alist">${AREAS.map(a => { const z = PV.zoneOf(a.id); return `<li><button data-act="setArea" data-id="${a.id}"><i class="zdot" style="background:${z.color}">${z.id}</i><span><b>${a.name}</b><small>${z.open ? `Lunch ${PV.win(z.wins.lunch)} · Dinner ${PV.win(z.wins.dinner)}` : `Waitlist · ${S.waitlist.length}/${PV.WAITLIST_TARGET} joined`}</small></span>${S.area === a.id ? ic('check', 'ok') : ''}</button></li>`; }).join('')}</ul><a class="btn ghost block-btn" href="#/zones" data-act="closeSheet">${ic('map')} See all zones and time slots</a>`);
    },
    dish(id) {
      const d = PV.dish(id);
      openSheet(`<img class="sheet-img" src="${d.img}" alt="${esc(d.name)}"><h2><span class="veg"></span>${esc(d.name)}</h2><p class="sub">${esc(d.desc)}</p>
        <div class="mtable">${['protein', 'diet'].map(v => { const m = PV.macros(d, v), k = `${d.id}|${v}`; return `<div><small>${VARIANTS[v].label} portion</small><b>${m.p}g protein</b><span>${m.kcal} kcal · ${d.key[0]} ${d.key[v === 'diet' ? 2 : 1]}g</span><button class="add" data-act="add" data-k="${k}" data-close="1">Add · ${inr(VARIANTS[v].oneTime)}</button></div>`; }).join('')}</div>
        <p class="fine">Served for ${d.slots.map(s => SLOTS[s].label.toLowerCase()).join(' and ')}. Portions are fixed by weight. Protein figures are targets until recipes are lab-checked.</p>`);
    },
    auth() { openSheet(`<h2>Sign in</h2><p class="sub">Use your mobile number. No password.</p><div id="auth">${authForm()}</div>`); },
    waitlist(areaId) {
      const u = S.user || {};
      openSheet(`<h2>Join the Zone C waitlist</h2><p class="sub">${S.waitlist.length} of ${PV.WAITLIST_TARGET} joined. We will message you the day the zone opens.</p>
        <label class="field"><span>Name</span><input id="w-name" value="${esc(u.name || '')}" autocomplete="name"></label>
        <label class="field"><span>Mobile number</span><input id="w-phone" type="tel" inputmode="numeric" maxlength="10" value="${esc(u.phone || '')}"></label>
        <label class="field"><span>Area</span><select id="w-area">${AREAS.filter(a => a.zone === 'C').map(a => `<option value="${a.id}" ${a.id === areaId ? 'selected' : ''}>${a.name}</option>`).join('')}</select></label>
        <button class="btn block-btn" data-act="joinWaitlist">Join waitlist</button>`);
    },
    pause(id) {
      const s = S.subs.find(x => x.id === id), p = PV.plan(s.planId), t = today();
      const days = [...new Set([...PV.subInfo(s).dates.filter(d => d >= t), ...s.pauses.filter(d => d >= t)])].sort().slice(0, 8);
      openSheet(`<h2>Pause a day</h2><p class="sub">${s.pauses.length} of ${p.pause} pause days used. Request by 9 PM the day before. Paused days are added to the end of your plan.</p>
        <ul class="plist">${days.map(d => { const paused = s.pauses.includes(d), locked = new Date() >= PV.cutoffAt(d, 'breakfast'), full = !paused && s.pauses.length >= p.pause; return `<li class="${paused ? 'paused' : ''}"><div><b>${dayLabel(d)}, ${fmtDate(d, { day: 'numeric', month: 'short' })}</b><small>${paused ? 'Paused — no delivery' : esc(PV.dish(PV.dishOfDay(d, s.slot)).name)}</small></div><button class="btn sm ${paused ? '' : 'ghost'}" data-act="togglePause" data-id="${s.id}" data-v="${d}" ${locked || full ? 'disabled' : ''}>${locked ? 'Locked' : paused ? 'Resume' : 'Pause'}</button></li>`; }).join('')}</ul>`);
    },
    cancel(id) {
      const s = S.subs.find(x => x.id === id), p = PV.plan(s.planId), inf = PV.subInfo(s);
      const within = today() <= addDays(s.start, 4) && p.id !== 'trial', per = s.paid / s.days, refund = Math.max(0, Math.round(inf.left * per) - 200);
      openSheet(`<h2>Cancel this plan?</h2>${within ? `<p class="sub">You are within the first 5 days, so unused days are refunded minus a ₹200 fee.</p><div class="bill"><div><span>${inf.left} unused days × ${inr(per)} paid</span><b>${inr(inf.left * per)}</b></div><div><span>Cancellation fee</span><b>−₹200</b></div><div class="tot"><span>Refund</span><b>${inr(refund)}</b></div></div>` : `<p class="sub">${p.id === 'trial' ? 'The 3-day trial is not refundable.' : 'The first 5 days have passed, so there is no refund.'} You can pause days instead and keep every meal you paid for.</p>`}
        <button class="btn block-btn" data-act="closeSheet">Keep my plan</button><button class="btn danger block-btn" data-act="confirmCancel" data-id="${s.id}">Cancel plan${within ? ` and refund ${inr(refund)}` : ''}</button>`);
    },
    replace(key) {
      openSheet(`<h2>Start a new cart?</h2><p class="sub">Breakfast meals and lunch or dinner meals are cooked and delivered in different slots, so they need separate orders.</p><button class="btn block-btn" data-act="replaceCart" data-k="${key}">Clear cart and add this</button><button class="btn ghost block-btn" data-act="closeSheet">Keep my cart</button>`);
    },
  };

  /* ---------- actions ---------- */
  const grab = () => { if (!flow) return; const a = val('f-addr'), l = val('f-land'), c = val('f-code'); if (a !== null) flow.address = a; if (l !== null) flow.landmark = l; if (c !== null) flow.code = c; };
  const newFlow = extra => ({ step: 0, area: S.area, address: S.address || '', landmark: '', date: null, slot: null, code: '', coins: false, method: 'gpay', variant: S.variant, ...extra });
  const afterAuth = () => { ui.auth = { sent: false, phone: '' }; closeSheet(); if (flow && flow.step === 2) flow.step = 3; render(); };
  const act = {
    closeSheet,
    pickArea: () => sheets.area(),
    setArea: e => { S.area = e.id; PV.save(); closeSheet(); if (!PV.zoneOf(e.id).open) sheets.waitlist(e.id); },
    setVariant: e => { S.variant = e.v; PV.save(); },
    planVariant: e => { ui.planVariant = e.v; render(); },
    filter: e => { ui.filter = e.v; render(); },
    mapMeal: e => { ui.mapMeal = e.v; render(); },
    mapPick: e => { S.area = e.id; PV.save(); toast(PV.zoneOf(e.id).open ? `Delivering to ${PV.area(e.id).name}` : `${PV.area(e.id).name} is on the waitlist`); },
    dish: e => sheets.dish(e.id),
    add: e => {
      const kind = PV.dish(e.k.split('|')[0]).slots[0] === 'breakfast' ? 'breakfast' : 'main';
      if (cartKind() && cartKind() !== kind) return sheets.replace(e.k);
      S.cart[e.k] = (S.cart[e.k] || 0) + 1; PV.save(); if (e.close) { closeSheet(); toast('Added to cart'); }
    },
    replaceCart: e => { S.cart = { [e.k]: 1 }; PV.save(); closeSheet(); },
    inc: e => { S.cart[e.k]++; PV.save(); },
    dec: e => { if (--S.cart[e.k] <= 0) delete S.cart[e.k]; PV.save(); },
    startOrder: () => { flow = newFlow({ type: 'order' }); go('#/checkout'); },
    seePlan: e => { const p = PV.plan(e.id); if (p.variant) ui.planVariant = p.variant; ui.focusPlan = e.id; go('#/plans'); focusPlan(); },
    choosePlan: e => {
      if (e.id === 'trial' && hadTrial()) return toast('The trial is one per customer');
      const p = PV.plan(e.id);
      flow = newFlow({ type: 'plan', planId: e.id, variant: p.variant || ui.planVariant }); go('#/checkout');
    },
    back: () => { grab(); if (flow.step === 0) { const t = flow.type; flow = null; go(t === 'plan' ? '#/plans' : '#/cart'); } else { flow.step -= (flow.step === 3 && S.user) ? 2 : 1; render(); } },
    toStep: e => { flow.step = +e.v; render(); },
    flowArea: e => { grab(); flow.area = e.id; flow.slot = null; render(); },
    flowDate: e => { flow.date = e.v; render(); },
    flowSlot: e => { flow.slot = e.v; render(); },
    flowVariant: e => { flow.variant = e.v; render(); },
    next: () => {
      grab();
      if (flow.step === 0) { if (flow.address.length < 4) { toast('Add your flat, building or office'); const f = $('#f-addr'); if (f) f.focus(); return; } flow.step = 1; }
      else if (flow.step === 1) flow.step = S.user ? 3 : 2;
      render(); window.scrollTo(0, 0);
    },
    sendOtp: () => { const ph = val('f-phone'); if (!/^[6-9]\d{9}$/.test(ph)) return toast('Enter a valid 10-digit mobile number'); ui.auth = { sent: true, phone: ph }; refreshAuth(); toast('Demo OTP sent — enter any 4 digits'); },
    editPhone: () => { ui.auth.sent = false; refreshAuth(); },
    verifyOtp: () => {
      const otp = val('f-otp'), name = val('f-name');
      if (!/^\d{4}$/.test(otp)) return toast('Enter the 4-digit OTP');
      if (!name || name.length < 2) return toast('Enter your name');
      S.user = { name, phone: ui.auth.phone, code: name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) + ui.auth.phone.slice(-3) };
      if (!S.coinLog.length) { S.coins = 125; S.coinLog.unshift({ t: today(), n: 125, why: 'Demo referral reward' }); }
      PV.save(); afterAuth(); toast(`Welcome, ${name.split(' ')[0]}`);
    },
    signIn: () => sheets.auth(),
    signOut: () => { S.user = null; PV.save(); toast('Signed out'); },
    applyCode: () => { grab(); render(); const c = PV.codeInfo(flow.code, PV.plan(flow.planId)); if (c) toast(`${c.label}: ₹${c.off} off`); },
    toggleCoins: () => { grab(); flow.coins = !flow.coins; render(); },
    method: e => { grab(); flow.method = e.el.value; render(); },
    pay: () => {
      grab();
      const b = bill(flow.type === 'plan' ? PV.plan(flow.planId) : null);
      openSheet(`<div class="paying"><div class="spin"></div><h2>Paying ${inr(b.total)}</h2><p class="sub">Demo payment — nothing is charged.</p></div>`);
      setTimeout(() => { closeSheet(); finish(); }, 1500);
    },
    waitlist: e => sheets.waitlist(e.id),
    joinWaitlist: () => {
      const name = val('w-name'), ph = val('w-phone');
      if (!name || !/^[6-9]\d{9}$/.test(ph)) return toast('Enter your name and a valid mobile number');
      S.waitlist.push({ name, phone: ph.slice(0, 2) + '•••' + ph.slice(-5), area: val('w-area'), ts: Date.now(), mine: true }); PV.save(); closeSheet();
      toast(`You are number ${S.waitlist.length} on the waitlist`);
    },
    rate: e => { S.ratings[e.id] = +e.v; PV.save(); toast('Thanks — your rating reached the kitchen'); },
    pauseSheet: e => sheets.pause(e.id),
    togglePause: e => { const s = S.subs.find(x => x.id === e.id); s.pauses = s.pauses.includes(e.v) ? s.pauses.filter(d => d !== e.v) : [...s.pauses, e.v]; PV.save(); sheets.pause(e.id); },
    cancelSheet: e => sheets.cancel(e.id),
    confirmCancel: e => { const s = S.subs.find(x => x.id === e.id); s.status = 'cancelled'; s.endedOn = addDays(today(), 1); PV.save(); closeSheet(); toast('Plan cancelled'); },
    reorder: e => { const o = S.orders.find(x => x.id === e.id); S.cart = {}; o.items.forEach(i => S.cart[`${i.dishId}|${i.variant}`] = i.qty); PV.save(); go('#/cart'); },
    copyCode: () => { navigator.clipboard && navigator.clipboard.writeText(S.user.code).catch(() => { }); toast('Referral code copied'); },
    resetDemo: () => { flow = null; PV.reset(); toast('Demo data reset'); go('#/home'); },
  };
  const refreshAuth = () => { const box = $('#auth'); if (box) { box.innerHTML = authForm(); icons(); const f = $('input', box); if (f) f.focus(); } else render(); };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || el.matches('input')) return;
    const a = el.dataset.act;
    if (el.tagName === 'A' && a !== 'closeSheet') e.preventDefault();
    act[a] && act[a]({ ...el.dataset, el });
  });
  document.addEventListener('change', e => { const el = e.target.closest('input[data-act]'); if (el) act[el.dataset.act]({ ...el.dataset, el }); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !sheetEl.hidden) closeSheet();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g[data-act]')) { e.preventDefault(); act[e.target.dataset.act]({ ...e.target.dataset }); }
  });

  /* ---------- render ---------- */
  const views = { home, plans, zones, why, cart, checkout, done, orders, account };
  function render() {
    S = PV.state();
    const [p, arg] = (location.hash.slice(2) || 'home').split('/');
    const name = views[p] ? p : 'home';
    const flowView = name === 'checkout' || name === 'done' || name === 'cart';
    app.innerHTML = `<div class="view v-${name}">${views[name](arg)}</div>${flowView ? '' : nav(name)}${name === 'home' || name === 'why' ? cartBar() : ''}`;
    app.classList.toggle('has-cart', (name === 'home' || name === 'why') && cartCount() > 0);
    icons();
  }
  // Re-render on data changes (including changes made in the kitchen console), but never while typing.
  PV.on(() => { const a = document.activeElement; if (a && /INPUT|SELECT|TEXTAREA/.test(a.tagName) && a.type !== 'checkbox' && a.type !== 'radio') return; render(); });
  // After arriving from a plan chip, bring that plan into view and flash it once.
  function focusPlan() {
    const el = ui.focusPlan && document.getElementById('plan-' + ui.focusPlan);
    if (!el) return;
    ui.focusPlan = null;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('flash');
  }
  window.addEventListener('hashchange', () => { closeSheet(); render(); window.scrollTo(0, 0); focusPlan(); });
  render();
})();
