/* Site logic — you normally don't need to edit this file. Text lives in content.js */
(() => {
  const C = window.CONTENT, P = C.profile;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  let L = store.get("lang") || ((navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en");
  const u = () => C.ui[L];
  const tr = o => (o && typeof o === "object" && "en" in o) ? o[L] : o;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const proj = id => C.projects.find(p => p.id === id);
  const stepName = k => L === "fr" ? (C.method.find(m => m.k === k) || {}).fr || k : k;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const av = (extra = "") => P.photo ? `<img class="av ${extra}" src="${P.photo}" alt="${P.name}">` : `<span class="av ${extra}">${P.initials}</span>`;

  /* ---------------- Static UI ---------------- */
  $("#av").outerHTML = av();
  $("#cvLink").href = P.cv;
  $("#mailLink").href = "mailto:" + P.email;
  let modelState = "idle"; // idle | loading | ready | off

  function apply() {
    document.documentElement.lang = L;
    document.title = u().title;
    $$("[data-t]").forEach(e => { if (u()[e.dataset.t] !== undefined) e.innerHTML = u()[e.dataset.t]; });
    $("#hint").innerHTML = modelState === "loading" ? u().hintLoading : u().hint;
    $("#inp").placeholder = u().placeholder;
    $$(".lang button").forEach(b => b.classList.toggle("on", b.dataset.l === L));
    $("#dots").innerHTML = C.projects.map(p => `<span class="h${p.hue}"><i></i>${p.title}</span>`).join("");
    $("#steps").innerHTML = C.method.map(m => `<b title="${L === "fr" ? m.fr : m.k}">${(L === "fr" ? m.fr : m.k)[0]}</b>`).join("");
    setMetric(); renderChips(); route(true);
    if ($("#modal").classList.contains("on")) renderGame();
  }
  $$(".lang button").forEach(b => b.onclick = () => { L = b.dataset.l; store.set("lang", L); apply(); });

  let mi = 0;
  function setMetric() { const m = u().metrics[mi]; $("#metric").textContent = m[0]; $("#mlbl").textContent = m[1]; }
  setInterval(() => { const el = $("#metric"); el.style.opacity = 0; setTimeout(() => { mi = (mi + 1) % u().metrics.length; setMetric(); el.style.opacity = 1; }, 300); }, 2800);
  let si = 0;
  setInterval(() => { $$("#steps b").forEach((b, i) => b.classList.toggle("on", i === si)); si = (si + 1) % C.method.length; }, 1100);

  /* ---------------- Chat ---------------- */
  const thread = $("#thread"), chips = $("#chips"), used = new Set();
  function renderChips() {
    chips.innerHTML = "";
    C.chat.filter(c => c.chip && !used.has(c.id)).slice(0, 5).forEach(c => {
      const b = document.createElement("button"); b.className = "chip"; b.textContent = c.chip[L];
      b.onclick = () => converse(c.chip[L], c); chips.appendChild(b);
    });
  }
  function add(cls, html) { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; thread.appendChild(d); thread.scrollTop = thread.scrollHeight; return d; }
  function richCards(go) {
    const items = go.map(g => {
      const p = proj(g);
      if (p) return `<a class="rich h${p.hue}" href="#/p/${p.id}"><small>${p.kind === "pro" ? u().pro : u().perso}</small><h4>${p.title} →</h4><p>${tr(p.oneLiner).split(/[.:]/)[0]}.</p></a>`;
      if (g === "method") return `<a class="rich" href="#/method"><small>${u().cMethod}</small><h4>Signal → Scale →</h4><p>${C.method.map(m => L === "fr" ? m.fr : m.k).join(" · ")}</p></a>`;
      if (g === "game") return `<button class="rich" data-play="1"><small>${u().cPlay}</small><h4>${u().cPlayH} ▶</h4><p>${u().cPlayL}</p></button>`;
      if (g === "cv") return `<a class="rich" href="${P.cv}" download><small>CV · PDF</small><h4>${L === "fr" ? "Télécharger mon CV" : "Download my CV"} ↓</h4><p>${P.name}</p></a>`;
      return "";
    }).filter(Boolean);
    if (items.length) add("richs" + (items.length === 1 ? " one" : ""), items.join(""));
    // follow-up questions (go entries that are other chat answers)
    const fol = go.map(g => C.chat.find(c => c.id === g)).filter(c => c && !proj(c.id) && !["method", "game", "cv"].includes(c.id));
    if (fol.length) follow(fol);
  }
  const label = c => (c.chip || c.label) ? (c.chip || c.label)[L] : c.id;
  function follow(list) {
    const d = add("follow", "");
    list.forEach(c => { const b = document.createElement("button"); b.textContent = label(c) + " →"; b.onclick = () => converse(label(c), c); d.appendChild(b); });
  }
  async function converse(text, entry) {
    document.body.classList.add("started");
    add("msg me", esc(text));
    const t = add("msg bot typing", "<span></span><span></span><span></span>");
    const started = Date.now();
    if (entry === undefined) entry = await match(text);
    await new Promise(r => setTimeout(r, Math.max(0, 600 - (Date.now() - started))));
    if (entry) { used.add(entry.id); renderChips(); }
    const html = entry ? entry.a[L] : u().fallback;
    const tmp = document.createElement("div"); tmp.innerHTML = html; const plain = tmp.textContent;
    t.classList.remove("typing"); t.textContent = "";
    let n = 0;
    const iv = setInterval(() => {
      n += 4; t.textContent = plain.slice(0, n); thread.scrollTop = thread.scrollHeight;
      if (n >= plain.length) { clearInterval(iv); t.innerHTML = html; if (entry && entry.go) richCards(entry.go); if (!entry) follow(shuffle(C.chat.filter(c => (c.chip || c.label) && !used.has(c.id) && !["hello", "thanks", "salary"].includes(c.id))).slice(0, 4)); }
    }, 14);
  }

  /* Matching: small open-source model in the browser (semantic), keywords as backup */
  function kwScore(q, c) {
    const s = " " + norm(q) + " "; let n = 0;
    c.kw.forEach(k => {
      k = norm(k);
      const hit = k.length <= 4 ? new RegExp("(^|[^a-z])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z]|$)").test(s) : s.includes(k);
      if (hit) n += 1 + k.length / 100;
    });
    return n;
  }
  let model = null, bank = null, modelP = null;
  function loadModel() {
    if (modelP) return modelP;
    modelState = "loading"; $("#hint").innerHTML = u().hintLoading;
    modelP = (async () => {
      const tf = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3");
      tf.env.allowLocalModels = false;
      const ext = await tf.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
      const texts = [], ids = [];
      C.chat.forEach((c, i) => { [...c.ex, ...(c.chip ? [c.chip.en, c.chip.fr] : [])].forEach(x => { texts.push(x); ids.push(i); }); });
      const out = await ext(texts, { pooling: "mean", normalize: true });
      bank = { vecs: out.tolist(), ids }; model = ext; modelState = "ready";
    })().catch(e => { console.warn("AI model unavailable, using keyword matching.", e); modelState = "off"; })
      .finally(() => { $("#hint").innerHTML = u().hint; });
    return modelP;
  }
  async function match(q) {
    const kws = C.chat.map(c => kwScore(q, c));
    if (!model && modelP) await Promise.race([modelP, new Promise(r => setTimeout(r, 7000))]);
    let best = -1, bs = 0;
    if (model && bank) {
      try {
        const v = (await model(q, { pooling: "mean", normalize: true })).tolist()[0];
        const sc = new Array(C.chat.length).fill(0);
        bank.vecs.forEach((b, j) => { let d = 0; for (let k = 0; k < v.length; k++) d += v[k] * b[k]; const i = bank.ids[j]; if (d > sc[i]) sc[i] = d; });
        sc.forEach((s, i) => { const t = s + 0.12 * Math.min(kws[i], 2); if (t > bs) { bs = t; best = i; } });
        return bs >= 0.42 ? C.chat[best] : null;
      } catch (e) { console.warn(e); }
    }
    kws.forEach((k, i) => { if (k > bs) { bs = k; best = i; } });
    return bs > 0 ? C.chat[best] : null;
  }
  $("#inp").addEventListener("focus", loadModel, { once: true });
  $("#form").onsubmit = e => { e.preventDefault(); const v = $("#inp").value.trim(); if (!v) return; $("#inp").value = ""; loadModel(); converse(v); };
  $$(".card[data-ask]").forEach(c => c.onclick = () => { const x = C.chat.find(q => q.id === c.dataset.ask); converse(x.chip ? x.chip[L] : x.id, x); });

  /* ---------------- Game ---------------- */
  const G = { qs: [], order: [], i: 0, score: 0, picked: null, done: false, tag: null };
  // Never repeat a question until the visitor has seen them all
  let seen = []; try { seen = JSON.parse(store.get("seenQ") || "[]"); } catch (e) {}
  function openGame(tag) {
    const pool = C.game.map((g, i) => i);
    let avail = pool.filter(i => !seen.includes(i));
    if (avail.length < 5) { const last = seen.slice(-5); seen = []; avail = pool.filter(i => !last.includes(i)); }
    const pick = shuffle(avail).slice(0, 5);
    seen = seen.concat(pick); store.set("seenQ", JSON.stringify(seen));
    G.qs = pick.map(i => C.game[i]); G.order = G.qs.map(() => shuffle([0, 1, 2]));
    Object.assign(G, { i: 0, score: 0, picked: null, done: false, tag: tag || null });
    renderGame(); $("#modal").classList.add("on");
  }
  function closeGame() { $("#modal").classList.remove("on"); }
  function renderGame() {
    const ui = u(), n = G.qs.length;
    const head = `<div class="g-head"><span>${G.tag ? ui.gameProject + " · " + proj(G.tag).title : ui.gameTitle}</span><div class="prog">${G.qs.map((_, i) => `<i class="${G.done || i <= G.i ? "on" : ""}"></i>`).join("")}</div><button class="x" data-close aria-label="Close">✕</button></div>`;
    if (G.done) {
      const r = G.score / n, res = ui.results[r === 1 ? 0 : r >= 0.6 ? 1 : 2];
      $("#game").innerHTML = head + `<div class="result"><small style="font-size:11.5px;letter-spacing:1.6px;text-transform:uppercase;font-weight:700;color:var(--acc)">${ui.score}</small><div class="sc">${G.score}<span>/${n}</span></div><h2>${res[1]}</h2><p>${res[2]}</p><div class="btns"><button class="next" data-again>${ui.again}</button><button class="ghost" data-close>${ui.close}</button></div></div>`;
      return;
    }
    const q = G.qs[G.i], ord = G.order[G.i], ans = G.picked !== null;
    $("#game").innerHTML = head + `<div class="gq" style="margin-top:22px"><small>${ui.scenario} ${G.i + 1}/${n}</small><h2>${q.q[L]}</h2>
      <div class="opts">${ord.map((oi, k) => `<button class="opt ${ans ? (oi === 0 ? "best" : (oi === G.picked ? "mine" : "dim")) : ""}" data-o="${oi}" ${ans ? "disabled" : ""}><b>${ui.option} ${"ABC"[k]}</b>${q.o[L][oi]}</button>`).join("")}</div>
      <div class="reveal ${ans ? "on" : ""}">${av()}<p>${ans ? (G.picked === 0 ? ui.right : ui.wrong) + q.w[L] : ""}</p><button class="next" data-next>${G.i < n - 1 ? ui.next : ui.finish}</button></div></div>`;
  }
  $("#game").addEventListener("click", e => {
    const o = e.target.closest("[data-o]");
    if (o && G.picked === null) { G.picked = +o.dataset.o; if (G.picked === 0) G.score++; renderGame(); return; }
    if (e.target.closest("[data-next]")) { G.i++; G.picked = null; if (G.i >= G.qs.length) G.done = true; renderGame(); return; }
    if (e.target.closest("[data-again]")) { openGame(G.tag); return; }
    if (e.target.closest("[data-close]")) closeGame();
  });
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeGame(); });
  addEventListener("keydown", e => { if (e.key === "Escape") closeGame(); });
  document.addEventListener("click", e => { const p = e.target.closest("[data-play]"); if (p) { e.preventDefault(); openGame(p.dataset.tag); } });

  /* ---------------- Pages ---------------- */
  const ART = {
    1: `<svg viewBox="0 0 300 300" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2"><rect x="60" y="80" width="150" height="56" rx="22" fill="rgba(255,255,255,.55)"/><rect x="100" y="152" width="140" height="56" rx="22" fill="rgba(255,255,255,.35)"/><circle cx="92" cy="108" r="5" fill="#fff"/><circle cx="112" cy="108" r="5" fill="#fff"/><circle cx="132" cy="108" r="5" fill="#fff"/><path d="M130 180h80M130 194h50" stroke-linecap="round"/></svg>`,
    2: `<svg viewBox="0 0 300 300" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"><circle cx="150" cy="150" r="40"/><circle cx="150" cy="150" r="75" stroke-dasharray="4 8"/><circle cx="150" cy="150" r="110" stroke-dasharray="2 10"/><circle cx="150" cy="150" r="10" fill="#fff"/><circle cx="215" cy="112" r="7" fill="rgba(255,255,255,.9)"/><circle cx="92" cy="196" r="6" fill="rgba(255,255,255,.7)"/><path d="M150 150L215 112" stroke-linecap="round"/></svg>`,
    3: `<svg viewBox="0 0 300 300" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2.2" stroke-linecap="round"><path d="M30 130c30-26 60-26 90 0s60 26 90 0 60-26 90 0"/><path d="M30 165c30-26 60-26 90 0s60 26 90 0 60-26 90 0" opacity=".7"/><path d="M30 200c30-26 60-26 90 0s60 26 90 0 60-26 90 0" opacity=".45"/><text x="150" y="98" text-anchor="middle" font-family="Georgia" font-size="34" fill="#fff" stroke="none" opacity=".9">« … »</text></svg>`,
    4: `<svg viewBox="0 0 300 300" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2"><rect x="70" y="180" width="30" height="50" rx="8" fill="rgba(255,255,255,.4)"/><rect x="115" y="150" width="30" height="80" rx="8" fill="rgba(255,255,255,.5)"/><rect x="160" y="115" width="30" height="115" rx="8" fill="rgba(255,255,255,.6)"/><rect x="205" y="80" width="30" height="150" rx="8" fill="rgba(255,255,255,.75)"/><path d="M70 150l45-30 45 10 60-60" stroke-linecap="round" stroke-linejoin="round"/><circle cx="220" cy="70" r="9" fill="#fff"/></svg>`
  };
  const SH = {
    pro: {
      en: { d: "What we learned first", f: "Reframing the problem", t: "The calls we made", g: "Inside the product", j: "From proof to scale", i: "What changed", l: "What I learned" },
      fr: { d: "Ce que nous avons appris d'abord", f: "Recadrer le problème", t: "Les décisions prises", g: "Aperçu du produit", j: "De la preuve à l'échelle", i: "Ce qui a changé", l: "Ce que j'en retiens" } },
    perso: {
      en: { d: "What I learned first", f: "Reframing the problem", t: "The calls I made", g: "Inside the app", j: "From proof to scale", i: "Where it stands", l: "What I learned" },
      fr: { d: "Ce que j'ai appris d'abord", f: "Recadrer le problème", t: "Les choix que j'ai faits", g: "Aperçu de l'appli", j: "De la preuve à l'échelle", i: "Où en est le projet", l: "Ce que j'en retiens" } }
  };
  function gallery(p, sh) {
    const g = p.gallery || [];
    if (!g.length) return "";
    const wide = g[0].wide;
    return `<section class="sec">${'<div class="sh"><span class="n">' + (L === "fr" ? "Aperçu" : "Preview") + '</span><h2>' + sh.g + '</h2></div>'}
      <div class="gal ${wide ? "wide" : "tall"}">${g.map((x, i) => `<figure data-zoom="${i}"><div class="shot"><img src="${x.src}" alt="${esc(tr(x.cap))}" loading="lazy"></div><figcaption>${tr(x.cap)}</figcaption></figure>`).join("")}</div></section>`;
  }
  function footer() { return `<footer>© ${new Date().getFullYear()} ${P.name} · <a href="mailto:${P.email}">${P.email}</a> · <a href="${P.linkedin}" target="_blank" rel="noopener">LinkedIn</a></footer>`; }
  function renderProject(p) {
    const ui = u(), sh = SH[p.kind][L], nx = C.projects[(C.projects.indexOf(p) + 1) % C.projects.length];
    const hdr = (tag, h) => `<div class="sh"><span class="n">${tag}</span><h2>${h}</h2></div>`;
    $("#page").innerHTML = `<div class="wrap h${p.hue}">
      <a class="back" href="#/">${ui.back}</a>
      <section class="p-hero"><div><span class="pill"><i></i>${tr(p.kicker)}</span><h1>${p.title}</h1><p class="lead">${tr(p.oneLiner)}</p></div>
        ${p.hero ? `<figure class="mock ${p.hero.dark ? "dark" : ""}" data-zoom="hero"><div class="shot"><img src="${p.hero.src}" alt="${esc(tr(p.hero.cap))}"></div><figcaption>${tr(p.hero.cap)} <span>⤢</span></figcaption></figure>` : `<div class="art"><div class="o o1"></div><div class="o o2"></div>${ART[p.hue]}<span class="label">${p.kind === "pro" ? ui.pro : ui.perso}</span></div>`}</section>
      <div class="meta">${p.meta.map(([k, v]) => `<div><small>${tr(k)}</small><span>${tr(v)}</span></div>`).join("")}</div>
      <div class="tech">${p.tech.map(t => `<span>${t}</span>`).join("")}</div>
      <section class="sec"><div class="sh"><span class="n">${ui.sQuestion}</span></div><p class="quote">${tr(p.question)}</p></section>
      <section class="sec">${hdr("01 · " + stepName("Discover"), sh.d)}<div class="grid3">${p.discover.map(([t, d], i) => `<div class="box"><div class="k">0${i + 1}</div><h3>${tr(t)}</h3><p>${tr(d)}</p></div>`).join("")}</div></section>
      <section class="sec">${hdr("02 · " + stepName("Frame"), sh.f)}<div class="compare"><div class="c c1"><small>${ui.ask}</small><p>${tr(p.ask)}</p></div><div class="ar">→</div><div class="c c2"><small>${ui.real}</small><p>${tr(p.real)}</p></div></div></section>
      <section class="sec">${hdr("03 · " + ui.sTrade, sh.t)}<div class="trades">${p.tradeoffs.map(([o, pr, co, ch], j) => `<div class="tr ${ch ? "ch" : ""}"><div><small>${ui.option2} ${"ABCD"[j]}</small><b>${tr(o)}</b></div><div><small>${ui.pros}</small><span>${tr(pr)}</span></div><div><small>${ui.cons}</small><span>${tr(co)}</span></div>${ch ? `<span class="ok">✓ ${ui.chosen}</span>` : `<span class="no"></span>`}</div>`).join("")}</div><p class="note">${tr(p.tradeNote)}</p></section>
      ${gallery(p, sh)}
      <section class="sec">${hdr("04 · " + stepName("Prove") + " → " + stepName("Scale"), sh.j)}<div class="journey">${p.journey.map(([s, t, d], i) => `<div class="js"><div class="dot">${i + 1}</div><span class="stg">${stepName(s)}</span><h3>${tr(t)}</h3><p>${tr(d)}</p></div>`).join("")}</div></section>
      <section class="sec">${hdr("05 · " + ui.sImpact, sh.i)}<div class="impact">${p.impact.map(([n, l]) => `<div><b>${n}</b><span>${tr(l)}</span></div>`).join("")}</div></section>
      <section class="sec">${hdr("06 · " + ui.sLearn, sh.l)}<div class="learn">${p.learnings.map(l => `<div>${tr(l)}</div>`).join("")}</div></section>
      <section class="cta"><button class="play" data-play="1"><small>${ui.cPlay}</small><h3>${ui.playThis} ▶</h3></button>
        <a class="nx h${nx.hue}" href="#/p/${nx.id}"><small>${ui.nextProject}</small><h3>${nx.title} →</h3></a></section>
    </div>${footer()}`;
  }
  function renderMethod() {
    const ui = u();
    $("#page").innerHTML = `<div class="wrap">
      <a class="back" href="#/">${ui.back}</a>
      <section class="m-hero"><span class="pill h1"><i></i>Signal → Scale</span><h1>${ui.methodTitle.replace(/:(.*)$/, ":<em>$1</em>")}</h1><p>${ui.methodIntro}</p></section>
      <div class="loop">${C.method.map((m, i) => `<div class="ls ${m.k === "Prove" ? "key" : ""}"><div class="i">0${i + 1}</div><h3>${L === "fr" ? m.fr : m.k}</h3><div class="fr">${L === "fr" ? m.k : ""}</div><div class="ln">${tr(m.line)}</div><p>${tr(m.d)}</p></div>`).join("")}</div>
      <p class="back-loop">↻ ${L === "fr" ? "<b>Déployer</b> nourrit la prochaine <b>exploration</b>" : "<b>Scale</b> feeds the next <b>Discover</b>"}</p>
      <section class="sec"><div class="sh"><span class="n">${L === "fr" ? "En pratique" : "In practice"}</span><h2>${L === "fr" ? "La méthode appliquée à 4 projets" : "The loop applied to 4 projects"}</h2></div>
      <div class="richs" style="width:100%;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));animation:none">${C.projects.map(p => `<a class="rich h${p.hue}" href="#/p/${p.id}"><small>${p.kind === "pro" ? ui.pro : ui.perso}</small><h4>${p.title} →</h4><p>${tr(p.oneLiner).split(/[.:]/)[0]}.</p></a>`).join("")}</div></section>
      <section class="cta"><button class="play" data-play="1"><small>${ui.cPlay}</small><h3>${ui.cPlayH} ▶</h3></button><a class="nx" href="#/"><small>${L === "fr" ? "Une question ?" : "A question?"}</small><h3>${L === "fr" ? "Demandez-moi →" : "Ask me →"}</h3></a></section>
    </div>${footer()}`;
  }
  /* Lightbox for screenshots */
  document.addEventListener("click", e => {
    const f = e.target.closest("[data-zoom]");
    if (f) { const img = f.querySelector("img"); const lb = document.createElement("div"); lb.className = "lb"; lb.innerHTML = `<img src="${img.src}" alt=""><p>${f.querySelector("figcaption").innerHTML}</p>`; lb.onclick = () => lb.remove(); document.body.appendChild(lb); return; }
  });
  addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".lb").forEach(x => x.remove()); });
  function route(keepScroll) {
    const h = location.hash; let m;
    const page = (m = h.match(/^#\/p\/(\w+)/)) && proj(m[1]) ? "p" : h === "#/method" ? "m" : "";
    document.body.classList.toggle("page", !!page);
    document.body.classList.toggle("home", !page);
    if (page === "p") renderProject(proj(m[1]));
    else if (page === "m") renderMethod();
    if (page && !keepScroll) window.scrollTo(0, 0);
  }
  addEventListener("hashchange", () => route(false));

  apply();
})();
