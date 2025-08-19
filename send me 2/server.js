const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// In-memory store for file metadata (in production, use a database)
const fileStore = new Map();

// Generate a 6-digit key
function generateKey() {
    return crypto.randomInt(100000, 999999).toString();
}

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const key = generateKey();
    const fileData = {
        key,
        filename: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadDate: new Date()
    };

    fileStore.set(key, fileData);

    res.json({
        success: true,
        key,
        filename: fileData.filename,
        size: fileData.size
    });
});

// Check file endpoint
app.get('/check-file/:key', (req, res) => {
    const { key } = req.params;
    const exists = fileStore.has(key);

    res.json({ exists });
});

// Download endpoint
app.get('/download/:key', (req, res) => {
    const { key } = req.params;
    const fileData = fileStore.get(key);

    if (!fileData) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.download(fileData.path, fileData.filename, (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(500).json({ error: 'Download failed' });
        }

        // Optionally delete file after download
        // fs.unlinkSync(fileData.path);
        // fileStore.delete(key);
    });
});

// Cleanup endpoint (optional)
app.delete('/cleanup/:key', (req, res) => {
    const { key } = req.params;
    const fileData = fileStore.get(key);

    if (!fileData) {
        return res.status(404).json({ error: 'File not found' });
    }

    try {
        fs.unlinkSync(fileData.path);
        fileStore.delete(key);
        res.json({ success: true });
    } catch (err) {
        console.error('Cleanup error:', err);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});