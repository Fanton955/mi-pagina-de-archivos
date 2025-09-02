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
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

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
    for (const file of files) {
        // Clear previous previews
        previewArea.innerHTML = '';
        previewFile(file);
        uploadFile(file);
    }
}

function previewFile(file) {
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item d-flex align-items-center mb-3';

    const thumbnail = document.createElement('div');
    thumbnail.className = 'preview-thumbnail';
    thumbnail.innerHTML = `<i class="${getFileIcon(file.type)}"></i>`;

    const details = document.createElement('div');
    details.className = 'preview-details ms-3';
    details.innerHTML = `
        <div class="file-name">${file.name}</div>
        <div class="progress mt-1">
            <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <div class="upload-status mt-1 small">Esperando...</div>
    `;

    previewItem.appendChild(thumbnail);
    previewItem.appendChild(details);
    previewArea.appendChild(previewItem);
}

// --- Upload Function with Retry --- //
async function uploadFile(file) {
    if (!currentUser) {
        console.error("No hay un usuario autenticado para subir archivos.");
        return;
    }
    await uploadWithRetry(file);
}

async function uploadWithRetry(file, retries = 3) {
    const progressBar = previewArea.querySelector('.progress-bar');
    const uploadStatus = previewArea.querySelector('.upload-status');
    const filePath = `${currentUser.id}/${file.name}`;
    let attempt = 0;

    while (attempt < retries) {
        progressBar.style.width = `${(attempt / retries) * 100}%`;
        progressBar.setAttribute('aria-valuenow', (attempt / retries) * 100);
        uploadStatus.textContent = `Subiendo... (Intento ${attempt + 1}/${retries})`;
        uploadStatus.className = 'upload-status mt-1 small text-info';

        try {
            const { data, error } = await supabase.storage
                .from('uploads')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error(`Error en el intento ${attempt + 1} de subida:`, error);
                if (attempt < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2 segundos antes de reintentar
                } else {
                    uploadStatus.innerHTML = `<span class="text-danger">La subida falló después de ${retries} intentos: ${error.message}</span>`;
                    return; // Sale de la función después del último intento fallido
                }
            } else {
                console.log("Archivo subido con éxito:", data);
                progressBar.style.width = `100%`;
                progressBar.setAttribute('aria-valuenow', 100);

                const { data: publicUrlData } = supabase.storage
                    .from('uploads')
                    .getPublicUrl(filePath);

                if (publicUrlData) {
                    uploadStatus.innerHTML = `¡Subido! <a href="${publicUrlData.publicUrl}" target="_blank">Enlace de Descarga</a>`;
                    listFiles();
                }
                return; // Sale de la función después de una subida exitosa
            }
        } catch (err) {
            console.error(`Error inesperado en el intento ${attempt + 1}:`, err);
            if (attempt < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                uploadStatus.innerHTML = `<span class="text-danger">Error inesperado después de ${retries} intentos.</span>`;
                return;
            }
        }
        attempt++;
    }
}

// --- File Listing --- //
async function listFiles() {
    fileList.innerHTML = '';
    const { data, error } = await supabase.storage
        .from('uploads')
        .list(currentUser.id, {
            sortBy: { column: 'created_at', order: 'desc' },
        });

    if (error) {
        console.error('Error al listar archivos:', error);
        return;
    }

    if (data.length === 0) {
        fileList.innerHTML = '<tr><td colspan="5" class="text-center">No has subido ningún archivo aún.</td></tr>';
        return;
    }

    for (const file of data) {
        const { data: publicUrlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(`${currentUser.id}/${file.name}`);

        addFileRow(file.name, file.id, publicUrlData.publicUrl);
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function addFileRow(fileName, fileId, publicUrl) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${fileName}</td>
        <td>Desconocido</td>
        <td>Desconocida</td>
        <td><a href="${publicUrl}" target="_blank">Enlace</a></td>
        <td><button class="btn btn-outline-primary btn-sm copy-link-btn" data-url="${publicUrl}">Copiar</button></td>
    `;
    fileList.appendChild(row);
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
        'javascript': 'fab fa-js',
        'css': 'fab fa-css3-alt',
        'html': 'fab fa-html5',
        'json': 'fas fa-file-code'
    };

    const type = mimeType.split('/')[0];
    if (fileTypeMap[type]) {
        return fileTypeMap[type];
    } else {
        const subtype = mimeType.split('/')[1];
        if (subtype.includes('pdf')) return fileTypeMap['pdf'];
        if (subtype.includes('zip') || subtype.includes('rar') || subtype.includes('x-tar')) return fileTypeMap['archive'];
        if (subtype.includes('word')) return fileTypeMap['word'];
        if (subtype.includes('excel')) return fileTypeMap['excel'];
        if (subtype.includes('powerpoint')) return fileTypeMap['powerpoint'];
        if (mimeType.includes('text/plain')) return fileTypeMap['text'];
        if (mimeType.includes('json')) return fileTypeMap['json'];
        if (mimeType.includes('javascript')) return fileTypeMap['javascript'];
        if (mimeType.includes('css')) return fileTypeMap['css'];
        if (mimeType.includes('html')) return fileTypeMap['html'];
    }

    return 'fas fa-file';
}
