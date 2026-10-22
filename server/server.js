import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { seoHtml } from './seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(compression());
app.use((_req, res, next) => { res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' }); next(); });
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
const small = express.json({ limit: '50kb' }), big = express.json({ limit: '6mb' }); // big: admin saves (images)
app.use((req, res, next) => (req.path === '/api/admin/profile' ? big : small)(req, res, next));

// ---------- Models ----------
const Profile = mongoose.model('Profile', new mongoose.Schema({
  name: String, title: String, tagline: String, about: String, aboutTitle: String, aboutPhoto: String,
  email: String, location: String, timezone: String, cv: String, whatsapp: String, availableText: String, bookingUrl: String,
  socials: [{ label: String, url: String }],
  skills: [{ group: String, items: [String] }],
  experience: [{ role: String, company: String, period: String, points: [String] }],
  projects: [{ title: String, description: String, details: String, tech: [String], link: String, repo: String, image: String }],
  education: [{ degree: String, school: String, period: String }],
  certifications: [{ title: String, org: String, url: String }],
  languages: [{ name: String, level: String }],
  posts: [{ title: String, date: String, summary: String, link: String }],
  testimonials: [{ name: String, role: String, text: String }],
}));

const Message = mongoose.model('Message', new mongoose.Schema({
  name: String, email: String, message: String, topic: String,
  createdAt: { type: Date, default: Date.now },
}));

// One document per day. Only a daily total is stored: no IP addresses, no personal data.
const Visit = mongoose.model('Visit', new mongoose.Schema({
  day: { type: String, unique: true },
  count: { type: Number, default: 0 },
}));

const TOPICS = ['Job opportunity', 'Freelance project', 'Collaboration', 'General', 'Just saying hi'];

let htmlCache = null; // SEO-ready index.html, cleared whenever you save in /admin

// ---------- Mail ----------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendMail(name, email, message, topic) {
  const label = topic ? `[${topic}] ` : '';
  const subject = `${label}New portfolio message from ${name.replace(/[\r\n]/g, ' ')}`;
  const text = `Topic: ${topic || 'General'}\nFrom: ${name} <${email}>\n\n${message}`;
  if (process.env.RESEND_API_KEY) { // HTTPS email API (works on hosts that block SMTP)
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Portfolio <onboarding@resend.dev>', to: [process.env.MAIL_TO], reply_to: email, subject, text }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    return;
  }
  await transporter.sendMail({
    from: `"Portfolio" <${process.env.SMTP_USER}>`,
    to: process.env.MAIL_TO,
    replyTo: `"${name.replace(/["\r\n]/g, '')}" <${email}>`,
    subject,
    text,
  });
}

// ---------- Admin auth (signed token, no extra packages) ----------
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const sign = (d) => crypto.createHmac('sha256', SECRET).update(d).digest('base64url');
const makeToken = () => {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + 12 * 3600e3 })).toString('base64url');
  return `${body}.${sign(body)}`;
};
function auth(req, res, next) {
  const [body, sig] = (req.headers.authorization || '').replace('Bearer ', '').split('.');
  try {
    const good = sign(body);
    if (!sig || sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) throw new Error();
    if (JSON.parse(Buffer.from(body, 'base64url').toString()).exp < Date.now()) throw new Error();
    next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
}

// ---------- Public routes ----------
app.get('/api/health', (_req, res) => res.send('ok'));

app.get('/api/profile', async (_req, res) => {
  const profile = await Profile.findOne().lean();
  if (!profile) return res.status(404).json({ error: 'No profile found. Run: npm run seed' });
  res.json(profile);
});

const visitLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: false, legacyHeaders: false });
app.post('/api/visit', visitLimiter, async (_req, res) => {
  const day = new Date().toISOString().slice(0, 10);
  await Visit.updateOne({ day }, { $inc: { count: 1 } }, { upsert: true }).catch(() => {});
  res.status(204).end();
});

const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many messages. Please try again in a few minutes.' } });

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name = '', email = '', message = '', topic = '', website = '' } = req.body || {};
  if (website) return res.json({ ok: true }); // honeypot: bots fill this hidden field
  const n = String(name).trim(), e = String(email).trim(), m = String(message).trim();
  const t = TOPICS.includes(topic) ? topic : 'General';
  if (n.length < 2 || n.length > 80) return res.status(400).json({ error: 'Please enter your name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (m.length < 10 || m.length > 3000) return res.status(400).json({ error: 'Message must be 10–3000 characters.' });

  try {
    await Message.create({ name: n, email: e, message: m, topic: t });
    await sendMail(n, e, m, t);
    res.json({ ok: true });
  } catch (err) {
    console.error('Contact error:', err.message);
    res.status(500).json({ error: 'Could not send your message. Please email me directly.' });
  }
});

// ---------- Admin routes ----------
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many attempts. Try again later.' } });
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const hash = (x) => crypto.createHash('sha256').update(String(x)).digest();
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real || !crypto.timingSafeEqual(hash(req.body?.password || ''), hash(real))) return res.status(401).json({ error: 'Wrong password.' });
  res.json({ token: makeToken() });
});

app.put('/api/admin/profile', auth, async (req, res) => {
  const { _id, __v, ...data } = req.body || {};
  try {
    const doc = await Profile.findOneAndUpdate({}, data, { upsert: true, new: true }).lean();
    htmlCache = null;
    cvCache = null;
    res.json(doc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/admin/messages', auth, async (_req, res) => {
  res.json(await Message.find().sort({ createdAt: -1 }).limit(100).lean());
});

app.get('/api/admin/stats', auth, async (_req, res) => {
  const since = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  const days = await Visit.find({ day: { $gte: since } }).sort({ day: 1 }).lean();
  const total = await Visit.aggregate([{ $group: { _id: null, n: { $sum: '$count' } } }]);
  const topics = await Message.aggregate([{ $group: { _id: '$topic', n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
  res.json({
    days: days.map((d) => ({ day: d.day, count: d.count })),
    total: total[0]?.n || 0,
    topics: topics.map((t) => ({ topic: t._id || 'General', n: t.n })),
  });
});

// ---------- Generated CV (always built from your admin data) ----------
let cvCache = null; // generated CV PDF, cleared whenever you save in /admin

function buildCv(p) {
  return new Promise((resolve, reject) => {
    const clean = (s) => String(s || '').replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022]/g, '').trim();
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `${clean(p.name)} - CV`, Author: clean(p.name) } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const W = doc.page.width - 100;
    const accent = '#4338ca', grey = '#555555', ink = '#111111';

    const section = (title) => {
      doc.moveDown(0.9);
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(accent).text(title.toUpperCase(), { characterSpacing: 1 });
      doc.moveTo(50, doc.y + 2).lineTo(50 + W, doc.y + 2).strokeColor('#dddddd').lineWidth(0.6).stroke();
      doc.moveDown(0.6);
    };
    const heading = (l, r) => {
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(ink).text(clean(l), { width: W });
      if (clean(r)) doc.font('Helvetica').fontSize(9).fillColor(grey).text(clean(r), { width: W });
      doc.moveDown(0.2);
    };
    const para = (t) => doc.font('Helvetica').fontSize(9.8).fillColor('#222222').text(clean(t), { width: W });
    const bullets = (arr = []) => arr.map(clean).filter(Boolean).forEach((t) => doc.font('Helvetica').fontSize(9.8).fillColor('#222222').text(`-  ${t}`, { width: W, indent: 8 }));

    // Header
    doc.font('Helvetica-Bold').fontSize(24).fillColor(ink).text(clean(p.name) || 'Name', { width: W });
    if (clean(p.title)) doc.font('Helvetica-Bold').fontSize(12.5).fillColor(accent).text(clean(p.title), { width: W });
    const links = (p.socials || []).filter((s) => s.url && !/^mailto:/i.test(s.url)).map((s) => s.url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''));
    const meta = [p.email, p.location, ...links].filter(Boolean).map(clean).join('  |  ');
    if (meta) doc.font('Helvetica').fontSize(9).fillColor(grey).text(meta, { width: W });

    if (clean(p.about)) {
      section('Summary');
      String(p.about).split('\n').map((s) => s.trim()).filter(Boolean).forEach((t) => para(t));
    }
    if (p.skills?.length) {
      section('Skills');
      p.skills.forEach((g) => {
        doc.font('Helvetica-Bold').fontSize(9.8).fillColor(ink).text(`${clean(g.group)}: `, { continued: true, width: W });
        doc.font('Helvetica').fillColor('#222222').text(clean((g.items || []).join(', ')), { width: W });
      });
    }
    if (p.experience?.length) {
      section('Experience');
      p.experience.forEach((x) => { heading(`${x.role}, ${x.company}`, x.period); bullets(x.points); doc.moveDown(0.5); });
    }
    if (p.projects?.length) {
      section('Projects');
      p.projects.forEach((x) => {
        heading(x.title, (x.tech || []).join(', '));
        para(x.description);
        if (x.link) doc.font('Helvetica').fontSize(9).fillColor(accent).text(x.link, { width: W, link: x.link });
        doc.moveDown(0.5);
      });
    }
    if (p.education?.length) {
      section('Education');
      p.education.forEach((e) => heading(`${e.degree}, ${e.school}`, e.period));
    }
    if (p.certifications?.length) {
      section('Certifications and courses');
      p.certifications.forEach((c) => {
        heading(c.title, c.org);
        if (c.url) doc.font('Helvetica').fontSize(9).fillColor(accent).text(c.url, { width: W, link: c.url });
        doc.moveDown(0.3);
      });
    }
    if (p.languages?.length) {
      section('Languages');
      para(p.languages.map((l) => `${l.name} (${l.level})`).join(', '));
    }
    doc.end();
  });
}

app.get('/api/cv.pdf', async (_req, res) => {
  try {
    const p = await Profile.findOne().lean();
    if (!p) return res.status(404).send('CV is not available yet.');
    if (!cvCache) cvCache = await buildCv(p);
    const file = `${String(p.name || 'CV').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}-CV.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${file}"`, 'Cache-Control': 'no-cache' });
    res.send(cvCache);
  } catch (err) {
    console.error('CV error:', err.message);
    res.status(500).send('Could not create the CV right now.');
  }
});

// ---------- Serve built client in production ----------
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../client/dist');
  const site = (process.env.SITE_URL || '').replace(/\/$/, '');
  const tpl = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const getHtml = async () => {
    if (!htmlCache) htmlCache = seoHtml(tpl, await Profile.findOne().lean().catch(() => null), site);
    return htmlCache;
  };
  app.get('/robots.txt', (_q, r) => r.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\n${site ? `Sitemap: ${site}/sitemap.xml\n` : ''}`));
  app.get('/sitemap.xml', (_q, r) => r.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}/</loc></url><url><loc>${site}/cv</loc></url></urlset>`));
  app.use('/assets', express.static(path.join(dist, 'assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api).*/, async (req, res) => {
    const p = req.path.replace(/\/$/, '') || '/';
    if (p.startsWith('/admin')) res.set({ 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
    else res.set('Cache-Control', 'public, max-age=300');
    res.status(['/', '/cv', '/admin'].includes(p) ? 200 : 404).type('html').send(await getHtml());
  });
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 5000, () => console.log('API running on port', process.env.PORT || 5000)))
  .catch((err) => { console.error('MongoDB connection failed:', err.message); process.exit(1); });