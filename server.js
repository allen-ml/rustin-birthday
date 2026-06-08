const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

const dataFile   = path.join(__dirname, 'data.json');
const uploadsDir = path.join(__dirname, 'public', 'uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

function loadData() {
  if (!fs.existsSync(dataFile)) return { messages: [], photos: [] };
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only'))
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/data', (req, res) => res.json(loadData()));

app.post('/api/messages', (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'Name and message required' });
  const data  = loadData();
  const entry = { id: Date.now(), name, message, timestamp: new Date().toISOString() };
  data.messages.unshift(entry);
  saveData(data);
  res.json(entry);
});

app.post('/api/photos', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const data  = loadData();
  const entry = {
    id: Date.now(),
    url: '/uploads/' + req.file.filename,
    uploaderName: req.body.uploaderName || 'A friend',
    timestamp: new Date().toISOString()
  };
  data.photos.push(entry);
  saveData(data);
  res.json(entry);
});

app.listen(PORT, () =>
  console.log(`🎂 Birthday site running at http://localhost:${PORT}`)
);
