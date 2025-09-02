import { auth, storage } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { ref, uploadBytesResumable, getDownloadURL, listAll } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

const userEmail = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const uploadContainer = document.getElementById('upload-container');
const fileInput = document.getElementById('file-input');
const resultDiv = document.getElementById('result');
const fileList = document.getElementById('file-list');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in.
        userEmail.textContent = user.email;
        listFiles();
    } else {
        // No user is signed in.
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

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadContainer.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    uploadContainer.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadContainer.addEventListener(eventName, unhighlight, false);
});

uploadContainer.addEventListener('drop', handleDrop, false);

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    uploadContainer.classList.add('bg-light');
}

function unhighlight(e) {
    uploadContainer.classList.remove('bg-light');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length === 0) {
        resultDiv.innerHTML = 'Por favor, selecciona un archivo para subir.';
        return;
    }
    uploadFile(files[0]);
}

function uploadFile(file) {
    const user = auth.currentUser;
    if (!user) {
        return;
    }

    const storageRef = ref(storage, `${user.uid}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            resultDiv.innerHTML = `Subida al ${progress.toFixed(2)}%`;
        }, 
        (error) => {
            resultDiv.innerHTML = `La subida falló: ${error.message}`;
        }, 
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                resultDiv.innerHTML = `¡Archivo subido con éxito! <a href="${downloadURL}" target="_blank">Enlace de Descarga</a>`;
                listFiles();
            });
        }
    );
}

async function listFiles() {
    const user = auth.currentUser;
    if (!user) {
        return;
    }

    const listRef = ref(storage, user.uid);
    fileList.innerHTML = '';

    try {
        const res = await listAll(listRef);
        res.items.forEach((itemRef) => {
            getDownloadURL(itemRef).then((downloadURL) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${itemRef.name}</td>
                    <td>...</td>
                    <td>...</td>
                    <td><a href="${downloadURL}" target="_blank">enlace</a></td>
                `;
                fileList.appendChild(row);
            });
        });
    } catch (error) {
        console.error('Error al listar los archivos:', error);
    }
}
