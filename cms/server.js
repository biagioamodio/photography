const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const simpleGit = require('simple-git');
const open = require('open');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Paths - go up one directory to the main project
const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, '_data');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'assets', 'uploads');
const SERIES_FILE = path.join(DATA_DIR, 'series.json');
const ABOUT_FILE = path.join(DATA_DIR, 'about.json');

// Git setup
const git = simpleGit(PROJECT_ROOT);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded images from the main project
app.use('/assets/uploads', express.static(UPLOADS_DIR));

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper functions
function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return null;
  }
}

function writeJSON(filePath, data) {
  try {
    // Add trailing newline to match standard file format and prevent git false-positives
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

function generateId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function processImage(buffer, filename, optimize = true) {
  const ext = path.extname(filename).toLowerCase();
  const baseName = path.basename(filename, ext);
  const outputFilename = `${baseName}.jpg`;
  const outputPath = path.join(UPLOADS_DIR, outputFilename);

  if (optimize) {
    await sharp(buffer)
      .resize(2000, 2000, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toFile(outputPath);
  } else {
    // Just save the original
    if (ext === '.jpg' || ext === '.jpeg') {
      fs.writeFileSync(outputPath, buffer);
    } else {
      // Convert to JPEG anyway for consistency
      await sharp(buffer)
        .jpeg({ quality: 95 })
        .toFile(outputPath);
    }
  }

  return `assets/uploads/${outputFilename}`;
}

// ==================== API ROUTES ====================

// --- Series Routes ---

// Get all series
app.get('/api/series', (req, res) => {
  const series = readJSON(SERIES_FILE);
  if (series === null) {
    return res.status(500).json({ error: 'Failed to read series data' });
  }
  res.json(series);
});

// Get single series
app.get('/api/series/:id', (req, res) => {
  const series = readJSON(SERIES_FILE);
  if (series === null) {
    return res.status(500).json({ error: 'Failed to read series data' });
  }
  const found = series.find(s => s.id === req.params.id);
  if (!found) {
    return res.status(404).json({ error: 'Series not found' });
  }
  res.json(found);
});

// Create new series
app.post('/api/series', (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const series = readJSON(SERIES_FILE) || [];
  const id = generateId(title);
  
  // Check if ID already exists
  if (series.some(s => s.id === id)) {
    return res.status(400).json({ error: 'A series with this title already exists' });
  }

  const newSeries = {
    id,
    title,
    description: description || '',
    photos: []
  };

  series.push(newSeries);
  
  if (!writeJSON(SERIES_FILE, series)) {
    return res.status(500).json({ error: 'Failed to save series' });
  }

  res.status(201).json(newSeries);
});

// Update series
app.put('/api/series/:id', (req, res) => {
  const { title, description, photos } = req.body;
  const series = readJSON(SERIES_FILE);
  
  if (series === null) {
    return res.status(500).json({ error: 'Failed to read series data' });
  }

  const index = series.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Series not found' });
  }

  // Update fields
  if (title !== undefined) series[index].title = title;
  if (description !== undefined) series[index].description = description;
  if (photos !== undefined) series[index].photos = photos;

  if (!writeJSON(SERIES_FILE, series)) {
    return res.status(500).json({ error: 'Failed to save series' });
  }

  res.json(series[index]);
});

// Delete series
app.delete('/api/series/:id', (req, res) => {
  const series = readJSON(SERIES_FILE);
  
  if (series === null) {
    return res.status(500).json({ error: 'Failed to read series data' });
  }

  const index = series.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Series not found' });
  }

  // Note: We don't delete the actual image files to prevent data loss
  series.splice(index, 1);

  if (!writeJSON(SERIES_FILE, series)) {
    return res.status(500).json({ error: 'Failed to save series' });
  }

  res.json({ success: true });
});

// Upload photos to series
app.post('/api/series/:id/photos', upload.array('photos', 50), async (req, res) => {
  try {
    const series = readJSON(SERIES_FILE);
    
    if (series === null) {
      return res.status(500).json({ error: 'Failed to read series data' });
    }

    const index = series.findIndex(s => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Series not found' });
    }

    const optimize = req.body.optimize !== 'false';
    const uploadedPhotos = [];

    for (const file of req.files) {
      const imagePath = await processImage(file.buffer, file.originalname, optimize);
      const newPhoto = {
        image: imagePath,
        metadata: req.body.metadata || ''
      };
      series[index].photos.push(newPhoto);
      uploadedPhotos.push(newPhoto);
    }

    if (!writeJSON(SERIES_FILE, series)) {
      return res.status(500).json({ error: 'Failed to save series' });
    }

    res.json({ success: true, photos: uploadedPhotos });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

// Delete photo from series
app.delete('/api/series/:id/photos/:photoIndex', (req, res) => {
  const series = readJSON(SERIES_FILE);
  
  if (series === null) {
    return res.status(500).json({ error: 'Failed to read series data' });
  }

  const seriesIndex = series.findIndex(s => s.id === req.params.id);
  if (seriesIndex === -1) {
    return res.status(404).json({ error: 'Series not found' });
  }

  const photoIndex = parseInt(req.params.photoIndex);
  if (isNaN(photoIndex) || photoIndex < 0 || photoIndex >= series[seriesIndex].photos.length) {
    return res.status(400).json({ error: 'Invalid photo index' });
  }

  // Remove photo from array (keep the file for safety)
  series[seriesIndex].photos.splice(photoIndex, 1);

  if (!writeJSON(SERIES_FILE, series)) {
    return res.status(500).json({ error: 'Failed to save series' });
  }

  res.json({ success: true });
});

// Reorder series
app.put('/api/series-order', (req, res) => {
  const { order } = req.body; // Array of series IDs in new order
  
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'Order must be an array of IDs' });
  }

  const series = readJSON(SERIES_FILE);
  
  if (series === null) {
    return res.status(500).json({ error: 'Failed to read series data' });
  }

  // Reorder based on provided order
  const reordered = [];
  for (const id of order) {
    const found = series.find(s => s.id === id);
    if (found) {
      reordered.push(found);
    }
  }

  // Add any series that weren't in the order (shouldn't happen, but safety)
  for (const s of series) {
    if (!reordered.find(r => r.id === s.id)) {
      reordered.push(s);
    }
  }

  if (!writeJSON(SERIES_FILE, reordered)) {
    return res.status(500).json({ error: 'Failed to save series order' });
  }

  res.json({ success: true });
});

// --- About Routes ---

// Get about data
app.get('/api/about', (req, res) => {
  const about = readJSON(ABOUT_FILE);
  if (about === null) {
    return res.status(500).json({ error: 'Failed to read about data' });
  }
  res.json(about);
});

// Update about data
app.put('/api/about', (req, res) => {
  const { content, links } = req.body;
  const about = readJSON(ABOUT_FILE);
  
  if (about === null) {
    return res.status(500).json({ error: 'Failed to read about data' });
  }

  if (content !== undefined) about.content = content;
  if (links !== undefined) about.links = links;

  if (!writeJSON(ABOUT_FILE, about)) {
    return res.status(500).json({ error: 'Failed to save about data' });
  }

  res.json(about);
});

// Upload about image
app.post('/api/about/image', upload.single('image'), async (req, res) => {
  try {
    const about = readJSON(ABOUT_FILE);
    
    if (about === null) {
      return res.status(500).json({ error: 'Failed to read about data' });
    }

    const optimize = req.body.optimize !== 'false';
    const imagePath = await processImage(req.file.buffer, req.file.originalname, optimize);
    
    about.image = imagePath;

    if (!writeJSON(ABOUT_FILE, about)) {
      return res.status(500).json({ error: 'Failed to save about data' });
    }

    res.json({ success: true, image: imagePath });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// --- Git Routes ---

// Get git status (only track website content changes)
app.get('/api/git/status', async (req, res) => {
  try {
    const status = await git.status();
    
    // Only track changes to website content files
    // This includes: _data/, assets/uploads/, and root HTML files
    const isWebsiteContent = (file) => {
      return file.startsWith('_data/') || 
             file.startsWith('assets/uploads/') ||
             file.endsWith('.html') && !file.includes('/');
    };
    
    const filterWebsiteFiles = (files) => files.filter(isWebsiteContent);
    
    const modified = filterWebsiteFiles(status.modified || []);
    const created = filterWebsiteFiles(status.created || []);
    const deleted = filterWebsiteFiles(status.deleted || []);
    // For not_added (untracked files), only count new uploads
    const not_added = (status.not_added || []).filter(f => f.startsWith('assets/uploads/'));
    
    const isClean = modified.length === 0 && created.length === 0 && 
                    deleted.length === 0 && not_added.length === 0;
    
    res.json({
      isClean,
      modified,
      created,
      deleted,
      not_added
    });
  } catch (err) {
    console.error('Git status error:', err);
    res.status(500).json({ error: 'Failed to get git status' });
  }
});

// Publish (commit and push)
app.post('/api/publish', async (req, res) => {
  try {
    const status = await git.status();
    
    if (status.isClean()) {
      return res.json({ success: true, message: 'No changes to publish' });
    }

    // Add all changes
    await git.add('.');
    
    // Create commit message with timestamp
    const timestamp = new Date().toLocaleString('it-IT', { 
      timeZone: 'Europe/Rome',
      dateStyle: 'short',
      timeStyle: 'short'
    });
    const commitMessage = `Update website content - ${timestamp}`;
    
    await git.commit(commitMessage);
    
    // Push to origin
    await git.push('origin', 'main');
    
    res.json({ success: true, message: 'Changes published successfully!' });
  } catch (err) {
    console.error('Publish error:', err);
    
    // Check for authentication errors
    const errorMsg = err.message || '';
    if (errorMsg.includes('Authentication failed') || 
        errorMsg.includes('Invalid username or token') ||
        errorMsg.includes('Password authentication')) {
      return res.status(401).json({ 
        error: 'GitHub authentication required. Please see the SETUP_GITHUB.md file in the cms folder for instructions.',
        needsAuth: true
      });
    }
    
    res.status(500).json({ error: `Failed to publish: ${err.message}` });
  }
});

// --- Start Server ---

app.listen(PORT, async () => {
  console.log(`\n🎨 Biagio's Photography CMS`);
  console.log(`   Running at http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop\n`);
  
  // Open browser automatically
  try {
    await open(`http://localhost:${PORT}`);
  } catch (err) {
    console.log('Could not open browser automatically. Please navigate to the URL above.');
  }
});
