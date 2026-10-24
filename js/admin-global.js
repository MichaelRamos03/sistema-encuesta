import { auth, onAuthStateChanged, signOut } from './firebase.js';

// Verificación de Sesión Activa (Guardián)
onAuthStateChanged(auth, (user) => {
  const currentPath = window.location.pathname;

  // Si no está autenticado y no está en la página de login, redirigir al login
  if (!user && !currentPath.endsWith('/admin/') && !currentPath.endsWith('/admin/index.html')) {
    window.location.href = 'index.html';
  }
});

// Función global para cerrar sesión
document.addEventListener('DOMContentLoaded', () => {
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        window.location.href = 'index.html';
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
      }
    });
  }
});