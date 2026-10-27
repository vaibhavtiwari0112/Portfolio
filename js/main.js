(() => {
  const root = document.documentElement;
  try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch (e) {}
  document.getElementById('theme').addEventListener('click', () => {
    const dark = getComputedStyle(root).colorScheme === 'dark';
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) document.querySelectorAll('[data-count]').forEach(el => {
    const end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / 1200, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // Seat-lock demo: simulates a Redis SET NX EX lock with a TTL
  const TTL = 10, seatsEl = document.getElementById('seats'), logEl = document.getElementById('log'), rival = document.getElementById('rival');
  const sold = new Set([2, 3, 11, 12, 19, 25, 26, 27, 33, 40, 41, 46]);
  let held = null, timer = null, left = 0;
  const log = m => { logEl.textContent = m; };
  const id = i => 'ABCDEF'[Math.floor(i / 8)] + (i % 8 + 1);
  const seatBtn = i => seatsEl.children[i];

  for (let i = 0; i < 48; i++) {
    const b = document.createElement('button');
    b.className = 'seat' + (sold.has(i) ? ' sold' : '');
    b.disabled = sold.has(i);
    b.textContent = id(i);
    b.setAttribute('aria-label', 'Seat ' + id(i) + (sold.has(i) ? ', booked' : ''));
    b.addEventListener('click', () => lock(i));
    seatsEl.appendChild(b);
  }

  function release(reason) {
    clearInterval(timer);
    if (held === null) return;
    seatBtn(held).classList.remove('mine');
    seatBtn(held).textContent = id(held);
    log(`DEL seat:${id(held)}\n${reason}`);
    held = null; rival.disabled = true;
  }

  function lock(i) {
    if (held === i) return;
    if (held !== null) release('Previous lock released.');
    held = i; left = TTL;
    seatBtn(i).classList.add('mine');
    rival.disabled = false;
    const show = () => {
      seatBtn(i).textContent = left;
      log(`SET seat:${id(i)} user:you NX EX ${TTL}\n→ OK, lock acquired.\nExpires in ${left}s. Book it before then, or it frees up for others.`);
    };
    show();
    clearInterval(timer);
    timer = setInterval(() => { left--; left <= 0 ? release('Lock expired (TTL). The seat is free again.') : show(); }, 1000);
  }

  rival.addEventListener('click', () => {
    if (held === null) return;
    const b = seatBtn(held);
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
    logEl.textContent += `\n\nSET seat:${id(held)} user:rival NX EX ${TTL}\n→ nil. The seat is already locked, so the rival request is rejected. No double booking.`;
  });
})();

// Live GitHub repositories
(() => {
  const USER = 'vaibhavtiwari0112', box = document.getElementById('repos');
  const fail = () => { box.innerHTML = ''; const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Repositories could not load right now. Use the button below to browse them on GitHub.'; box.appendChild(p); };
  fetch(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`)
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(list => {
      const repos = list.filter(r => !r.fork && !r.archived && !/eventura|portfolio/i.test(r.name))
        .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at))).slice(0, 6);
      if (!repos.length) return fail();
      box.innerHTML = '';
      repos.forEach(r => {
        const a = document.createElement('a'); a.className = 'repo'; a.href = r.homepage || r.html_url; a.target = '_blank'; a.rel = 'noopener';
        const h = document.createElement('h3'); h.textContent = r.name;
        const p = document.createElement('p'); p.textContent = r.description || 'No description yet.';
        const m = document.createElement('div'); m.className = 'meta';
        m.textContent = [r.language, r.stargazers_count ? '★ ' + r.stargazers_count : ''].filter(Boolean).join('   ');
        a.append(h, p, m); box.appendChild(a);
      });
    }).catch(fail);
})();
