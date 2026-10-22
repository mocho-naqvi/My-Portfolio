import { useEffect, useState } from 'react';

export default function CV() {
  const [p, setP] = useState(null);
  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    fetch('/api/profile').then((r) => r.json()).then((d) => { setP(d); document.title = `${d.name} - CV`; }).catch(() => {});
  }, []);
  if (!p) return <main className="center"><p className="muted">Loading…</p></main>;
  const pretty = (u) => u.replace(/^mailto:/, '').replace(/^https?:\/\/(www\.)?/, '');
  const meta = [p.email, p.location, ...(p.socials || []).filter((s) => !/^mailto:/.test(s.url)).map((s) => pretty(s.url))].filter(Boolean).join('  ·  ');
  return (
    <div className="cvp">
      <div className="cvbar"><a href="/">← Back to site</a><button className="btn dark small" onClick={() => window.print()}><span>Print / Save as PDF</span></button></div>
      <header><h1>{p.name}</h1><p className="cvrole">{p.title}</p><p className="cvmeta">{meta}</p></header>
      <section><h2>Summary</h2><p>{p.about}</p></section>
      {!!p.skills?.length && <section><h2>Skills</h2>{p.skills.map((g) => <p key={g.group}><b>{g.group}:</b> {g.items.join(', ')}</p>)}</section>}
      {!!p.experience?.length && <section><h2>Experience</h2>{p.experience.map((x) => (
        <div key={x.role + x.period}><p className="cvh"><span><b>{x.role}</b>, {x.company}</span><span>{x.period}</span></p><ul>{x.points.map((t) => <li key={t}>{t}</li>)}</ul></div>
      ))}</section>}
      {!!p.projects?.length && <section><h2>Projects</h2>{p.projects.map((x) => (
        <div key={x.title}><p className="cvh"><span><b>{x.title}</b></span><span>{(x.tech || []).join(', ')}</span></p><p>{x.description}</p>{x.link && <p className="cvl">{x.link}</p>}</div>
      ))}</section>}
      {!!p.education?.length && <section><h2>Education</h2>{p.education.map((e) => <p className="cvh" key={e.degree}><span><b>{e.degree}</b>, {e.school}</span><span>{e.period}</span></p>)}</section>}
      {!!p.certifications?.length && <section><h2>Courses and certifications</h2>{p.certifications.map((c) => <p key={c.title}><b>{c.title}</b>, {c.org}</p>)}</section>}
      {!!p.languages?.length && <section><h2>Languages</h2><p>{p.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></section>}
    </div>
  );
}
