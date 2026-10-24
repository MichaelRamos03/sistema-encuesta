import { db, collection, addDoc } from './firebase.js';

const form = document.getElementById('formCrearPregunta');
const alerta = document.getElementById('alertaAdmin');
const btnGuardar = document.getElementById('btnGuardarPregunta');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Guardando...`;

    const texto = document.getElementById('textoPregunta').value.trim();
    const opcionesTexto = document.getElementById('opcionesPregunta').value;

    // Convertir el texto "Java, PHP, C++" en arreglo ["Java", "PHP", "C++"]
    const opcionesArray = opcionesTexto.split(',').map(opcion => opcion.trim()).filter(opcion => opcion !== "");

    try {
      await addDoc(collection(db, "preguntas"), {
        texto: texto,
        opciones: opcionesArray,
        fechaCreacion: new Date()
      });

      alerta.classList.remove('d-none');
      form.reset();
      
      setTimeout(() => alerta.classList.add('d-none'), 3500);

    } catch (error) {
      console.error("Error al guardar la pregunta: ", error);
      alert("Hubo un error al guardar en la base de datos.");
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = `<i class="bi bi-cloud-arrow-up-fill me-2 fs-5"></i> Guardar en Firestore`;
    }
  });
}