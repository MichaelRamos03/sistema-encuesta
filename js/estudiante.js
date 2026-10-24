import { db, collection, addDoc, getDocs } from './firebase.js';

const contenedorPreguntas = document.getElementById('contenedorPreguntas');
const formEncuesta = document.getElementById('formEncuesta');
const btnEnviar = document.getElementById('btnEnviarRespuestas');
const alertaExito = document.getElementById('alertaExito');

// Cargar preguntas desde Firestore
async function cargarPreguntas() {
  try {
    const querySnapshot = await getDocs(collection(db, "preguntas"));
    contenedorPreguntas.innerHTML = ""; // Limpiar spinner

    if (querySnapshot.empty) {
      contenedorPreguntas.innerHTML = `
        <div class="alert alert-warning text-center small rounded-3">
          No hay preguntas activas registradas en este momento.
        </div>`;
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const preguntaId = doc.id;

      let opcionesHTML = `<option value="" disabled selected>Selecciona una opción</option>`;
      if (Array.isArray(data.opciones)) {
        data.opciones.forEach(opcion => {
          opcionesHTML += `<option value="${opcion}">${opcion}</option>`;
        });
      }

      const preguntaBlock = document.createElement('div');
      preguntaBlock.className = 'mb-4';
      preguntaBlock.innerHTML = `
        <label class="form-label fw-semibold text-dark mb-2">
          <i class="bi bi-patch-question-fill text-primary me-2"></i>${data.texto}
        </label>
        <select class="form-select select-modern pregunta-input" data-id="${preguntaId}" required>
          ${opcionesHTML}
        </select>
      `;

      contenedorPreguntas.appendChild(preguntaBlock);
    });

    btnEnviar.disabled = false;

  } catch (error) {
    console.error("Error al cargar las preguntas:", error);
    contenedorPreguntas.innerHTML = `
      <div class="alert alert-danger text-center small rounded-3">
        Error de conexión al cargar las preguntas.
      </div>`;
  }
}

// Guardar respuestas en respuestas_encuesta
formEncuesta.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  btnEnviar.disabled = true;
  btnEnviar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Enviando...`;

  const correo = document.getElementById('correoEstudiante').value.trim();
  const inputsPreguntas = document.querySelectorAll('.pregunta-input');
  
  const respuestasSeleccionadas = {};
  inputsPreguntas.forEach(input => {
    const idPregunta = input.getAttribute('data-id');
    respuestasSeleccionadas[idPregunta] = input.value;
  });

  const payload = {
    correo: correo,
    respuestas: respuestasSeleccionadas,
    fechaEnvio: new Date()
  };

  try {
    await addDoc(collection(db, "respuestas_encuesta"), payload);
    
    formEncuesta.reset();
    alertaExito.classList.remove('d-none');

    setTimeout(() => {
      alertaExito.classList.add('d-none');
    }, 5000);

  } catch (error) {
    console.error("Error al registrar la encuesta:", error);
    alert("Ocurrió un error al enviar tus respuestas.");
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.innerHTML = `<i class="bi bi-send-fill me-2"></i> Enviar Encuesta`;
  }
});

cargarPreguntas();