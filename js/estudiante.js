import { db, collection, addDoc, getDocs, query, where } from './firebase.js';

const contenedorPreguntas = document.getElementById('contenedorPreguntas');
const formEncuesta = document.getElementById('formEncuesta');
const btnEnviar = document.getElementById('btnEnviarRespuestas');
const alertaExito = document.getElementById('alertaExito');
const inputCorreo = document.getElementById('correoEstudiante');

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
        <div class="invalid-feedback">Esta pregunta es obligatoria.</div>
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

// Consultar si el correo ya respondió anteriormente
async function verificarCorreoExistente(correo) {
  const q = query(
    collection(db, "respuestas_encuesta"), 
    where("correo", "==", correo)
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

// Guardar respuestas
formEncuesta.addEventListener('submit', async (e) => {
  e.preventDefault();

  const correo = inputCorreo.value.trim();
  const inputsPreguntas = document.querySelectorAll('.pregunta-input');
  
  let esValido = true;

  // 1. Validar el campo de correo
  if (!correo) {
    inputCorreo.classList.add('is-invalid');
    esValido = false;
  } else {
    inputCorreo.classList.remove('is-invalid');
  }

  // 2. Validar que TODAS las preguntas tengan respuesta seleccionada
  const respuestasSeleccionadas = {};

  inputsPreguntas.forEach(select => {
    const idPregunta = select.getAttribute('data-id');
    const valor = select.value;

    if (!valor || valor === "") {
      select.classList.add('is-invalid');
      esValido = false;
    } else {
      select.classList.remove('is-invalid');
      respuestasSeleccionadas[idPregunta] = valor;
    }
  });

  // Si falta responder alguna opción o el correo, detener el proceso
  if (!esValido) {
    alert("Por favor, completa tu correo y responde todas las preguntas del formulario.");
    return;
  }

  // Cambiar estado visual del botón mientras realiza la validación remota
  btnEnviar.disabled = true;
  btnEnviar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Validando correo...`;

  try {
    // 3. Validar duplicado en Firestore
    const yaExiste = await verificarCorreoExistente(correo);

    if (yaExiste) {
      alert("Este correo electrónico ya ha respondido la encuesta anteriormente.");
      inputCorreo.classList.add('is-invalid');
      return;
    }

    // 4. Registrar respuestas
    btnEnviar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Enviando...`;

    const payload = {
      correo: correo,
      respuestas: respuestasSeleccionadas,
      fechaEnvio: new Date()
    };

    await addDoc(collection(db, "respuestas_encuesta"), payload);
    
    // Limpieza e interfaz
    formEncuesta.reset();
    
    // Limpiar clases de validación de Bootstrap
    inputCorreo.classList.remove('is-invalid');
    inputsPreguntas.forEach(s => s.classList.remove('is-invalid'));

    alertaExito.classList.remove('d-none');

    setTimeout(() => {
      alertaExito.classList.add('d-none');
    }, 5000);

  } catch (error) {
    console.error("Error al registrar la encuesta:", error);
    alert("Ocurrió un error al procesar la respuesta.");
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.innerHTML = `<i class="bi bi-send-fill me-2"></i> Enviar Encuesta`;
  }
});

// Inicializar la carga de preguntas
cargarPreguntas();