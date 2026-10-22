import { useEffect, useMemo, useRef, useState } from 'react';

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const NAV = [['home', 'Home'], ['about', 'About'], ['skills', 'Skills'], ['projects', 'Projects'], ['journey', 'Journey'], ['contact', 'Contact']];
const SECTIONS = { home: 'home', about: 'about', skills: 'skills', projects: 'projects', journey: 'journey', experience: 'journey', education: 'journey', github: 'github', blog: 'blog', contact: 'contact' };
const TOPICS = ['Job opportunity', 'Freelance project', 'Collaboration', 'General', 'Just saying hi'];
const CMDS = ['help', 'about', 'skills', 'projects', 'experience', 'education', 'contact', 'cv', 'theme', 'open', 'clear', 'whoami', 'ls', 'github'];
const QUICK = ['help', 'skills', 'projects', 'theme', 'cv'];

// Technology logos for the moving strip (from the open-source Devicon set). Names not listed are skipped.
const ICON = { mongodb: 'mongodb', express: 'express', react: 'react', node: 'nodejs', html5: 'html5', html: 'html5', css3: 'css3', css: 'css3', javascript: 'javascript', typescript: 'typescript', python: 'python', java: 'java', 'c++': 'cplusplus', php: 'php', sql: 'mysql', mysql: 'mysql', postgresql: 'postgresql', git: 'git', github: 'github', vite: 'vitejs', tailwindcss: 'tailwindcss', tailwind: 'tailwindcss', redux: 'redux', nextjs: 'nextjs', docker: 'docker', firebase: 'firebase' };
const INVERT = new Set(['express', 'github', 'nextjs']); // black logos that need inverting in dark mode
function techLogos(names) {
  const seen = new Set();
  return names.flatMap((n) => {
    const slug = ICON[n.toLowerCase().replace(/\.js$/, '').replace(/[^a-z0-9+]/g, '')];
    if (!slug || seen.has(slug)) return [];
    seen.add(slug);
    return [{ name: n, inv: INVERT.has(slug), src: `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}/${slug}-original.svg` }];
  });
}

function Rv({ children, delay = 0, className = '', side = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (reduce()) { el.classList.add('in'); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`rv ${side} ${className}`} style={{ '--d': delay + 'ms' }}>{children}</div>;
}

function Tilt({ children, className = '' }) {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current, r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
    if (!reduce()) { el.style.setProperty('--ry', (x / r.width - 0.5) * 7 + 'deg'); el.style.setProperty('--rx', (0.5 - y / r.height) * 7 + 'deg'); }
  };
  const leave = () => { ref.current.style.setProperty('--rx', '0deg'); ref.current.style.setProperty('--ry', '0deg'); };
  return <div ref={ref} className={`tilt ${className}`} onMouseMove={move} onMouseLeave={leave}>{children}</div>;
}

function useRotator(words) {
  const [t, setT] = useState('');
  useEffect(() => {
    if (!words.length) return;
    if (reduce()) { setT(words[0]); return; }
    let i = 0, n = 0, del = false, id;
    const tick = () => {
      const w = words[i];
      n += del ? -1 : 1;
      setT(w.slice(0, n));
      let wait = del ? 35 : 70;
      if (!del && n === w.length) { del = true; wait = 1500; }
      else if (del && n === 0) { del = false; i = (i + 1) % words.length; wait = 350; }
      id = setTimeout(tick, wait);
    };
    tick();
    return () => clearTimeout(id);
  }, [words]);
  return t;
}

function Terminal({ p, mode, setMode }) {
  const [entries, setEntries] = useState(() => [{ cmd: 'whoami', out: [`${p.name} — ${p.title}`, "Type 'help' to see what I can do."] }]);
  const [val, setVal] = useState('');
  const [hist, setHist] = useState([]);
  const [hi, setHi] = useState(-1);
  const inp = useRef(null), scr = useRef(null);
  useEffect(() => { scr.current.scrollTop = scr.current.scrollHeight; }, [entries]);

  function run(raw) {
    const [c, ...a] = raw.trim().split(/\s+/);
    const arg = a.join(' ').toLowerCase();
    switch (c.toLowerCase()) {
      case 'help': return ['Commands:', '  about        who I am', '  skills       my tech stack', '  projects     things I built', '  experience   work history', '  education    studies and courses', '  contact      how to reach me', '  cv           download my resume',
        '  github       my GitHub profile', '  theme        switch light / dark', '  open <name>  jump to a section', '  clear        clear the screen'];
      case 'about': case 'whoami': return [`${p.name} — ${p.title}`, p.about];
      case 'skills': return p.skills.map((g) => `${g.group}: ${g.items.join(', ')}`);
      case 'projects': case 'ls': return p.projects.map((x, i) => `${i + 1}. ${x.title} [${x.tech.join(', ')}]`);
      case 'experience': return p.experience.map((x) => `${x.period}  ${x.role} @ ${x.company}`);
      case 'education': return [...p.education.map((e) => `${e.period}  ${e.degree}, ${e.school}`), ...(p.certifications || []).map((x) => `Course: ${x.title}, ${x.org}`)];
      case 'contact': case 'email': return [`Email:    ${p.email}`, `Location: ${p.location}`, ...(p.whatsapp ? [`WhatsApp: +${p.whatsapp}`] : []), "Run 'open contact' to jump to the form."];
      case 'cv': { const l = document.createElement('a'); l.href = '/api/cv.pdf'; l.download = ''; l.click(); return ['Downloading CV…']; }
      case 'theme': { const n = mode === 'dark' ? 'light' : 'dark'; setMode(n); return [`Theme set to ${n}.`]; }
      case 'open': { const id = SECTIONS[arg]; if (!id) return ['Usage: open <about|skills|projects|journey|contact>']; document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); return [`Opening ${arg}…`]; }
      case 'github': { const g = p.socials?.find((s) => /github\.com/i.test(s.url)); return g ? [g.url] : ['GitHub link not set yet.']; }
      case 'clear': setEntries([]); return null;
      case 'sudo':
        if (/hire/.test(arg)) { document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); return ['[sudo] password for recruiter: ********', 'Access granted. Excellent decision.', 'Opening the contact form…']; }
        return ['Permission denied. Nice try.'];
      case 'neofetch': return [`${p.name.split(' ')[0].toLowerCase()}@portfolio`, '------------------------', `role      ${p.title}`, `location  ${p.location}`, `stack     ${(p.skills?.[0]?.items || []).slice(0, 4).join(', ')}`, `projects  ${p.projects.length}`, `status    ${p.availableText ?? 'Open to entry-level roles'}`];
      case 'coffee': return ['Brewing…', 'Coffee ready. Productivity restored.'];
      case 'echo': return [a.join(' ')];
      case 'date': return [new Date().toString()];
      default: return [`command not found: ${c}. Type 'help'.`];
    }
  }
  function exec(c) {
    setHist((h) => [c, ...h]); setHi(-1);
    const out = run(c);
    if (out) setEntries((es) => [...es, { cmd: c, out }]);
  }
  function submit(e) { e.preventDefault(); const c = val.trim(); if (c) exec(c); setVal(''); }
  function key(e) {
    if (e.key === 'ArrowUp') { e.preventDefault(); const n = Math.min(hi + 1, hist.length - 1); if (hist[n] !== undefined) { setHi(n); setVal(hist[n]); } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); const n = hi - 1; setHi(n); setVal(n < 0 ? '' : hist[n]); }
    else if (e.key === 'Tab') { e.preventDefault(); const m = CMDS.filter((c) => c.startsWith(val.toLowerCase())); if (val && m.length === 1) setVal(m[0] + ' '); }
  }

  return (
    <div className="win" onClick={() => inp.current?.focus()}>
      <div className="bar"><i /><i /><i /><span>portfolio — interactive</span></div>
      <div className="screen" ref={scr}>
        {entries.map((e, i) => (
          <div key={i} className="ln">
            <div><span className="ps">❯</span> {e.cmd}</div>
            {e.out.map((l, j) => <div className="out" key={j}>{l}</div>)}
          </div>
        ))}
        <form onSubmit={submit} className="prompt">
          <span className="ps">❯</span>
          <input ref={inp} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={key} spellCheck="false" autoComplete="off" aria-label="Terminal command" placeholder="type a command…" />
        </form>
      </div>
      <div className="qk">{QUICK.map((c) => <button key={c} onClick={(e) => { e.stopPropagation(); exec(c); }}>{c}</button>)}</div>
    </div>
  );
}

function useGithub(url, featured = []) {
  const user = url?.match(/github\.com\/([^/?#]+)/i)?.[1];
  const names = (featured || []).map((f) => f.name).filter(Boolean);
  const key = names.join(',');
  const [g, setG] = useState(null);
  useEffect(() => {
    if (!user || !names.length) return;
    let dead = false;
    Promise.all(names.map((n) => fetch(`https://api.github.com/repos/${user}/${encodeURIComponent(n)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((list) => { if (!dead) setG({ user, repos: list.filter(Boolean) }); })
      .catch(() => {});
    return () => { dead = true; };
  }, [user, key]);
  return g;
}

function Head({ title, sub }) {
  return <Rv className="head"><h2>{title}</h2><span className="bar2" />{sub && <p>{sub}</p>}</Rv>;
}

function ContactForm() {
  const empty = { name: '', email: '', message: '', topic: 'General', website: '' };
  const [f, setF] = useState(empty);
  const [s, setS] = useState({ state: 'idle', msg: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setS({ state: 'sending', msg: '' });
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not reach the server. Please try again later.');
      setS({ state: 'done', msg: 'Message sent. I’ll reply soon.' });
      setF(empty);
    } catch (err) { setS({ state: 'error', msg: err.message }); }
  }
  return (
    <form className="card form" onSubmit={submit}>
      <h3>Send me a message</h3>
      <label>Topic<select value={f.topic} onChange={set('topic')}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label>Name<input value={f.name} onChange={set('name')} required minLength={2} autoComplete="name" placeholder="Your name" /></label>
      <label>Email<input type="email" value={f.email} onChange={set('email')} required autoComplete="email" placeholder="you@example.com" /></label>
      <label>Message<textarea rows="5" value={f.message} onChange={set('message')} required minLength={10} placeholder="Tell me about your project" /></label>
      <input className="hp" tabIndex="-1" autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} />
      <button className="btn dark" disabled={s.state === 'sending'}><span>{s.state === 'sending' ? 'Sending…' : 'Send message'}</span> <b className="ar">→</b></button>
      <p className={`status ${s.state}`} role="status">{s.msg}</p>
    </form>
  );
}

async function loadProfile() {
  const r = await fetch('/api/profile');
  const t = await r.text();
  let d = null;
  try { d = JSON.parse(t); } catch { /* not JSON: the API is down */ }
  if (!d) throw new Error('Cannot reach the server. Open a terminal in the server folder and run: npm run dev');
  if (!r.ok) throw new Error(d.error || 'Could not load the profile.');
  return d;
}

function FootClock({ tz, place }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  let time = '', hour = 12;
  try {
    time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz }).format(now);
    hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: tz }).format(now)) % 24;
  } catch { time = now.toLocaleTimeString('en-GB'); hour = now.getHours(); }
  const awake = hour >= 9 && hour < 23;
  return <span className="clock mono" aria-hidden="true"><i className={awake ? 'on' : 'off'} />{place ? `${place} · ` : ''}{time} · {awake ? 'probably online' : 'probably asleep'}</span>;
}

function Splash({ name }) {
  const ini = (name || '').split(' ').map((w) => w[0]).join('').slice(0, 2);
  return <main className="splash" aria-label="Loading"><div className="mark">{ini || '</>'}</div><div className="sbar"><i /></div></main>;
}

function Modal({ x, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, []);
  const paras = (x.details || '').split('\n').map((s) => s.trim()).filter(Boolean);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={x.title} onClick={(e) => e.stopPropagation()}>
        <button ref={ref} className="mclose" onClick={onClose} aria-label="Close">✕</button>
        {x.image && <img className="mimg" src={x.image} alt={`${x.title} screenshot`} />}
        <h3>{x.title}</h3>
        <p className="muted">{x.description}</p>
        {paras.map((t, i) => <p key={i}>{t}</p>)}
        <div className="row">{(x.tech || []).map((t) => <span className="tag" key={t}>{t}</span>)}</div>
        {(x.link || x.repo) && (
          <div className="row">
            {x.link && <a className="btn dark small" href={x.link} target="_blank" rel="noreferrer"><span>Live demo</span> <b className="ar">→</b></a>}
            {x.repo && <a className="btn ghost small" href={x.repo} target="_blank" rel="noreferrer"><span>Source code</span></a>}
          </div>
        )}
        {!x.link && <p className="note2">Live demo coming soon.</p>}
      </div>
    </div>
  );
}

function Palette({ items, onClose }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const inp = useRef(null);
  const list = items.filter((x) => x.label.toLowerCase().includes(q.toLowerCase()));
  useEffect(() => { inp.current?.focus(); }, []);
  const run = (it) => { onClose(); setTimeout(it.run, 60); };
  const key = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(v + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(v - 1, 0)); }
    else if (e.key === 'Enter' && list[i]) run(list[i]);
  };
  return (
    <div className="modal-bg pal-bg" onClick={onClose}>
      <div className="pal" role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => e.stopPropagation()}>
        <input ref={inp} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} onKeyDown={key} placeholder="Search sections, projects, actions…" aria-label="Search" />
        <ul role="listbox">
          {list.length ? list.map((it, n) => (
            <li key={it.label + n} role="option" aria-selected={n === i} className={n === i ? 'on' : ''} onMouseEnter={() => setI(n)} onClick={() => run(it)}><span>{it.label}</span><em>{it.hint}</em></li>
          )) : <li className="none">No results</li>}
        </ul>
      </div>
    </div>
  );
}

export default function App() {
  const [p, setP] = useState(null);
  const [err, setErr] = useState('');
  const [active, setActive] = useState('home');
  const [flt, setFlt] = useState('All');
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(null);
  const [pal, setPal] = useState(false);
  const [min, setMin] = useState(false);
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('mode') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; }
  });

  useEffect(() => { document.documentElement.dataset.theme = mode; try { localStorage.setItem('mode', mode); } catch {} }, [mode]);
  useEffect(() => {
    loadProfile().then(setP).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const mm = (e) => { root.style.setProperty('--cx', e.clientX + 'px'); root.style.setProperty('--cy', e.clientY + 'px'); root.style.setProperty('--px', e.clientX / innerWidth - 0.5); root.style.setProperty('--py', e.clientY / innerHeight - 0.5); };
    const sc = () => { const h = root.scrollHeight - innerHeight; root.style.setProperty('--prog', h > 0 ? root.scrollTop / h : 0); root.classList.toggle('scrolled', root.scrollTop > 600); };
    addEventListener('mousemove', mm); addEventListener('scroll', sc, { passive: true }); sc();
    return () => { removeEventListener('mousemove', mm); removeEventListener('scroll', sc); };
  }, []);
  useEffect(() => {
    if (!p) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-40% 0px -55% 0px' });
    NAV.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [p, min]);
  useEffect(() => { const t = setTimeout(() => setMin(true), 350); return () => clearTimeout(t); }, []);
  useEffect(() => { if (p) document.title = `${p.name} | ${p.title}`; }, [p]);
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal((v) => !v); } };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, []);
  useEffect(() => {
    if (!p || !min) return;
    const h = location.hash.match(/^#project-(.+)$/);
    const x = h && p.projects.find((q) => slug(q.title) === h[1]);
    if (x) setOpen(x);
  }, [p, min]);

  useEffect(() => { fetch('/api/visit', { method: 'POST', keepalive: true }).catch(() => {}); }, []);
  const words = useMemo(() => (p ? [p.title, 'Full-Stack Web Developer', 'React.js Developer', 'Problem Solver'] : []), [p]);
  const typed = useRotator(words);
  const gh = useGithub(p?.socials?.find((s) => /github\.com/i.test(s.url))?.url, p?.featuredRepos);
  const stack = useMemo(() => [...new Set((p?.skills || []).flatMap((g) => g.items))], [p]);
  const logos = useMemo(() => techLogos(stack), [stack]);
  const techs = useMemo(() => ['All', ...new Set((p?.projects || []).flatMap((x) => x.tech))], [p]);
  const journey = useMemo(() => (p ? [
    ...(p.experience || []).map((x) => ({ k: x.period, t: `${x.role} at ${x.company}`, d: x.points.slice(0, 2).join(' ') })),
    ...(p.education || []).map((e) => ({ k: e.period, t: e.degree, d: e.school })),
  ] : []), [p]);

  if (err) return <main className="center"><p>{err}</p></main>;
  if (!p || !min) return <Splash name={p?.name} />;

  const [first, ...rest] = p.name.split(' ');
  const initials = p.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  const avail = p.availableText ?? 'Open to entry-level roles';
  const aboutParas = (p.about || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const items = logos.length ? logos : stack;
  const row = Array.from({ length: Math.max(1, Math.ceil(16 / Math.max(1, items.length))) }).flatMap(() => items);
  const shown = p.projects.filter((x) => flt === 'All' || x.tech.includes(flt));
  const wa = p.whatsapp ? `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(`Hi ${first}, I found your portfolio and would like to talk.`)}` : '';
  const copy = () => navigator.clipboard?.writeText(p.email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); });
  const show = (x) => { setOpen(x); history.replaceState(null, '', `#project-${slug(x.title)}`); };
  const hide = () => { setOpen(null); history.replaceState(null, '', location.pathname); };
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const cmds = [
    ...NAV.map(([id, l]) => ({ label: `Go to ${l}`, hint: 'section', run: () => go(id) })),
    ...p.projects.map((x) => ({ label: x.title, hint: 'project', run: () => show(x) })),
    { label: mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', hint: 'action', run: () => setMode(mode === 'dark' ? 'light' : 'dark') },
    { label: 'Download CV (PDF)', hint: 'action', run: () => { const l = document.createElement('a'); l.href = '/api/cv.pdf'; l.download = ''; l.click(); } },
    { label: 'Open printable CV', hint: 'page', run: () => window.open('/cv', '_blank') },
    ...(wa ? [{ label: 'Message on WhatsApp', hint: 'link', run: () => window.open(wa, '_blank') }] : []),
    { label: 'Copy email address', hint: 'action', run: copy },
    ...(p.socials || []).map((s) => ({ label: `Open ${s.label}`, hint: 'link', run: () => window.open(s.url, '_blank') })),
  ];

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="progress" aria-hidden="true" />
      <div className="code-rain" aria-hidden="true" />
      <header className="nav">
        <a href="#home" className="logo"><span className="mono-ico">{initials}</span>{first} <b>{rest.join(' ')}</b></a>
        <nav>{NAV.map(([id, label]) => <a key={id} href={`#${id}`} className={active === id ? 'on' : ''}>{label}</a>)}</nav>
        <div className="tools">
          <button className="kbd" onClick={() => setPal(true)} aria-label="Open search (Ctrl K)"><span aria-hidden="true">⌕</span><span className="kt">Search</span><kbd>Ctrl K</kbd></button>
          <button className="mode" aria-label="Switch between light and dark" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}><span key={mode}>{mode === 'dark' ? '☀' : '☾'}</span></button>
          <a className="btn dark small" href="#contact"><span>Let’s talk</span> <b className="ar">→</b></a>
        </div>
      </header>

      <main id="main">
        <section id="home" className="hero">
          <div className="blobs" aria-hidden="true"><div className="blob b1" /><div className="blob b2" /></div>
          <div>
            {avail && <p className="badge up" style={{ '--d': '0ms' }}><i /> {avail}</p>}
            <h1 className="up" style={{ '--d': '100ms' }}>Hi, I’m {first} <span className="grad">{rest.join(' ')}</span></h1>
            <p className="role up" style={{ '--d': '220ms' }}>{typed}<span className="caret" /></p>
            <p className="tagline up" style={{ '--d': '340ms' }}>{p.tagline}</p>
            <div className="row up" style={{ '--d': '460ms' }}>
              <a className="btn dark" href="#projects"><span>View my work</span> <b className="ar">→</b></a>
              <a className="btn ghost" href="/api/cv.pdf" download><span>Download CV</span> <b className="ar dl">↓</b></a>
            </div>
          </div>
          <div className="up" style={{ '--d': '300ms' }}><Terminal p={p} mode={mode} setMode={setMode} /></div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="track">
            {[...row, ...row].map((t, i) => (typeof t === 'string'
              ? <span key={i}>{t}</span>
              : <span key={i}><img className={`tlogo${t.inv ? ' inv' : ''}`} src={t.src} alt="" title={t.name} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} /></span>))}
          </div>
        </div>

        <section id="about" className="sec">
          <Head title={p.aboutTitle || 'About me'} />
          <div className={`about${p.aboutPhoto ? ' has-photo' : ''}`}>
            {p.aboutPhoto && <Rv><Tilt className="aphoto"><img src={p.aboutPhoto} alt={`Portrait of ${p.name}`} loading="lazy" /></Tilt></Rv>}
            <div>
              {aboutParas.map((t, i) => <Rv key={i} delay={80 + i * 60}><p className="lead">{t}</p></Rv>)}
              <Rv delay={200} className="row">{p.socials?.map((s) => <a key={s.url} className="btn ghost small" href={s.url} target="_blank" rel="noreferrer"><span>{s.label}</span></a>)}<a className="btn ghost small" href="/cv" target="_blank" rel="noreferrer"><span>Printable CV</span></a></Rv>
            </div>
          </div>
        </section>

        <section id="skills" className="sec">
          <Head title="Skills & expertise" sub="Tools and technologies I work with." />
          <div className="grid">
            {p.skills.map((g, i) => (
              <Rv key={g.group} delay={(i % 3) * 90}>
                <Tilt className="card">
                  <span className="ico" style={{ '--h': i * 47 + 250 }}>{g.group[0]}</span>
                  <h3>{g.group}</h3>
                  <div className="row">{g.items.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
                </Tilt>
              </Rv>
            ))}
          </div>
        </section>

        <section id="projects" className="sec">
          <Head title="Projects" sub="Things I’ve built and practised on. Filter by technology." />
          <Rv className="filters">{techs.map((t) => <button key={t} className={flt === t ? 'f on' : 'f'} onClick={() => setFlt(t)}>{t}</button>)}</Rv>
          <div className="grid" key={flt}>
            {shown.map((x, i) => (
              <Rv key={x.title} delay={(i % 3) * 90}>
                <Tilt className="card pcard">
                  {x.image && <img className="pimg" src={x.image} alt={`${x.title} screenshot`} loading="lazy" />}
                  <h3>{x.title}</h3>
                  <p className="muted">{x.description}</p>
                  <div className="row">{x.tech.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
                  {(
                    <div className="row">
                      <button className="btn ghost small" onClick={() => show(x)}><span>Details</span> <b className="ar">→</b></button>
                      {x.link && <a className="btn dark small" href={x.link} target="_blank" rel="noreferrer"><span>Live demo</span> <b className="ar">→</b></a>}
                      {x.repo && <a className="btn ghost small" href={x.repo} target="_blank" rel="noreferrer"><span>Source code</span></a>}
                    </div>
                  )}
                </Tilt>
              </Rv>
            ))}
          </div>
        </section>

        {gh && gh.repos.length > 0 && (
          <section id="github" className="sec">
            <Head title="Open source" sub={`Selected projects on GitHub · @${gh.user}`} />
            <div className="grid">
              {gh.repos.map((r, i) => (
                <Rv key={r.id} delay={(i % 3) * 90}>
                  <Tilt className="card">
                    <h3><a href={r.html_url} target="_blank" rel="noreferrer">{r.name}</a></h3>
                    <p className="muted">{r.description || 'No description yet.'}</p>
                    <div className="row">{r.language && <span className="tag">{r.language}</span>}<span className="tag">★ {r.stargazers_count}</span></div>
                  </Tilt>
                </Rv>
              ))}
            </div>
            
          <Rv className="row center-row"><a className="btn ghost small" href={`https://github.com/${gh.user}`} target="_blank" rel="noreferrer"><span>Visit my GitHub</span> <b className="ar">→</b></a></Rv>
          </section>
        )}

        <section id="journey" className="sec">
          <Head title="My journey" sub="Experience and education so far." />
          <div className="tl">
            {journey.map((j, i) => (
              <Rv key={j.t + j.k} className="ti" side={i % 2 ? 'r' : 'l'}>
                <span className="pill">{j.k}</span>
                <h3>{j.t}</h3>
                <p className="muted">{j.d}</p>
              </Rv>
            ))}
          </div>
          {!!p.certifications?.length && <Rv className="certs">{p.certifications.map((c) => <div className="cert" key={c.title}><b>{c.title}</b><span className="muted">{c.org}</span>{c.url && <a href={c.url} target="_blank" rel="noreferrer">View certificate ↗</a>}</div>)}</Rv>}
        </section>

        {!!p.posts?.length && (
          <section id="blog" className="sec">
            <Head title="Notes & learning" sub="What I’m building and learning." />
            <div className="grid">
              {p.posts.map((x, i) => (
                <Rv key={x.title + i} delay={(i % 3) * 90}>
                  <Tilt className="card">
                    {x.date && <span className="pill">{x.date}</span>}
                    <h3 style={{ marginTop: 12 }}>{x.title}</h3>
                    <p className="muted">{x.summary}</p>
                    {x.link && <a className="btn ghost small" href={x.link} target="_blank" rel="noreferrer"><span>Read more</span> <b className="ar">→</b></a>}
                  </Tilt>
                </Rv>
              ))}
            </div>
          </section>
        )}

        {!!p.testimonials?.length && (
          <section id="testimonials" className="sec">
            <Head title="Kind words" sub="What people say about working with me." />
            <div className="grid">
              {p.testimonials.map((x, i) => (
                <Rv key={x.name + i} delay={(i % 3) * 90}>
                  <Tilt className="card quote">
                    <p>“{x.text}”</p>
                    <b>{x.name}</b>{x.role && <span className="muted"> · {x.role}</span>}
                  </Tilt>
                </Rv>
              ))}
            </div>
          </section>
        )}

        <section id="contact" className="sec">
          <Rv><h2 className="big">Let’s build <span className="grad">something great.</span></h2></Rv>
          <Rv delay={80}><p className="lead mid">Have a project or a role in mind? Send a message and I’ll get back to you.</p></Rv>
          <div className="cwrap">
            <Rv delay={120}>
              <div className="card info">
                <h3>Contact info</h3>
                {p.bookingUrl && <p><a className="btn dark small" href={p.bookingUrl} target="_blank" rel="noreferrer"><span>Book a call</span> <b className="ar">→</b></a></p>}
                <p><span className="muted">Email</span><br /><a href={`mailto:${p.email}`}>{p.email}</a> <button className="copy" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button></p>
                {wa && <p><span className="muted">WhatsApp</span><br /><a className="btn wa small" href={wa} target="_blank" rel="noreferrer"><span>Message me on WhatsApp</span> <b className="ar">→</b></a></p>}
                <p><span className="muted">Location</span><br />{p.location}</p>
                <p><span className="muted">Languages</span><br />{p.languages?.map((l) => `${l.name} (${l.level})`).join(', ')}</p>
              </div>
            </Rv>
            <Rv delay={200}><ContactForm /></Rv>
          </div>
        </section>
      </main>
      <footer className="sfoot">
        <span>© {new Date().getFullYear()} {p.name}. All rights reserved.</span>
        <FootClock tz={p.timezone || 'Asia/Karachi'} place={(p.location || '').split(',')[0].trim()} />
      </footer>
      {open && <Modal x={open} onClose={hide} />}
      {pal && <Palette items={cmds} onClose={() => setPal(false)} />}
      <button className="top" aria-label="Back to top" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
    </>
  );
}
