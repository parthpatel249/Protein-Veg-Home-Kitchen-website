/* Kitchen console — the cook's and rider's side of the same data the customer app writes. */
(() => {
  const { SLOTS, SLOT_IDS, VARIANTS, ECON, STATUS, STATUS_LABEL, inr, esc, today, fmtDate, dayLabel } = PV;
  const $ = s => document.querySelector(s);
  const viewEl = $('#view'), headEl = $('#head'), navEl = $('#nav'), toastEl = $('#toast');
  let S = PV.state();
  const nowMin = () => new Date().getHours() * 60 + new Date().getMinutes();
  const ui = { view: (location.hash.slice(1) || 'today'), date: PV.serviceDate(), run: nowMin() < 540 ? 'breakfast' : nowMin() < 810 ? 'lunch' : 'dinner', zone: 'A', q: '', ing: 80, meals: 0 };
  let chart = null;
  const ic = (n, c = '') => `<i data-lucide="${n}" class="${c}" aria-hidden="true"></i>`;
  const toast = m => { toastEl.textContent = m; toastEl.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.hidden = true, 2400); };
  const seg = (act, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button class="${v === cur ? 'on' : ''}" aria-pressed="${v === cur}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const items = d => d.items.map(i => `${i.qty} × ${esc(PV.dish(i.dishId).name)} <em class="v-${i.variant}">${VARIANTS[i.variant].label}</em>`).join('<br>');
  const all = () => PV.deliveries(ui.date);
  const count = (list, f) => list.filter(f).reduce((a, d) => a + d.meals, 0);
  const runSeg = list => seg('run', SLOT_IDS.map(s => [s, `${SLOTS[s].label} · ${count(list, d => d.slot === s)}`]), ui.run);

  const NAV = [['today', 'layout-dashboard', 'Today'], ['cook', 'cooking-pot', 'Cook sheet'], ['board', 'kanban', 'Order board'], ['delivery', 'bike', 'Delivery'], ['subs', 'users', 'Subscribers'], ['zones', 'map-pinned', 'Zones & waitlist'], ['money', 'indian-rupee', 'Business'], ['trainers', 'dumbbell', 'Referrals']];

  /* ---------- TODAY ---------- */
  function vToday() {
    const list = all(), meals = count(list, () => true), rev = list.reduce((a, d) => a + d.amount, 0);
    const active = S.subs.filter(s => PV.subInfo(s).active), ot = PV.oneTimeUsed(ui.date);
    const rs = Object.values(S.ratings), avg = rs.reduce((a, b) => a + b, 0) / (rs.length || 1);
    const kpi = (l, v, s, tone = '') => `<article class="kpi ${tone}"><small>${l}</small><b>${v}</b><span>${s}</span></article>`;
    const scale = Math.max(100, meals + 10), pos = n => n / scale * 100;
    const run = s => {
      const l = list.filter(d => d.slot === s), n = count(l, () => true), open = PV.isOpen(ui.date, s);
      const by = st => count(l, d => d.status === st);
      return `<article class="card run"><header><h3>${ic(SLOTS[s].icon)} ${SLOTS[s].label}</h3><span class="tag ${open ? 'open' : ''}">${open ? `Orders open until ${SLOTS[s].cutoff.split(' the')[0].replace(' same day', '')}` : 'Orders closed · count is final'}</span></header>
        <div class="run-n"><b>${n}</b><span>meals · ${count(l, d => d.zone === 'A')} zone A · ${count(l, d => d.zone === 'B')} zone B${count(l, d => d.zone === 'C') ? ` · ${count(l, d => d.zone === 'C')} zone C` : ''}</span></div>
        <div class="bar5">${STATUS.map(st => by(st) ? `<i class="s-${st}" style="flex:${by(st)}" title="${STATUS_LABEL[st]}: ${by(st)}"></i>` : '').join('') || '<i style="flex:1"></i>'}</div>
        <ul class="mini">${STATUS.map(st => `<li><i class="s-${st}"></i>${STATUS_LABEL[st]} <b>${by(st)}</b></li>`).join('')}</ul>
        <div class="row"><button class="btn sm" data-act="goRun" data-v="cook" data-run="${s}">Cook sheet</button><button class="btn sm ghost" data-act="goRun" data-v="delivery" data-run="${s}">Delivery sheet</button></div></article>`;
    };
    const due = active.filter(s => PV.subInfo(s).left <= 3 && s.planId !== 'trial'), trials = active.filter(s => s.planId === 'trial'), paused = S.subs.filter(s => s.pauses.includes(ui.date));
    const n = nowMin();
    return `<div class="kpis">
      ${kpi('Meals', meals, `${SLOT_IDS.map(s => `${count(list, d => d.slot === s)} ${SLOTS[s].label.toLowerCase()}`).join(' · ')}`)}
      ${kpi('Revenue', inr(rev), `avg ${inr(rev / (meals || 1))} per meal`)}
      ${kpi('Profit before fixed costs', inr(rev - meals * ECON.cost), `at ${inr(ECON.cost)} cost per meal`, 'good')}
      ${kpi('One-time orders', `${ot} / ${PV.ONE_TIME_CAP}`, `${PV.oneTimeLeft(ui.date)} slots left under the daily cap`, ot >= PV.ONE_TIME_CAP ? 'warn' : '')}
      ${kpi('Active subscribers', active.length, `${trials.length} on trial · ${due.length} renewals due`)}
      ${kpi('Rating', avg.toFixed(1) + ' / 5', `${rs.length} ratings · ${rs.filter(r => r <= 3).length} need a reply`)}</div>
    <article class="card"><header><h3>Meals a day vs plan</h3><span class="muted">${meals >= ECON.target ? 'At the ₹1 lakh target' : meals >= ECON.breakEven ? `Past break-even · ${ECON.target - meals} more meals a day to reach ₹1 lakh/month` : `${ECON.breakEven - meals} more meals a day to break even`}</span></header>
      <div class="goal"><i style="width:${pos(meals)}%"></i><span class="mk" style="left:${pos(ECON.breakEven)}%"><em>Break-even ${ECON.breakEven}</em></span><span class="mk" style="left:${pos(ECON.target)}%"><em>₹1 lakh · ${ECON.target}</em></span><b style="left:${pos(meals)}%">${meals}</b></div></article>
    <div class="grid3">${SLOT_IDS.map(run).join('')}</div>
    <div class="grid2">
      <article class="card"><header><h3>Daily schedule</h3><span class="muted">${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span></header>
        <ol class="sched">${PV.SCHEDULE.map(([a, b, t]) => `<li class="${ui.date === today() && n >= a && n < b ? 'now' : ui.date === today() && n >= b ? 'past' : ''}"><time>${PV.win([a, b])}</time><span>${t}</span></li>`).join('')}</ol></article>
      <article class="card"><header><h3>Needs attention</h3></header><ul class="todo">
        <li>${ic('refresh-cw')}<div><b>${due.length} renewals due</b><span>${due.slice(0, 4).map(s => esc(s.name)).join(', ') || 'None in the next 3 days'}${due.length > 4 ? ` and ${due.length - 4} more` : ''}</span></div><button class="btn sm ghost" data-act="nav" data-v="subs">View</button></li>
        <li>${ic('gift')}<div><b>${trials.length} trial customers</b><span>Send the ₹150 plan offer on day 3</span></div></li>
        <li>${ic('pause')}<div><b>${paused.length} paused for ${dayLabel(ui.date).toLowerCase()}</b><span>${paused.map(s => esc(s.name)).join(', ') || 'Nobody has paused'}</span></div></li>
        <li>${ic('map-pinned')}<div><b>Zone C waitlist: ${S.waitlist.length} of ${PV.WAITLIST_TARGET}</b><span>${S.zoneC ? 'Zone C is open' : S.waitlist.length >= PV.WAITLIST_TARGET ? 'Ready to open' : `${PV.WAITLIST_TARGET - S.waitlist.length} more to open the zone`}</span></div><button class="btn sm ghost" data-act="nav" data-v="zones">View</button></li>
      </ul></article></div>`;
  }

  /* ---------- COOK SHEET ---------- */
  function vCook() {
    const list = all(), l = list.filter(d => d.slot === ui.run), agg = {};
    l.forEach(d => d.items.forEach(i => { const a = agg[i.dishId] = agg[i.dishId] || { protein: 0, diet: 0 }; a[i.variant] += i.qty; }));
    const rows = Object.entries(agg).sort((a, b) => (b[1].protein + b[1].diet) - (a[1].protein + a[1].diet));
    const tot = rows.reduce((a, [, c]) => [a[0] + c.protein, a[1] + c.diet], [0, 0]);
    const placed = l.filter(d => d.status === 'placed').length, cooking = l.filter(d => d.status === 'cooking').length;
    const first = rows[0] && PV.dish(rows[0][0]);
    return `<div class="tools">${runSeg(list)}<div class="row no-print"><button class="btn" data-act="bulk" data-from="placed" data-to="cooking" ${placed ? '' : 'disabled'}>${ic('flame')} Start cooking (${placed})</button><button class="btn" data-act="bulk" data-from="cooking" data-to="packed" ${cooking ? '' : 'disabled'}>${ic('package-check')} Mark packed (${cooking})</button><button class="btn ghost" data-act="print">${ic('printer')} Print</button></div></div>
    <article class="card"><header><h3>${SLOTS[ui.run].label} kitchen sheet · ${fmtDate(ui.date, { weekday: 'long', day: 'numeric', month: 'long' })}</h3><span class="tag ${PV.isOpen(ui.date, ui.run) ? 'open' : ''}">${PV.isOpen(ui.date, ui.run) ? 'Orders still open' : 'Final count'}</span></header>
      ${rows.length ? `<div class="scroll"><table><thead><tr><th>Dish</th><th class="n">Protein</th><th class="n">Diet</th><th class="n">Total</th><th>Weigh out</th><th>Portion per box</th></tr></thead><tbody>
        ${rows.map(([id, c]) => { const d = PV.dish(id), g = c.protein * d.key[1] + c.diet * d.key[2]; return `<tr><td><b>${esc(d.name)}</b><small>${esc(d.desc)}</small></td><td class="n big">${c.protein}</td><td class="n big">${c.diet}</td><td class="n big tot">${c.protein + c.diet}</td><td><b>${(g / 1000).toFixed(2)} kg</b> ${d.key[0]}</td><td><small>Protein ${d.key[1]}g · Diet ${d.key[2]}g</small></td></tr>`; }).join('')}
        </tbody><tfoot><tr><td>Boxes and labels to print</td><td class="n">${tot[0]}</td><td class="n">${tot[1]}</td><td class="n tot">${tot[0] + tot[1]}</td><td colspan="2"></td></tr></tfoot></table></div>` : `<p class="empty">No ${SLOTS[ui.run].label.toLowerCase()} meals for this day yet.</p>`}</article>
    <div class="grid2"><article class="card"><header><h3>Box label</h3><span class="muted">One per container</span></header>${first ? `<div class="label"><small>Protein Veg Home Kitchen</small><b>${esc(first.name)}</b><div><span><strong>${first.p}g</strong> protein</span><span><strong>${first.kcal}</strong> kcal</span></div><em>Protein portion · packed ${fmtDate(ui.date, { day: 'numeric', month: 'short', year: 'numeric' })}</em></div>` : '<p class="empty">Nothing to label.</p>'}</article>
      <article class="card"><header><h3>Before the run leaves</h3></header><ul class="check"><li><label><input type="checkbox"> Portions weighed, not eyeballed</label></li><li><label><input type="checkbox"> Containers sealed and labelled with dish, protein, calories, date</label></li><li><label><input type="checkbox"> Gloves and hair covers on</label></li><li><label><input type="checkbox"> Fridge temperature checked today</label></li><li><label><input type="checkbox"> Nothing cooked yesterday goes out</label></li></ul></article></div>`;
  }

  /* ---------- ORDER BOARD ---------- */
  function vBoard() {
    const list = all(), l = list.filter(d => d.slot === ui.run);
    const next = { placed: 'Start cooking', cooking: 'Packed', packed: 'Dispatch', out: 'Delivered' };
    const card = d => `<article class="ocard ${d.mine ? 'web' : ''}"><header><b>${esc(d.name)}</b><span class="z z${d.zone}">${d.zone}·${d.stop}</span></header><p>${items(d)}</p><footer><small>${d.kind === 'plan' ? esc(d.planName) : `One-time · ${inr(d.amount)}`}${d.mine ? ' · <b>website</b>' : ''}</small>${next[d.status] ? `<button class="btn xs" data-act="advance" data-id="${d.id}">${next[d.status]} ${ic('arrow-right')}</button>` : S.ratings[d.id] ? `<span class="stars">${'★'.repeat(S.ratings[d.id])}</span>` : ''}</footer></article>`;
    return `<div class="tools">${runSeg(list)}<span class="muted">Orders placed on the website appear here straight away. Moving a card updates the customer’s tracker.</span></div>
    <div class="board">${STATUS.map(st => { const c = l.filter(d => d.status === st); return `<section class="col"><h3><i class="s-${st}"></i>${STATUS_LABEL[st]} <span>${c.length}</span></h3>${c.map(card).join('') || '<p class="empty">—</p>'}</section>`; }).join('')}</div>`;
  }

  /* ---------- DELIVERY SHEET ---------- */
  function vDelivery() {
    const list = all(), zids = ['A', 'B', ...(S.zoneC ? ['C'] : [])];
    if (!zids.includes(ui.zone)) ui.zone = 'A';
    const z = PV.zone(ui.zone), l = list.filter(d => d.slot === ui.run && d.zone === ui.zone);
    const packed = l.filter(d => d.status === 'packed').length, left = l.filter(d => d.status !== 'delivered').length;
    return `<div class="tools">${runSeg(list)}${seg('zone', zids.map(id => [id, `Zone ${id} · ${list.filter(d => d.slot === ui.run && d.zone === id).length} drops`]), ui.zone)}</div>
    <div class="grid2 wide-l">
      <article class="card"><header><div><h3>Zone ${ui.zone} · ${SLOTS[ui.run].label} · ${PV.win(z.wins[ui.run])}</h3><span class="muted">${z.areas.map(a => a.name).join(' → ')} · fixed route order</span></div>
        <span class="tag ${l.length > PV.RIDER_CAP ? 'bad' : 'open'}">${l.length} / ${PV.RIDER_CAP} drops per rider</span></header>
        <div class="row no-print"><button class="btn" data-act="dispatch" ${packed ? '' : 'disabled'}>${ic('bike')} Dispatch packed (${packed})</button><button class="btn ghost" data-act="print">${ic('printer')} Print sheet</button><span class="muted">${left} left to deliver</span></div>
        ${l.length ? `<ol class="route">${l.map(d => `<li class="${d.status}"><span class="stop">${d.stop}</span><div><b>${esc(d.name)}</b> <small>${esc(d.phone)}</small><p>${esc(d.address)}, ${esc(PV.area(d.area).name)}</p><p class="it">${items(d)}</p></div>
          <div class="rt"><span class="st s-${d.status}">${STATUS_LABEL[d.status]}</span>${d.status === 'out' ? `<button class="btn xs" data-act="advance" data-id="${d.id}">${ic('check')} Delivered</button>` : ''}</div></li>`).join('')}</ol>` : '<p class="empty">No drops in this zone for this run.</p>'}</article>
      <article class="card mapcard no-print"><header><h3>Route progress</h3><span class="muted">${l.filter(d => d.status === 'delivered').length} of ${l.length} delivered</span></header>${l.length ? routeSvg(l, z) : '<p class="empty">No drops.</p>'}<ul class="mini"><li><i class="s-placed"></i>Confirmed</li><li><i class="s-cooking"></i>Cooking</li><li><i class="s-packed"></i>Packed</li><li><i class="s-out"></i>Out for delivery</li><li><i class="s-delivered"></i>Delivered</li></ul></article></div>`;
  }
  // Route strip: kitchen, then every stop in order, snaking row by row. The rider sits at the last delivered stop.
  function routeSvg(l, z) {
    const per = 5, rows = Math.ceil((l.length + 1) / per), H = rows * 78 + 30;
    const pt = i => { const r = Math.floor(i / per), c = i % per; return [r % 2 ? 350 - c * 75 : 50 + c * 75, 44 + r * 78]; };
    const pts = [pt(0), ...l.map((_, i) => pt(i + 1))], doneN = l.filter(d => d.status === 'delivered').length, moving = l.some(d => d.status === 'out');
    const line = n => pts.slice(0, n).map((q, i) => `${i ? 'L' : 'M'}${q[0]} ${q[1]}`).join(' ');
    const fill = { placed: '#fff', cooking: '#FFF5DC', packed: '#EAF1FF', out: '#7C3AED', delivered: z.color };
    const [rx, ry] = pts[doneN];
    return `<svg class="routesvg" viewBox="0 0 400 ${H}" role="img" aria-label="Route progress: ${doneN} of ${l.length} delivered">
      <path d="${line(pts.length)}" class="rroad"/><path d="${line(pts.length)}" class="rlane" stroke="${z.color}"/><path d="${line(doneN + 1)}" class="rdone" stroke="${z.color}"/>
      <g transform="translate(${pts[0][0]} ${pts[0][1]})"><circle r="17" fill="#13201A"/><path d="M-9 0L0 -9L9 0V8H-9Z" fill="#fff"/><text y="32" class="rl">Kitchen</text></g>
      ${l.map((d, i) => { const [x, y] = pts[i + 1], first = !i || l[i - 1].area !== d.area, dark = d.status === 'out' || d.status === 'delivered'; return `<g transform="translate(${x} ${y})"><title>${esc(d.name)} · ${STATUS_LABEL[d.status]}</title><circle r="14" fill="${fill[d.status]}" stroke="${z.color}" stroke-width="2.5"/><text y="4.5" class="rn" fill="${dark ? '#fff' : '#13201A'}">${d.stop}</text>${first ? `<text y="32" class="rl">${esc(PV.area(d.area).name)}</text>` : ''}</g>`; }).join('')}
      <g transform="translate(${rx} ${ry - 26})"><g class="rrider ${moving ? 'go' : ''}"><circle r="12" fill="#fff"/><circle r="10" fill="#13201A"/><g fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="-4" cy="3.5" r="2"/><circle cx="4.5" cy="3.5" r="2"/><path d="M-4 3.5l2.5-6h4l2 6M-1.5-2.5l-1-2h-2"/></g></g></g></svg>`;
  }

  /* ---------- SUBSCRIBERS ---------- */
  const subRows = () => {
    const q = ui.q.toLowerCase();
    return S.subs.map(s => ({ s, inf: PV.subInfo(s), p: PV.plan(s.planId) })).filter(x => !q || `${x.s.name} ${PV.area(x.s.area).name} ${x.p.name} ${x.s.slot} ${x.s.code || ''}`.toLowerCase().includes(q))
      .sort((a, b) => (b.s.mine ? 1 : 0) - (a.s.mine ? 1 : 0) || a.inf.left - b.inf.left)
      .map(({ s, inf, p }) => `<tr class="${inf.active ? '' : 'off'}"><td><b>${esc(s.name)}</b>${s.mine ? ' <span class="tag open">Website</span>' : ''}<small>${esc(s.phone)}</small></td><td>${esc(p.name)}<small>${VARIANTS[s.variant].label} portion</small></td><td>${SLOTS[s.slot].label}<small>${PV.slotWin(s.area, s.slot)}</small></td>
        <td><span class="z z${PV.area(s.area).zone}">${PV.area(s.area).zone}</span> ${esc(PV.area(s.area).name)}</td><td><div class="pg"><i style="width:${inf.done / s.days * 100}%"></i></div><small>${inf.done} of ${s.days} delivered · ends ${inf.end ? fmtDate(inf.end, { day: 'numeric', month: 'short' }) : '—'}</small></td>
        <td>${s.status === 'cancelled' ? '<span class="tag bad">Cancelled</span>' : !inf.active ? '<span class="tag">Completed</span>' : s.pauses.includes(ui.date) ? '<span class="tag warn">Paused today</span>' : inf.left <= 3 ? `<span class="tag warn">${p.id === 'trial' ? 'Offer plan' : 'Renewal due'}</span>` : '<span class="tag open">Active</span>'}<small>${s.pauses.length}/${p.pause} pauses${s.code ? ` · ${esc(s.code)}` : ''}</small></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No match.</td></tr>';
  };
  function vSubs() {
    const act = S.subs.filter(s => PV.subInfo(s).active), by = f => act.filter(f).length;
    const mrr = act.reduce((a, s) => a + PV.plan(s.planId).per, 0);
    return `<div class="kpis"><article class="kpi"><small>Active</small><b>${act.length}</b><span>${by(s => s.variant === 'protein')} protein · ${by(s => s.variant === 'diet')} diet</span></article>
      <article class="kpi"><small>26-day plans</small><b>${by(s => s.days === 26)}</b><span>${by(s => s.days === 14)} on 14-day · ${by(s => s.days === 3)} on trial</span></article>
      <article class="kpi"><small>By meal</small><b>${by(s => s.slot === 'lunch')}</b><span>lunch · ${by(s => s.slot === 'dinner')} dinner · ${by(s => s.slot === 'breakfast')} breakfast</span></article>
      <article class="kpi good"><small>Plan revenue per delivery day</small><b>${inr(mrr)}</b><span>when nobody pauses</span></article></div>
    <article class="card"><header><h3>Subscribers</h3><input id="q" type="search" placeholder="Search name, area, plan, code" value="${esc(ui.q)}" aria-label="Search subscribers"></header>
      <div class="scroll"><table class="subs"><thead><tr><th>Customer</th><th>Plan</th><th>Meal</th><th>Area</th><th>Progress</th><th>Status</th></tr></thead><tbody id="subrows">${subRows()}</tbody></table></div></article>`;
  }

  /* ---------- ZONES & WAITLIST ---------- */
  function vZones() {
    const list = all(), n = S.waitlist.length, ready = n >= PV.WAITLIST_TARGET;
    const zc = id => { const z = PV.zone(id); return `<article class="card zone" style="--zc:${z.color}"><header><h3><span class="z z${id}">${id}</span> ${z.areas.map(a => a.name).join(', ')}</h3><span class="tag ${z.open ? 'open' : ''}">${z.open ? 'Open' : 'Waitlist'}</span></header>
      ${z.open ? `<table><thead><tr><th>Run</th><th>Slot</th><th class="n">Drops</th><th>Rider load</th></tr></thead><tbody>${SLOT_IDS.map(s => { const c = list.filter(d => d.slot === s && d.zone === id).length; return `<tr><td>${SLOTS[s].label}</td><td>${PV.win(z.wins[s])}</td><td class="n big">${c}</td><td><div class="pg ${c > PV.RIDER_CAP ? 'bad' : ''}"><i style="width:${Math.min(100, c / PV.RIDER_CAP * 100)}%;background:${z.color}"></i></div><small>${c} of ${PV.RIDER_CAP}</small></td></tr>`; }).join('')}</tbody></table>` : `<p class="muted">Slots to be set. Opens at ${PV.WAITLIST_TARGET} waitlisted customers.</p>`}</article>`; };
    return `<div class="grid3">${['A', 'B', 'C'].map(zc).join('')}</div>
    <article class="card"><header><div><h3>Zone C waitlist</h3><span class="muted">The waitlist decides which zone opens next</span></div><b class="bigN">${n} <small>of ${PV.WAITLIST_TARGET}</small></b></header>
      <div class="pg tall"><i style="width:${Math.min(100, n / PV.WAITLIST_TARGET * 100)}%;background:#7C3AED"></i></div>
      <div class="row"><button class="btn ghost" data-act="demoWait">${ic('user-plus')} Add 3 demo sign-ups</button>${S.zoneC ? `<button class="btn ghost" data-act="closeC">Close Zone C again</button>` : `<button class="btn" data-act="openC" ${ready ? '' : 'disabled'}>${ic('door-open')} Open Zone C</button>`}<span class="muted">${S.zoneC ? `Open with suggested slots: ${SLOT_IDS.map(s => PV.win(PV.C_SUGGESTED[s])).join(' · ')}. Customers can now order there.` : ready ? 'Ready. Opening adds a third stop after zone B on each run.' : `${PV.WAITLIST_TARGET - n} more sign-ups needed.`}</span></div>
      <div class="scroll"><table><thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Area</th><th>Joined</th></tr></thead><tbody>${S.waitlist.map((w, i) => `<tr><td>${i + 1}</td><td><b>${esc(w.name)}</b>${w.mine ? ' <span class="tag open">Website</span>' : ''}</td><td>${esc(w.phone)}</td><td>${esc(PV.area(w.area).name)}</td><td>${new Date(w.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td></tr>`).join('')}</tbody></table></div></article>`;
  }

  /* ---------- BUSINESS ---------- */
  const calcOut = () => {
    const cost = ECON.cost - 80 + ui.ing, ppm = ECON.price - cost, fixed = ui.meals >= 50 ? ECON.fixedTotal : 40000, net = ui.meals * 26 * ppm - fixed;
    return `<div class="kpis"><article class="kpi"><small>Profit per meal</small><b>${inr(ppm)}</b><span>${inr(ECON.price)} price − ${inr(cost)} cost</span></article>
      <article class="kpi ${net >= 100000 ? 'good' : net < 0 ? 'warn' : ''}"><small>Net profit per month</small><b>${inr(net)}</b><span>26 days · ${inr(fixed)} fixed costs</span></article>
      <article class="kpi"><small>Break-even</small><b>${Math.ceil(ECON.fixedTotal / ppm / 26)} <em>meals/day</em></b><span>at full fixed costs of ${inr(ECON.fixedTotal)}</span></article>
      <article class="kpi"><small>For ₹1 lakh a month</small><b>${Math.ceil((100000 + ECON.fixedTotal) / ppm / 26)} <em>meals/day</em></b><span>the owner’s income target</span></article></div>`;
  };
  function vMoney() {
    return `<article class="card"><header><div><h3>What-if calculator</h3><span class="muted">Food cost is the number to watch most closely</span></div></header>
      <div class="sliders"><label>Ingredient cost per meal <b id="o-ing">${inr(ui.ing)}</b><input type="range" id="r-ing" min="60" max="110" value="${ui.ing}"></label><label>Meals per day <b id="o-meals">${ui.meals}</b><input type="range" id="r-meals" min="5" max="130" value="${ui.meals}"></label></div><div id="calc">${calcOut()}</div></article>
    <article class="card"><header><div><h3>Six-month plan</h3><span class="muted">Meals a day and net profit by month · the dashed line is ${dayLabel(ui.date).toLowerCase()}’s ${count(all(), () => true)} meals</span></div></header><div class="chart"><canvas id="chart" aria-label="Six month plan chart"></canvas></div>
      <div class="scroll"><table><thead><tr><th>Month</th><th class="n">Meals/day</th><th class="n">Fixed costs</th><th class="n">Net profit</th><th>Focus</th></tr></thead><tbody>${ECON.milestones.map(m => `<tr><td>${m.m}</td><td class="n">${m.meals}</td><td class="n">${inr(m.fixed)}</td><td class="n"><b>${inr(m.meals * 26 * ECON.profit - m.fixed)}</b></td><td>${m.focus}</td></tr>`).join('')}</tbody></table></div></article>
    <div class="grid2"><article class="card"><header><h3>Cost per meal</h3><span class="muted">Average price ${inr(ECON.price)}</span></header><table><tbody>${ECON.costs.map(([l, v]) => `<tr><td>${l}</td><td class="n">${inr(v)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total cost</td><td class="n">${inr(ECON.cost)}</td></tr><tr><td>Profit per meal</td><td class="n tot">${inr(ECON.profit)}</td></tr></tfoot></table></article>
      <article class="card"><header><h3>Fixed costs per month</h3><span class="muted">At full scale</span></header><table><tbody>${ECON.fixed.map(([l, v]) => `<tr><td>${l}</td><td class="n">${inr(v)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="n tot">${inr(ECON.fixedTotal)}</td></tr></tfoot></table>
        <h4>Track every month</h4><ul class="plain"><li>Renewal rate at least 60%</li><li>Cost to acquire a subscriber at most ₹700</li><li>Food cost at most ₹80 per meal</li><li>Late deliveries and complaints under 3% of meals</li></ul></article></div>`;
  }
  function drawChart() {
    if (chart) { chart.destroy(); chart = null; }
    const c = document.getElementById('chart'); if (!c || !window.Chart) return;
    const ms = ECON.milestones, meals = count(all(), () => true);
    chart = new Chart(c, {
      data: { labels: ms.map(m => `Month ${m.m}`), datasets: [
        { type: 'bar', label: 'Meals per day (plan)', data: ms.map(m => m.meals), backgroundColor: '#86C99B', borderRadius: 6, yAxisID: 'y' },
        { type: 'line', label: 'Meals today', data: ms.map(() => meals), borderColor: '#13201A', borderDash: [6, 6], pointRadius: 0, borderWidth: 2, yAxisID: 'y' },
        { type: 'line', label: 'Net profit (₹)', data: ms.map(m => m.meals * 26 * ECON.profit - m.fixed), borderColor: '#B45309', backgroundColor: '#B45309', tension: .3, borderWidth: 3, yAxisID: 'y1' }] },
      options: { animation: false, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { family: 'Plus Jakarta Sans' } } } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Meals per day' }, grid: { color: '#EEF1EC' } }, y1: { position: 'right', title: { display: true, text: 'Net profit' }, grid: { display: false }, ticks: { callback: v => inr(v) } }, x: { grid: { display: false } } } },
    });
  }

  /* ---------- REFERRALS ---------- */
  function vTrainers() {
    const row = t => {
      const subs = S.subs.filter(s => s.code === t.code && s.planId !== 'trial'), act = subs.filter(s => PV.subInfo(s).active);
      const due = subs.reduce((a, s) => a + (s.days === 26 ? 400 : 200), 0);
      return `<tr><td><b>${esc(t.name)}</b><small>${esc(t.gym)}</small></td><td><code>${t.code}</code></td><td class="n big">${act.length}</td><td class="n">${subs.filter(s => s.days === 26).length} × ₹400 + ${subs.filter(s => s.days === 14).length} × ₹200</td><td class="n"><b>${inr(due)}</b><small>UPI on the 5th</small></td><td><div class="pg"><i style="width:${Math.min(100, act.length * 10)}%"></i></div><small>${act.length} of 10 for a free 26-day plan</small></td></tr>`;
    };
    const friends = S.subs.filter(s => s.code === PV.FRIEND_CODE);
    return `<div class="kpis"><article class="kpi"><small>Reward cap per new subscriber</small><b>₹700</b><span>about a third of the ₹1,900 first-month profit</span></article>
      <article class="kpi"><small>Trainer-referred subscribers</small><b>${S.subs.filter(s => PV.TRAINERS.some(t => t.code === s.code)).length}</b><span>each got ₹100 off at checkout</span></article>
      <article class="kpi"><small>Friend referrals</small><b>${friends.length}</b><span>₹200 off for the friend · 250 coins for the referrer</span></article></div>
    <article class="card"><header><h3>Trainer codes and payouts</h3><span class="muted">Trainers are paid in cash by UPI, not coins</span></header>
      <div class="scroll"><table><thead><tr><th>Trainer</th><th>Code</th><th class="n">Active</th><th class="n">First-month rewards</th><th class="n">Payout due</th><th>Free plan</th></tr></thead><tbody>${PV.TRAINERS.map(row).join('')}</tbody></table></div></article>
    <article class="card"><header><h3>Reward rules</h3></header><div class="scroll"><table><thead><tr><th>Reward</th><th>26-day plan</th><th>14-day plan</th><th>Paid as</th><th>When</th></tr></thead><tbody>
      <tr><td>New customer discount (friend)</td><td>₹200 off</td><td>₹100 off</td><td>Discount</td><td>At checkout</td></tr><tr><td>Customer referrer</td><td>₹250</td><td>₹125</td><td>Coins</td><td>After the friend’s 5th delivered meal</td></tr>
      <tr><td>Trainer, first month</td><td>₹400</td><td>₹200</td><td>UPI cash</td><td>Monthly, on the 5th</td></tr><tr><td>Trainer, renewal bonus</td><td>₹200</td><td>₹100</td><td>UPI cash</td><td>When the customer renews for month 2</td></tr></tbody></table></div>
      <p class="muted">Coins pay for up to 20% of an order, expire after 90 days, and cannot be withdrawn. A customer can use only one code.</p></article>`;
  }

  /* ---------- actions ---------- */
  const act = {
    nav: e => { ui.view = e.v; history.replaceState(null, '', '#' + e.v); render(); window.scrollTo(0, 0); },
    date: e => { ui.date = e.v; render(); },
    run: e => { ui.run = e.v; render(); },
    zone: e => { ui.zone = e.v; render(); },
    goRun: e => { ui.run = e.run; act.nav(e); },
    advance: e => PV.advance(e.id),
    bulk: e => { const l = all().filter(d => d.slot === ui.run && d.status === e.from); l.forEach(d => S.status[d.id] = e.to); PV.save(); toast(`${l.length} orders moved to ${STATUS_LABEL[e.to]}`); },
    dispatch: () => { const l = all().filter(d => d.slot === ui.run && d.zone === ui.zone && d.status === 'packed'); l.forEach(d => S.status[d.id] = 'out'); PV.save(); toast(`Zone ${ui.zone} rider dispatched with ${l.length} drops`); },
    print: () => window.print(),
    demoWait: () => { [0, 1, 2].forEach(i => S.waitlist.push({ name: `Demo sign-up ${S.waitlist.length + 1}`, phone: '98•••00000', area: i % 2 ? 'infocity' : 'sectors', ts: Date.now() })); PV.save(); },
    openC: () => { S.zoneC = PV.C_SUGGESTED; PV.save(); toast('Zone C is open — it now shows on the customer map'); },
    closeC: () => { S.zoneC = null; PV.save(); },
    reset: () => { PV.reset(); toast('Demo data reset'); },
  };
  document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && !el.disabled) act[el.dataset.act]({ ...el.dataset }); });
  document.addEventListener('input', e => {
    if (e.target.id === 'q') { ui.q = e.target.value; $('#subrows').innerHTML = subRows(); }
    if (e.target.id === 'r-ing' || e.target.id === 'r-meals') { ui.ing = +$('#r-ing').value; ui.meals = +$('#r-meals').value; $('#o-ing').textContent = inr(ui.ing); $('#o-meals').textContent = ui.meals; $('#calc').innerHTML = calcOut(); }
  });

  /* ---------- render ---------- */
  const views = { today: vToday, cook: vCook, board: vBoard, delivery: vDelivery, subs: vSubs, zones: vZones, money: vMoney, trainers: vTrainers };
  function render() {
    S = PV.state();
    if (!views[ui.view]) ui.view = 'today';
    if (!ui.meals) ui.meals = count(all(), () => true);
    const days = PV.nextDeliveryDays(3);
    navEl.innerHTML = NAV.map(([id, i, l]) => `<button class="${ui.view === id ? 'on' : ''}" ${ui.view === id ? 'aria-current="page"' : ''} data-act="nav" data-v="${id}">${ic(i)}<span>${l}</span></button>`).join('');
    headEl.innerHTML = `<div><h1>${NAV.find(n => n[0] === ui.view)[2]}</h1><p>${fmtDate(ui.date, { weekday: 'long', day: 'numeric', month: 'long' })}${ui.date === today() ? '' : ' · no delivery on Sunday'}</p></div>${seg('date', days.map(d => [d, dayLabel(d) === 'Today' || dayLabel(d) === 'Tomorrow' ? dayLabel(d) : fmtDate(d, { weekday: 'short', day: 'numeric' })]), ui.date)}`;
    viewEl.innerHTML = views[ui.view]();
    viewEl.className = 'v-' + ui.view;
    window.lucide && lucide.createIcons();
    if (ui.view === 'money') drawChart();
  }
  PV.on(() => { const a = document.activeElement; if (a && a.matches('input[type=search],input[type=range]')) return; render(); });
  render();
})();
