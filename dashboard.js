async function uploadFile(file) {
    if (!currentUser) {
        console.error("No hay un usuario autenticado para subir archivos.");
        return;
    }

    const progressBar = previewArea.querySelector('.progress-bar');
    const uploadStatus = previewArea.querySelector('.upload-status');
    const filePath = `${currentUser.id}/${file.name}`;

    progressBar.style.width = `0%`;
    progressBar.setAttribute('aria-valuenow', 0);
    uploadStatus.textContent = "Subiendo...";
    uploadStatus.className = 'upload-status mt-1 small text-info';

    try {
        const { data, error } = await supabase.storage
            .from('uploads')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error("Error al subir el archivo:", error);
            uploadStatus.innerHTML = `<span class="text-danger">La subida falló: ${error.message}</span>`;
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
        }
    } catch (err) {
        console.error("Error inesperado durante la subida:", err);
        uploadStatus.innerHTML = `<span class="text-danger">Error inesperado.</span>`;
    }
}
