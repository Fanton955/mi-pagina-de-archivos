import { auth, storage } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { ref, uploadBytesResumable, getDownloadURL, listAll, getMetadata } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

const userEmail = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const uploadArea = document.getElementById('upload-area');
const uploadContainer = document.getElementById('upload-container');
const fileInput = document.getElementById('file-input');
const previewArea = document.getElementById('preview-area');
const fileList = document.getElementById('file-list');

onAuthStateChanged(auth, (user) => {
    if (user) {
        userEmail.textContent = user.email;
        listFiles();
    } else {
        window.location.href = 'login.html';
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// --- Drag and Drop --- //
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.add('highlight'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('highlight'), false);
});

uploadArea.addEventListener('drop', handleDrop, false);
uploadContainer.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length === 0) {
        return;
    }
    // We only handle one file at a time for simplicity
    const file = files[0];
    createPreview(file);
    uploadFile(file);
}

// --- Preview and Upload --- //

function createPreview(file) {
    previewArea.innerHTML = ''; // Clear previous previews

    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';

    const thumbnail = document.createElement('div');
    thumbnail.className = 'preview-thumbnail';

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            thumbnail.innerHTML = '';
            thumbnail.appendChild(img);
        }
        reader.readAsDataURL(file);
    } else {
        thumbnail.innerHTML = `<i class="${getFileIcon(file.type)}"></i>`;
    }

    const info = document.createElement('div');
    info.className = 'preview-info';
    info.innerHTML = `
        <p>${file.name}</p>
        <p class="small text-muted">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
        <div class="progress mt-2">
            <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <div class="upload-status mt-1 small"></div>
    `;

    previewItem.appendChild(thumbnail);
    previewItem.appendChild(info);
    previewArea.appendChild(previewItem);
}

function uploadFile(file) {
    const user = auth.currentUser;
    if (!user) return;

    const storageRef = ref(storage, `${user.uid}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    const progressBar = previewArea.querySelector('.progress-bar');
    const uploadStatus = previewArea.querySelector('.upload-status');

    uploadTask.on('state_changed', 
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
            uploadStatus.textContent = `Subiendo... ${Math.round(progress)}%`;
        }, 
        (error) => {
            uploadStatus.innerHTML = `<span class="text-danger">La subida falló: ${error.code}</span>`;
        }, 
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                uploadStatus.innerHTML = `¡Subido! <a href="${downloadURL}" target="_blank">Enlace de Descarga</a>`;
                listFiles(); // Refresh the file list
            });
        }
    );
}

// --- File List --- //

async function listFiles() {
    const user = auth.currentUser;
    if (!user) return;

    const listRef = ref(storage, user.uid);
    fileList.innerHTML = '';

    try {
        const res = await listAll(listRef);
        for (const itemRef of res.items) {
            const metadata = await getMetadata(itemRef);
            const downloadURL = await getDownloadURL(itemRef);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><i class="${getFileIcon(metadata.contentType)} me-2"></i>${metadata.name}</td>
                <td>${(metadata.size / 1024 / 1024).toFixed(2)} MB</td>
                <td>${new Date(metadata.timeCreated).toLocaleDateString()}</td>
                <td><a href="${downloadURL}" target="_blank">enlace</a></td>
            `;
            fileList.appendChild(row);
        }
    } catch (error) {
        console.error('Error al listar los archivos:', error);
    }
}

function getFileIcon(mimeType) {
    if (!mimeType) return 'fas fa-file';

    const fileTypeMap = {
        'image': 'fas fa-file-image',
        'video': 'fas fa-file-video',
        'audio': 'fas fa-file-audio',
        'pdf': 'fas fa-file-pdf',
        'zip': 'fas fa-file-archive',
        'archive': 'fas fa-file-archive',
        'word': 'fas fa-file-word',
        'excel': 'fas fa-file-excel',
        'powerpoint': 'fas fa-file-powerpoint',
        'text': 'fas fa-file-alt',
    };

    for (const type in fileTypeMap) {
        if (mimeType.includes(type)) {
            return fileTypeMap[type];
        }
    }

    return 'fas fa-file'; // Default icon
}