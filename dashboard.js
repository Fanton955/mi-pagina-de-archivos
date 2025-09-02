const userEmail = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const uploadArea = document.getElementById('upload-area');
const uploadContainer = document.getElementById('upload-container');
const fileInput = document.getElementById('file-input');
const previewArea = document.getElementById('preview-area');
const fileList = document.getElementById('file-list');

let currentUser = null;

// --- Auth --- //
supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
        currentUser = session.user;
        userEmail.textContent = currentUser.email;
        listFiles();
    } else {
        window.location.href = 'login.html';
    }
});

logoutButton.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
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
    const file = files[0];
    createPreview(file);
    uploadFile(file);
}

// --- Preview and Upload --- //

function createPreview(file) {
    previewArea.innerHTML = '';

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

async function uploadFile(file) {
    if (!currentUser) return;

    const filePath = `${currentUser.id}/${file.name}`;
    const { error } = await supabase.storage
        .from('uploads') // Supabase uses buckets, we need to create one named 'uploads'
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });
    
    const progressBar = previewArea.querySelector('.progress-bar');
    const uploadStatus = previewArea.querySelector('.upload-status');

    if (error) {
        uploadStatus.innerHTML = `<span class="text-danger">La subida falló: ${error.message}</span>`;
    } else {
        progressBar.style.width = `100%`;
        progressBar.setAttribute('aria-valuenow', 100);
        const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
        uploadStatus.innerHTML = `¡Subido! <a href="${data.publicUrl}" target="_blank">Enlace de Descarga</a>`;
        listFiles();
    }
}

// --- File List --- //

async function listFiles() {
    if (!currentUser) return;

    const { data, error } = await supabase.storage.from('uploads').list(currentUser.id, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
        console.error('Error al listar los archivos:', error);
        return;
    }

    fileList.innerHTML = '';
    for (const file of data) {
        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(`${currentUser.id}/${file.name}`);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><i class="${getFileIcon(file.metadata.mimetype)} me-2"></i>${file.name}</td>
            <td>${(file.metadata.size / 1024 / 1024).toFixed(2)} MB</td>
            <td>${new Date(file.created_at).toLocaleDateString()}</td>
            <td><a href="${urlData.publicUrl}" target="_blank">enlace</a></td>
            <td><button class="btn btn-sm btn-outline-primary copy-link-btn" data-url="${urlData.publicUrl}">Copiar</button></td>
        `;
        fileList.appendChild(row);
    }
}

fileList.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-link-btn')) {
        const button = e.target;
        const url = button.dataset.url;
        navigator.clipboard.writeText(url).then(() => {
            const originalText = button.textContent;
            button.textContent = '¡Copiado!';
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-success');
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('btn-success');
                button.classList.add('btn-outline-primary');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }
});

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

    return 'fas fa-file';
}