import { auth, signInWithEmailAndPassword } from './firebase.js';

const formLogin = document.getElementById('formLogin');
const btnLogin = document.getElementById('btnLogin');
const errorAlert = document.getElementById('errorLogin');

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  btnLogin.disabled = true;
  btnLogin.textContent = "Verificando...";
  errorAlert.classList.add('d-none');

  const email = document.getElementById('emailAdmin').value.trim();
  const password = document.getElementById('passwordAdmin').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Si la autenticación es exitosa, redirigir al Dashboard protegido
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    errorAlert.classList.remove('d-none');
  } finally {
    btnLogin.disabled = false;
    btnLogin.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i> Iniciar Sesión`;
  }
});