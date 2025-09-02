import { auth } from './firebase-init.js';
import { onAuthStateChanged, updatePassword, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const userEmail = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const changePasswordForm = document.getElementById('change-password-form');
const newPasswordInput = document.getElementById('new-password');
const passwordMessage = document.getElementById('password-message');
const deleteAccountButton = document.getElementById('delete-account-button');

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userEmail.textContent = user.email;
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

changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = newPasswordInput.value;

    if (newPassword.length < 6) {
        passwordMessage.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        passwordMessage.className = 'text-danger';
        return;
    }

    try {
        await updatePassword(currentUser, newPassword);
        passwordMessage.textContent = '¡Contraseña actualizada con éxito!';
        passwordMessage.className = 'text-success';
        changePasswordForm.reset();
    } catch (error) {
        passwordMessage.textContent = `Error: ${error.message}`;
        passwordMessage.className = 'text-danger';
        console.error('Error updating password:', error);
        // For security reasons, Firebase might require recent login to change password.
        // You might need to implement re-authentication here.
        if (error.code === 'auth/requires-recent-login') {
            passwordMessage.textContent = 'Esta operación es sensible y requiere autenticación reciente. Por favor, inicia sesión de nuevo.';
        }
    }
});

deleteAccountButton.addEventListener('click', async () => {
    const confirmation = confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.');

    if (confirmation) {
        try {
            await deleteUser(currentUser);
            alert('Tu cuenta ha sido eliminada.');
            window.location.href = 'index.html';
        } catch (error) {
            alert(`Error al eliminar la cuenta: ${error.message}`);
            console.error('Error deleting user:', error);
            if (error.code === 'auth/requires-recent-login') {
                alert('Esta operación es sensible y requiere autenticación reciente. Por favor, inicia sesión de nuevo.');
            }
        }
    }
});
