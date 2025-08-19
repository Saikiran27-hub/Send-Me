// Generate 6-digit key
function generateKey() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate QR Code
function generateQR(elementId, text) {
    document.getElementById(elementId).innerHTML = "";
    new QRCode(document.getElementById(elementId), {
        text: text,
        width: 128,
        height: 128,
        colorDark: "#003B73",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat(bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

// DOM Elements
const generateKeyBtn = document.getElementById('generateKeyBtn');
const keyDisplay = document.getElementById('keyDisplay');
const copyKeyBtn = document.getElementById('copyKeyBtn');
const uploadBtn = document.getElementById('uploadBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadKeyInput = document.getElementById('downloadKeyInput');
const downloadQr = document.getElementById('downloadQr');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileInputContainer = document.getElementById('fileInputContainer');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statusMessage = document.getElementById('statusMessage');
const downloadStatus = document.getElementById('downloadStatus');

// Current transfer data
let currentKey = '';
let selectedFile = null;

// Generate Key Button Click
generateKeyBtn.addEventListener('click', function() {
    currentKey = generateKey();
    keyDisplay.textContent = currentKey;
    generateQR('qrCode', currentKey);
    copyKeyBtn.style.display = 'inline-block';
    fileInputContainer.style.display = 'block';
    generateKeyBtn.style.display = 'none';
});

// Copy Key Button Click
copyKeyBtn.addEventListener('click', function() {
    navigator.clipboard.writeText(keyDisplay.textContent)
        .then(() => {
            copyKeyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyKeyBtn.textContent = 'Copy Key';
            }, 2000);
        });
});

// File Input Change
fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        fileInfo.textContent = `${selectedFile.name} (${formatFileSize(selectedFile.size)})`;
        progressContainer.style.display = 'block';
    }
});

// Upload Button Click
uploadBtn.addEventListener('click', async function() {
    if (!selectedFile) {
        showStatus('Please select a file first', 'error');
        return;
    }

    if (!currentKey) {
        showStatus('Please generate a key first', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = `${percentComplete}%`;
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                showStatus(`File uploaded successfully! Share key: ${response.key}`, 'success');
            } else {
                showStatus('Upload failed: ' + xhr.responseText, 'error');
            }
        };

        xhr.onerror = () => {
            showStatus('Upload failed. Please try again.', 'error');
        };

        xhr.open('POST', '/api/upload', true);
        xhr.send(formData);
        showStatus('Uploading file...', 'success');

    } catch (error) {
        showStatus('Upload error: ' + error.message, 'error');
    }
});

// Download Button Click
downloadBtn.addEventListener('click', async function() {
    const key = downloadKeyInput.value.trim();

    if (key.length !== 6) {
        showDownloadStatus('Please enter a valid 6-digit key!', 'error');
        return;
    }

    try {
        showDownloadStatus(`Downloading file with key: ${key}...`, 'success');

        // Generate QR code for the download key
        downloadQr.style.display = 'block';
        generateQR('downloadQr', key);

        // Create a temporary anchor element to trigger download
        const a = document.createElement('a');
        a.href = `/api/download/${key}`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showDownloadStatus('Download started!', 'success');

    } catch (error) {
        showDownloadStatus('Download failed: ' + error.message, 'error');
    }
});

// Show status message
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';

    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

// Show download status message
function showDownloadStatus(message, type) {
    downloadStatus.textContent = message;
    downloadStatus.className = `status-message ${type}`;
    downloadStatus.style.display = 'block';

    setTimeout(() => {
        downloadStatus.style.display = 'none';
    }, 5000);
}