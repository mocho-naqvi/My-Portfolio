import { useEffect, useState } from 'react';

async function api(path, opts = {}, token) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Cannot reach the server. Make sure the API is running (npm run dev in the server folder).');
  return d;
}
const toStr = (v, t) => (t === 'csv' ? (v || []).join(', ') : (v || []).join('\n'));
const fromStr = (s, t) => (t === 'csv' ? s.split(',') : s.split('\n')).map((x) => x.trim()).filter(Boolean);

function shrink(file, max = 900, png = false) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / img.width), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.8));
    };
    img.onerror = rej; img.src = url;
  });
}

function Field({ f, value, onChange }) {
  if (f.t === 'img') return (
    <div className="imgf"><span>{f.l}</span>
      {value && <img src={value} alt="" />}
      <input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files[0]; if (file) onChange(await shrink(file, f.png ? 400 : 900, !!f.png)); }} />
      {value && <button type="button" className="del" onClick={() => onChange('')}>Remove image</button>}
    </div>
  );
  if (f.t === 'csv' || f.t === 'lines')
    return <label>{f.l}<textarea rows={f.t === 'lines' ? 4 : 2} defaultValue={toStr(value, f.t)} onBlur={(e) => onChange(fromStr(e.target.value, f.t))} /></label>;
  if (f.t === 'area') return <label>{f.l}<textarea rows="4" value={value || ''} onChange={(e) => onChange(e.target.value)} /></label>;
  return <label>{f.l}{f.h && <span className="hint">{f.h}</span>}<input value={value || ''} onChange={(e) => onChange(e.target.value)} /></label>;
}

function List({ items = [], fields, blank, onChange }) {
  const set = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  return (
    <div>
      {items.map((it, i) => (
        <div className="aitem" key={`${i}-${items.length}`}>
          <div className="agrid">{fields.map((f) => <Field key={f.k} f={f} value={it[f.k]} onChange={(v) => set(i, f.k, v)} />)}</div>
          <button className="del" onClick={() => onChange(items.filter((_, j) => j !== i))}>Delete</button>
        </div>
      ))}
      <button className="btn ghost small" onClick={() => onChange([...items, JSON.parse(JSON.stringify(blank))])}>+ Add new</button>
    </div>
  );
}

const T = (l, k, extra = {}) => ({ l, k, ...extra });
const TABS = {
  projects: { fields: [T('Title', 'title'), T('Description', 'description', { t: 'area' }), T('Case study details (shown when the project is opened, one paragraph per line)', 'details', { t: 'area' }), T('Technologies (comma separated)', 'tech', { t: 'csv' }), T('Live demo URL (leave empty to hide the button)', 'link'), T('Source code URL (leave empty to hide)', 'repo'), T('Screenshot (optional, shown on the project card)', 'image', { t: 'img' })], blank: { title: '', description: '', details: '', tech: [], link: '', repo: '', image: '' } },
  skills: { fields: [T('Group name', 'group'), T('Skills (comma separated)', 'items', { t: 'csv' })], blank: { group: '', items: [] } },
  experience: { fields: [T('Role', 'role'), T('Company', 'company'), T('Period', 'period'), T('Bullet points (one per line)', 'points', { t: 'lines' })], blank: { role: '', company: '', period: '', points: [] } },
  education: { fields: [T('Degree', 'degree'), T('School', 'school'), T('Period', 'period')], blank: { degree: '', school: '', period: '' } },
  certifications: { fields: [T('Certificate / course title', 'title'), T('Issued by', 'org'), T('Certificate link (optional, e.g. a Coursera page or PDF URL)', 'url')], blank: { title: '', org: '', url: '' } },
  posts: { fields: [T('Title', 'title'), T('Date (e.g. Oct 2026)', 'date'), T('Short summary', 'summary', { t: 'area' }), T('Link to read more (optional)', 'link')], blank: { title: '', date: '', summary: '', link: '' } },
  testimonials: { fields: [T('Person name', 'name'), T('Role / company', 'role'), T('What they said', 'text', { t: 'area' })], blank: { name: '', role: '', text: '' } },
  featuredRepos: { fields: [T('GitHub repository name, exactly as on GitHub (e.g. portfolio-app)', 'name')], blank: { name: '' } },
  socials: { fields: [T('Label (e.g. LinkedIn)', 'label'), T('URL', 'url')], blank: { label: '', url: '' } },
  languages: { fields: [T('Language', 'name'), T('Level', 'level')], blank: { name: '', level: '' } },
};
const BASICS = [
  T('Name', 'name'), T('Job title', 'title'), T('Tagline', 'tagline'), T('Email', 'email'),
  T('WhatsApp number', 'whatsapp', { h: ' (country code, no + or spaces, e.g. 923359291472)' }),
  T('Availability badge text', 'availableText', { h: ' (leave empty to hide the badge)' }),
  T('Book a call link (Calendly or Cal.com, optional)', 'bookingUrl', { h: ' (leave empty to hide the button)' }),
  T('Location', 'location'), T('Timezone for the footer clock', 'timezone', { h: ' (e.g. Asia/Karachi)' }),
];
const ABOUT = [T('Section heading', 'aboutTitle', { h: ' (default: About me)' }), T('About text (one paragraph per line)', 'about', { t: 'area' }), T('Photo (optional)', 'aboutPhoto', { t: 'img' })];

function Stats({ token }) {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/admin/stats', {}, token).then(setS).catch((e) => setErr(e.message)); }, [token]);
  if (err) return <p className="status error">{err}</p>;
  if (!s) return <p className="muted">Loading…</p>;
  const byDay = Object.fromEntries(s.days.map((d) => [d.day, d.count]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10);
    return { day, count: byDay[day] || 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  const sum = (arr) => arr.reduce((a, d) => a + d.count, 0);
  return (
    <div>
      <div className="stat-cards">
        <div className="scard"><span>Last 7 days</span><b>{sum(days.slice(-7))}</b></div>
        <div className="scard"><span>Last 30 days</span><b>{sum(days)}</b></div>
        <div className="scard"><span>All time</span><b>{s.total}</b></div>
      </div>
      <div className="chart" role="img" aria-label="Visits per day over the last 30 days">
        {days.map((d) => <div key={d.day} className="cbar" title={`${d.day}: ${d.count} visit${d.count === 1 ? '' : 's'}`}><i style={{ height: `${(d.count / max) * 100}%` }} /></div>)}
      </div>
      <p className="hint">Hover a bar to see its date. Only a daily total is stored. No IP addresses or personal details are recorded.</p>
      <h3 style={{ marginTop: 26 }}>Contact messages by topic</h3>
      {s.topics.length ? s.topics.map((t) => <p key={t.topic}><b>{t.topic}</b>: {t.n}</p>) : <p className="muted">No messages yet.</p>}
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('tok') || '');
  const [pw, setPw] = useState('');
  const [p, setP] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [tab, setTab] = useState('basics');
  const [st, setSt] = useState('');

  useEffect(() => { try { document.documentElement.dataset.theme = localStorage.getItem('mode') || 'light'; } catch {} }, []);
  useEffect(() => {
    if (!token) return;
    api('/api/profile').then(setP).catch((e) => setSt(e.message));
    api('/api/admin/messages', {}, token).then(setMsgs).catch(() => { sessionStorage.removeItem('tok'); setToken(''); });
  }, [token]);

  async function login(e) {
    e.preventDefault();
    try { const d = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: pw }) }); sessionStorage.setItem('tok', d.token); setToken(d.token); setSt(''); }
    catch (err) { setSt(err.message); }
  }
  async function save() {
    setSt('Saving…');
    try { await api('/api/admin/profile', { method: 'PUT', body: JSON.stringify(p) }, token); setSt('Saved ✓ Open your site and refresh to see the changes.'); }
    catch (err) { setSt(err.message); }
  }
  const logout = () => { sessionStorage.removeItem('tok'); setToken(''); setP(null); };

  if (!token) return (
    <form className="card login" onSubmit={login}>
      <h1>Admin login</h1>
      <label>Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></label>
      <button className="btn dark" style={{ justifyContent: 'center' }}>Log in</button>
      <p className="status error">{st}</p>
    </form>
  );
  if (!p) return <main className="center"><p className="muted">{st || 'Loading…'}</p></main>;

  const names = ['basics', 'about', ...Object.keys(TABS), 'stats', 'messages'];
  return (
    <div className="adm">
      <h1>Manage your portfolio</h1>
      <p className="sub">Edit anything below and press Save. <a href="/">View site</a> · <a href="#logout" onClick={logout}>Log out</a></p>
      <div className="atabs">{names.map((n) => <button key={n} className={tab === n ? 'f on' : 'f'} onClick={() => setTab(n)}>{n === 'messages' ? `messages (${msgs.length})` : n}</button>)}</div>

      {tab === 'basics' && <div className="aitem"><div className="agrid">{BASICS.map((f) => <Field key={f.k} f={f} value={p[f.k]} onChange={(v) => setP({ ...p, [f.k]: v })} />)}</div></div>}
      {tab === 'about' && <div className="aitem"><div className="agrid">{ABOUT.map((f) => <Field key={f.k} f={f} value={p[f.k]} onChange={(v) => setP({ ...p, [f.k]: v })} />)}</div></div>}
      {TABS[tab] && <List key={tab} items={p[tab]} fields={TABS[tab].fields} blank={TABS[tab].blank} onChange={(v) => setP({ ...p, [tab]: v })} />}
      {tab === 'stats' && <Stats token={token} />}
      {tab === 'messages' && (msgs.length ? msgs.map((m) => (
        <div className="msg" key={m._id}>
          <b>{m.name}</b> <span className="pill">{m.topic || 'General'}</span> <a href={`mailto:${m.email}`}>{m.email}</a> <span className="hint">{new Date(m.createdAt).toLocaleString()}</span>
          <p>{m.message}</p>
        </div>
      )) : <p className="muted">No messages yet.</p>)}

      {tab !== 'messages' && tab !== 'stats' && <div className="abar"><button className="btn dark" onClick={save}><span>Save changes</span></button><span className="status">{st}</span></div>}
    </div>
  );
}
