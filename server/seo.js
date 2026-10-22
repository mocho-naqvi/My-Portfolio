// Builds the page HTML that search engines and link previews (WhatsApp, LinkedIn) see.
// Real content from your database is placed in the title, description, structured data and a text fallback.
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const ul = (arr) => (arr.length ? `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>` : '');

export function seoHtml(tpl, p, site) {
  const title = p ? `${p.name} | ${p.title}` : 'Portfolio';
  const raw = p ? `${p.name} is a ${p.title} based in ${p.location}. ${p.tagline || ''}`.trim() : 'Portfolio';
  const desc = raw.length > 158 ? raw.slice(0, 155).trimEnd() + '…' : raw;
  const parts = String(p?.location || '').split(',').map((x) => x.trim());

  const ld = p ? {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person', '@id': `${site}/#person`, name: p.name, jobTitle: p.title, url: `${site}/`, description: p.tagline || undefined,
        address: p.location ? { '@type': 'PostalAddress', addressLocality: parts[0], addressCountry: parts[1] } : undefined,
        sameAs: (p.socials || []).filter((s) => /^https?:/.test(s.url)).map((s) => s.url),
        knowsAbout: [...new Set((p.skills || []).flatMap((g) => g.items))].slice(0, 25),
        alumniOf: (p.education || []).slice(0, 2).map((e) => ({ '@type': 'EducationalOrganization', name: e.school })),
      },
      { '@type': 'WebSite', '@id': `${site}/#website`, url: `${site}/`, name: title, publisher: { '@id': `${site}/#person` } },
    ],
  } : {};

  const pre = p ? `<main id="seo-fallback"><h1>${esc(p.name)} - ${esc(p.title)}</h1><p>${esc(p.tagline)}</p>`
    + `<h2>About</h2>${lines(p.about).map((t) => `<p>${esc(t)}</p>`).join('')}`
    + `<h2>Skills</h2>${ul((p.skills || []).map((g) => `${esc(g.group)}: ${esc((g.items || []).join(', '))}`))}`
    + `<h2>Projects</h2>${ul((p.projects || []).map((x) => `<strong>${esc(x.title)}</strong> - ${esc(x.description)} (${esc((x.tech || []).join(', '))})`))}`
    + `<h2>Experience</h2>${ul((p.experience || []).map((x) => `${esc(x.role)}, ${esc(x.company)} (${esc(x.period)})`))}`
    + `<h2>Education</h2>${ul((p.education || []).map((e) => `${esc(e.degree)}, ${esc(e.school)} (${esc(e.period)})`))}`
    + `<h2>Contact</h2><p>${esc(p.email)} - ${esc(p.location)}</p></main>` : '';

  return tpl
    .replaceAll('__SITE_URL__', () => site)
    .replaceAll('__TITLE__', () => esc(title))
    .replaceAll('__DESC__', () => esc(desc))
    .replace('__LD__', () => JSON.stringify(ld).replace(/</g, '\\u003c'))
    .replace('<!--PRERENDER-->', () => pre);
}
