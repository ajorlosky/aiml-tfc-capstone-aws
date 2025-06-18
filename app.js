// Initialize AWS SDK
AWS.config.update(awsConfig);
const s3 = new AWS.S3();

// DOM Elements
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const uploadButton = document.getElementById('upload-button');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.getElementById('progress-text');
const refreshButton = document.getElementById('refresh-button');
const resultsList = document.getElementById('results-list');

// Selected file
let selectedFile = null;

// Event Listeners
dropArea.addEventListener('dragover', handleDragOver);
dropArea.addEventListener('dragleave', handleDragLeave);
dropArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
uploadButton.addEventListener('click', uploadFile);
refreshButton.addEventListener('click', loadTranscriptions);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkConfig();
    loadTranscriptions();
});

// Check if configuration is set
function checkConfig() {
    if (!s3Config.bucketName) {
        alert('Please configure your S3 bucket name in config.js');
    }
}

// Handle drag over event
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('highlight');
}

// Handle drag leave event
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('highlight');
}

// Handle drop event
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('highlight');
    
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// Handle file selection
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// Process selected file
function handleFile(file) {
    // Check if file is audio
    if (!file.type.startsWith('audio/')) {
        alert('Please select an audio file');
        return;
    }
    
    selectedFile = file;
    fileInfo.innerHTML = `
        <p><strong>File:</strong> ${file.name}</p>
        <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
        <p><strong>Type:</strong> ${file.type}</p>
    `;
    uploadButton.disabled = false;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
}

// Upload file to S3
function uploadFile() {
    if (!selectedFile) return;
    
    // Show progress
    uploadProgress.classList.remove('hidden');
    uploadButton.disabled = true;
    
    // Create a unique key for the file with human-readable timestamp
    const now = new Date();
    const formattedDate = now.toISOString().replace(/[T:]/g, '-').split('.')[0]; // Format: YYYY-MM-DD-HH-MM-SS
    const timestamp = now.getTime(); // Keep timestamp for uniqueness
    const fileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${s3Config.recordingsPrefix}${formattedDate}-${fileName}`;
    
    // Configure the upload
    const upload = new AWS.S3.ManagedUpload({
        params: {
            Bucket: s3Config.bucketName,
            Key: key,
            Body: selectedFile,
            ContentType: selectedFile.type
        }
    });
    
    // Register progress event
    upload.on('httpUploadProgress', (progress) => {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `Uploading: ${percent}%`;
    });
    
    // Execute upload
    upload.promise()
        .then((data) => {
            console.log('Upload successful:', data);
            progressText.textContent = 'Upload complete! Processing...';
            
            // Reset form after a delay
            setTimeout(() => {
                resetUploadForm();
                loadTranscriptions();
            }, 3000);
        })
        .catch((err) => {
            console.error('Upload error:', err);
            progressText.textContent = `Error: ${err.message}`;
            
            // Enable retry
            uploadButton.disabled = false;
        });
}

// Reset upload form
function resetUploadForm() {
    selectedFile = null;
    fileInfo.innerHTML = '';
    uploadButton.disabled = true;
    uploadProgress.classList.add('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading: 0%';
    fileInput.value = '';
}

// Load transcriptions from S3
function loadTranscriptions() {
    if (!s3Config.bucketName) return;
    
    // Show loading state
    resultsList.innerHTML = '<p class="no-results">Loading transcriptions...</p>';
    
    // List objects in the transcriptions prefix
    s3.listObjectsV2({
        Bucket: s3Config.bucketName,
        Prefix: s3Config.transcriptionsPrefix
    }, (err, data) => {
        if (err) {
            console.error('Error listing transcriptions:', err);
            resultsList.innerHTML = `<p class="no-results">Error loading transcriptions: ${err.message}</p>`;
            return;
        }
        
        // Filter for text files (evaluations, transcriptions, and summaries)
        const transcriptionFiles = data.Contents.filter(item => 
            item.Key.endsWith('.txt') || 
            item.Key.endsWith('-transcription.txt') || 
            item.Key.endsWith('-evaluation.txt') ||
            item.Key.endsWith('-summary.txt')
        );
        
        if (transcriptionFiles.length === 0) {
            resultsList.innerHTML = '<p class="no-results">No transcriptions available. Upload a recording to get started.</p>';
            return;
        }
        
        // Group files by original recording
        const groupedFiles = groupTranscriptionFiles(transcriptionFiles);
        
        // Display results
        displayResults(groupedFiles);
    });
}

// Group transcription files by original recording
function groupTranscriptionFiles(files) {
    const groups = {};
    
    files.forEach(file => {
        // Extract base name (without -transcription.txt, -evaluation.txt, or -summary.txt)
        let baseName = file.Key.split('/').pop();
        
        // Remove the file type suffixes
        baseName = baseName.replace(/-speaker-transcription\.txt$|-evaluation\.txt$|-summary\.txt$|\.txt$/, '');
        
        // Extract the original filename without the timestamp
        const parts = baseName.split('-');
        if (parts.length >= 7) { // YYYY-MM-DD-HH-MM-SS-filename format
            // Remove the timestamp part (first 6 segments)
            baseName = parts.slice(6).join('-');
        }
        
        if (!groups[baseName]) {
            groups[baseName] = {
                baseName: baseName,
                date: file.LastModified,
                files: []
            };
        }
        
        groups[baseName].files.push({
            key: file.Key,
            type: getFileType(file.Key),
            lastModified: file.LastModified
        });
        
        // Use the most recent date
        if (file.LastModified > groups[baseName].date) {
            groups[baseName].date = file.LastModified;
        }
    });
    
    // Convert to array and sort by date (newest first)
    return Object.values(groups).sort((a, b) => b.date - a.date);
}

// Get file type based on key
function getFileType(key) {
    if (key.endsWith('-speaker-transcription.txt')) return 'transcription';
    if (key.endsWith('-evaluation.txt')) return 'evaluation';
    if (key.endsWith('-summary.txt')) return 'summary';
    return 'other';
}

// Display results in the UI
function displayResults(groupedFiles) {
    resultsList.innerHTML = '';
    
    groupedFiles.forEach(group => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const transcription = group.files.find(f => f.type === 'transcription');
        const evaluation = group.files.find(f => f.type === 'evaluation');
        const summary = group.files.find(f => f.type === 'summary');
        
        // Format the date nicely
        const processedDate = new Date(group.date).toLocaleString();
        
        resultItem.innerHTML = `
            <div class="result-title">${group.baseName}</div>
            <div class="result-date">Processed: ${processedDate}</div>
            <div class="result-actions">
                ${transcription ? `<a href="#" data-key="${transcription.key}" class="view-link">View Transcription</a>` : ''}
                ${evaluation ? `<a href="#" data-key="${evaluation.key}" class="view-link">View Evaluation</a>` : ''}
                ${summary ? `<a href="#" data-key="${summary.key}" class="view-link">View Summary</a>` : ''}
            </div>
        `;
        
        // Add event listeners to view links
        resultItem.querySelectorAll('.view-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const key = e.target.getAttribute('data-key');
                viewFile(key);
            });
        });
        
        resultsList.appendChild(resultItem);
    });
}

// View file content
function viewFile(key) {
    s3.getObject({
        Bucket: s3Config.bucketName,
        Key: key
    }, (err, data) => {
        if (err) {
            console.error('Error getting file:', err);
            alert(`Error loading file: ${err.message}`);
            return;
        }
        
        const content = data.Body.toString('utf-8');
        
        // Create modal to display content
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = 'white';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '8px';
        modalContent.style.maxWidth = '800px';
        modalContent.style.maxHeight = '80%';
        modalContent.style.overflow = 'auto';
        modalContent.style.position = 'relative';
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.backgroundColor = '#f5f5f7';
        closeButton.style.border = '1px solid #ccc';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        
        const fileName = document.createElement('h3');
        fileName.textContent = key.split('/').pop();
        fileName.style.marginBottom = '15px';
        
        const contentPre = document.createElement('pre');
        contentPre.style.whiteSpace = 'pre-wrap';
        contentPre.style.wordBreak = 'break-word';
        contentPre.textContent = content;
        
        modalContent.appendChild(closeButton);
        modalContent.appendChild(fileName);
        modalContent.appendChild(contentPre);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
        
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    });
}