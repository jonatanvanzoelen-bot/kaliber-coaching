// Kaliber Coaching: all text and results come from content/site.json and content/results.json,
// which the admin panel edits. This file only puts them on the page.
const $ = (s, el = document) => el.querySelector(s);
const el = (tag, props = {}, kids = []) => {
  const n = Object.assign(document.createElement(tag), props);
  kids.forEach(k => n.append(k));
  return n;
};
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
// the admin panel writes image paths as /assets/img/...; relative keeps them working on github.io/<repo>/ too
const rel = p => (p || '').replace(/^\/+/, '');
const RESULTS_STEP = 9;

async function load(file) {
  const r = await fetch(file, { cache: 'no-cache' });
  if (!r.ok) throw new Error(file + ' ' + r.status);
  return r.json();
}

function photo(holder, src, alt) {
  if (!src) return;
  holder.classList.add('has-img');
  holder.append(el('img', { src, alt, loading: 'lazy' }));
}

function renderSite(c) {
  document.querySelectorAll('[data-k]').forEach(n => { n.textContent = get(c, n.dataset.k) ?? ''; });

  if (c.hero.image) {     // the portrait already sits in its own reticle, so it replaces the drawn one
    const r = $('.reticle');
    r.classList.add('has-photo');
    r.removeAttribute('aria-hidden');
    r.replaceChildren(el('img', { src: rel(c.hero.image), alt: 'Jonatan van Zoelen, Kaliber Coaching', width: 1080, height: 1080 }));
  }
  if (c.about.image) photo($('#aboutPhoto'), rel(c.about.image), 'Jonatan van Zoelen');
  else $('.about-grid').classList.add('no-photo');
  c.hero.stats.forEach(s => $('#stats').append(el('div', { className: 'stat' }, [el('b', { textContent: s.value }), el('span', { textContent: s.label })])));
  c.problem.items.forEach(t => $('#problemItems').append(el('li', { textContent: t })));
  c.about.paragraphs.forEach(t => $('#aboutText').append(el('p', { textContent: t })));
  const step = s => el('li', {}, [el('h3', { textContent: s.name }), el('p', { textContent: s.text })]);
  c.method.steps.forEach(s => $('#methodSteps').append(step(s)));
  c.process.steps.forEach(s => $('#processSteps').append(step(s)));
  c.faq.items.forEach(f => $('#faqItems').append(el('details', {}, [el('summary', { textContent: f.q }), el('p', { textContent: f.a })])));

  const s = c.settings;
  const ig = $('#igLink');
  ig.href = s.instagram;
  ig.textContent = 'Instagram ' + s.instagram_handle;
  if (s.shop_enabled && s.shop_url) {
    const shop = $('#shopLink');
    shop.hidden = false;
    shop.href = s.shop_url;
    shop.textContent = s.shop_label || 'Merch';
    shop.target = '_blank';
    shop.rel = 'noopener';
  }
  calendly(s.calendly);
}

function renderResults(items) {
  const grid = $('#resultsGrid'), more = $('#moreResults');
  let shown = 0;
  const add = () => {
    items.slice(shown, shown + RESULTS_STEP).forEach(r => {
      const imgs = (r.images && r.images.length ? r.images : (r.image ? [r.image] : [])).filter(Boolean).map(rel);
      const btn = el('button', { type: 'button', ariaLabel: 'Visa större bild: ' + (r.name || 'klientresultat') });
      if (imgs.length) {
        // a smaller copy is used in the grid when there is one (name-liten.webp), otherwise the image itself
        const cover = el('img', { alt: 'Före och efter: ' + (r.name || 'klient'), loading: 'lazy' });
        cover.onerror = () => { cover.onerror = null; cover.src = imgs[0]; };
        cover.src = imgs[0].replace(/\.webp$/, '-liten.webp');
        btn.append(cover);
        if (imgs.length > 1) btn.append(el('span', { className: 'count', textContent: imgs.length + ' bilder' }));
        btn.addEventListener('click', () => lightbox(imgs));
      }
      const text = el('div', {}, [el('h3', { textContent: r.name || '' }), el('p', { textContent: r.text || '' })]);
      grid.append(el('article', { className: 'result reveal' }, r.name || r.text ? [btn, text] : [btn]));
    });
    shown = Math.min(shown + RESULTS_STEP, items.length);
    more.hidden = shown >= items.length;
    reveal();
  };
  more.addEventListener('click', add);
  add();
}

// one client's images, large, with arrows (and arrow keys) between the angles
function lightbox(imgs) {
  const box = $('#lightbox'), pic = $('img', box), count = $('.lb-count', box);
  let i = 0;
  const show = n => {
    i = (n + imgs.length) % imgs.length;
    pic.src = imgs[i];
    count.textContent = imgs.length > 1 ? `${i + 1} / ${imgs.length}` : '';
  };
  const keys = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(i + 1);
    if (e.key === 'ArrowLeft') show(i - 1);
  };
  const close = () => { box.hidden = true; document.removeEventListener('keydown', keys); };
  box.querySelectorAll('.lb-nav').forEach(b => { b.hidden = imgs.length < 2; });
  $('.lb-prev', box).onclick = e => { e.stopPropagation(); show(i - 1); };
  $('.lb-next', box).onclick = e => { e.stopPropagation(); show(i + 1); };
  pic.onclick = e => { e.stopPropagation(); show(i + 1); };
  box.onclick = close;
  document.addEventListener('keydown', keys);
  show(0);
  box.hidden = false;
}

// The booking calendar is Calendly's own page in a frame. It loads only when the section is near the screen.
function calendly(url) {
  const box = $('#calendly'), link = $('#calendlyFallback');
  link.href = url;
  const theme = 'hide_gdpr_banner=1&background_color=17171a&text_color=ffffff&primary_color=d11e3c';
  const src = url + (url.includes('?') ? '&' : '?') + theme;
  new IntersectionObserver((entries, io) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    box.replaceChildren(el('iframe', { src, title: 'Boka ett videosamtal', loading: 'lazy' }));
  }, { rootMargin: '600px' }).observe(box);
}

function reveal() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll('.reveal:not(.in)').forEach(n => io.observe(n));
}

function nav() {
  const bar = $('#nav'), burger = $('#burger'), links = $('#navLinks');
  addEventListener('scroll', () => bar.classList.toggle('scrolled', scrollY > 20), { passive: true });
  const toggle = open => { links.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); };
  burger.addEventListener('click', () => toggle(!links.classList.contains('open')));
  links.addEventListener('click', e => e.target.closest('a') && toggle(false));
}

(async () => {
  nav();
  $('#year').textContent = new Date().getFullYear();
  try {
    const [site, results] = await Promise.all([load('content/site.json'), load('content/results.json')]);
    renderSite(site);
    renderResults(results.items || []);
  } catch (err) {
    console.error('Kunde inte läsa innehållet', err);
  }
  document.querySelectorAll('.section h2, .intro, .steps li, .process li, .checks li, .punch, .about-photo, .prose, .faq details').forEach(n => n.classList.add('reveal'));
  reveal();
})();
