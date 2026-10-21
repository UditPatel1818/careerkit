require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const { MONGO_URI, JWT_SECRET } = process.env;
const PORT = process.env.PORT || 3000;
if (!MONGO_URI || !JWT_SECRET) {
  console.error('Missing MONGO_URI or JWT_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- models ---------- */
const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}, { timestamps: true }));

const Resume = mongoose.model('Resume', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'Untitled', trim: true },
  data: { type: Object, default: {} }
}, { timestamps: true, minimize: false }));

/* ---------- helpers ---------- */
const FIELDS = ['name', 'email', 'phone', 'city', 'links', 'summary', 'skills', 'edu', 'proj', 'exp', 'tpl'];
const clean = d => {
  const out = {};
  FIELDS.forEach(f => { out[f] = String((d && d[f]) || '').slice(0, 5000); });
  return out;
};
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e);
  res.status(500).json({ error: 'Server error' });
});
const sign = u => jwt.sign({ id: u._id }, JWT_SECRET, { expiresIn: '7d' });
const pub = u => ({ id: u._id, name: u.name, email: u.email });
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  try {
    req.uid = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET).id;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Please log in again' });
  }
}

/* ---------- auth routes ---------- */
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/register', wrap(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (await User.findOne({ email: email.toLowerCase().trim() })) return res.status(409).json({ error: 'Email already registered' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: pub(user) });
}));

app.post('/api/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(String(password || ''), user.password)))
    return res.status(401).json({ error: 'Wrong email or password' });
  res.json({ token: sign(user), user: pub(user) });
}));

app.get('/api/me', auth, wrap(async (req, res) => {
  const user = await User.findById(req.uid);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ user: pub(user) });
}));

/* ---------- resume routes ---------- */
app.get('/api/resumes', auth, wrap(async (req, res) => {
  const resumes = await Resume.find({ user: req.uid }).select('title updatedAt').sort({ updatedAt: -1 });
  res.json({ resumes });
}));

app.get('/api/resumes/:id', auth, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Bad id' });
  const resume = await Resume.findOne({ _id: req.params.id, user: req.uid });
  if (!resume) return res.status(404).json({ error: 'Not found' });
  res.json({ resume });
}));

app.post('/api/resumes', auth, wrap(async (req, res) => {
  const resume = await Resume.create({
    user: req.uid,
    title: String(req.body.title || 'Untitled').slice(0, 80),
    data: clean(req.body.data)
  });
  res.status(201).json({ resume });
}));

app.put('/api/resumes/:id', auth, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Bad id' });
  const resume = await Resume.findOneAndUpdate(
    { _id: req.params.id, user: req.uid },
    { title: String(req.body.title || 'Untitled').slice(0, 80), data: clean(req.body.data) },
    { new: true }
  );
  if (!resume) return res.status(404).json({ error: 'Not found' });
  res.json({ resume });
}));

app.delete('/api/resumes/:id', auth, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Bad id' });
  await Resume.deleteOne({ _id: req.params.id, user: req.uid });
  res.json({ ok: true });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

/* ---------- start ---------- */
mongoose.connect(MONGO_URI)
  .then(() => app.listen(PORT, () => console.log('CareerKit running on port ' + PORT)))
  .catch(e => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
