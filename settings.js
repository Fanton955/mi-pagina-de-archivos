import { supabase } from './supabase-init.js';

const userEmail = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const changePasswordForm = document.getElementById('change-password-form');
const newPasswordInput = document.getElementById('new-password');
const passwordMessage = document.getElementById('password-message');
const deleteAccountButton = document.getElementById('delete-account-button');

let currentUser = null;

supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
        currentUser = session.user;
        userEmail.textContent = currentUser.email;
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

changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = newPasswordInput.value;

    if (newPassword.length < 6) {
        passwordMessage.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        passwordMessage.className = 'text-danger';
        return;
    }

    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) {
        passwordMessage.textContent = `Error: ${error.message}`;
        passwordMessage.className = 'text-danger';
    } else {
        passwordMessage.textContent = '¡Contraseña actualizada con éxito!';
        passwordMessage.className = 'text-success';
        changePasswordForm.reset();
    }
});

deleteAccountButton.addEventListener('click', async () => {
    const confirmation = confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.');

    if (confirmation) {
        try {
            const response = await fetch('/netlify/functions/delete-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabase.auth.session().access_token}` // Pass the user's JWT
                },
                body: JSON.stringify({ userId: currentUser.id }) // Pass the user ID
            });

            const result = await response.json();

            if (response.ok) {
                alert('Tu cuenta ha sido eliminada.');
                window.location.href = 'index.html';
            } else {
                alert(`Error al eliminar la cuenta: ${result.message}`);
                console.error('Error deleting user:', result.message);
            }
        } catch (error) {
            alert(`Error al eliminar la cuenta: ${error.message}`);
            console.error('Error deleting user:', error);
        }
    }
});
