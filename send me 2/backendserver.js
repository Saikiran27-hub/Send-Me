const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = 3000;

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueKey = crypto.randomBytes(3).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueKey}${ext}`);
    }
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// File transfer database (in-memory for this example)
const transfers = new Map();

// Routes
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const key = crypto.randomBytes(3).toString('hex');
    const fileInfo = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours expiration
    };

    transfers.set(key, fileInfo);

    res.json({
        key,
        filename: req.file.originalname,
        size: req.file.size
    });
});

app.get('/api/download/:key', (req, res) => {
    const { key } = req.params;
    const fileInfo = transfers.get(key);

    if (!fileInfo) {
        return res.status(404).json({ error: 'File not found or expired' });
    }

    if (Date.now() > fileInfo.expiresAt) {
        transfers.delete(key);
        fs.unlinkSync(fileInfo.path);
        return res.status(410).json({ error: 'File has expired' });
    }

    res.download(fileInfo.path, fileInfo.originalname, (err) => {
        if (err) {
            console.error('Download error:', err);
        }
        // Delete after download (optional)
        transfers.delete(key);
        fs.unlinkSync(fileInfo.path);
    });
});

// Cleanup expired files periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, fileInfo] of transfers.entries()) {
        if (now > fileInfo.expiresAt) {
            fs.unlinkSync(fileInfo.path);
            transfers.delete(key);
        }
    }
}, 60 * 60 * 1000); // Run hourly

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});