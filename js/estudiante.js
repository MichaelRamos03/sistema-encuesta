import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  where 
} from './firebase.js';

// Elementos del DOM
const contenedorPreguntas = document.getElementById('contenedorPreguntas');
const formEncuesta = document.getElementById('formEncuesta');
const btnEnviar = document.getElementById('btnEnviarRespuestas');
const alertaExito = document.getElementById('alertaExito');
const alertaError = document.getElementById('alertaError');
const alertaErrorTexto = document.getElementById('alertaErrorTexto');
const inputCorreo = document.getElementById('correoEstudiante');

// Elementos del Encabezado
const dispFacultad = document.getElementById('dispFacultad');
const dispMateria = document.getElementById('dispMateria');
const dispTitulo = document.getElementById('dispTitulo');
const dispObjetivo = document.getElementById('dispObjetivo');
const dispIndicaciones = document.getElementById('dispIndicaciones');

// Utilidades para Alertas Visuales
function mostrarError(mensaje) {
  if (alertaError && alertaErrorTexto) {
    alertaErrorTexto.textContent = mensaje;
    alertaError.classList.remove('d-none');
    
    setTimeout(() => {
      alertaError.classList.add('d-none');
    }, 5000);
  }
}

function ocultarAlertas() {
  if (alertaError) alertaError.classList.add('d-none');
  if (alertaExito) alertaExito.classList.add('d-none');
}

// 1. Cargar Información de Encabezado desde Firestore
async function cargarEncabezado() {
  try {
    const docRef = doc(db, "configuracion", "general");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.facultad) dispFacultad.textContent = data.facultad;
      if (data.materia) dispMateria.textContent = data.materia;
      if (data.titulo) dispTitulo.textContent = data.titulo;
      if (data.objetivo) dispObjetivo.innerHTML = `<strong>Objetivo:</strong> ${data.objetivo}`;
      if (data.indicaciones) dispIndicaciones.innerHTML = `<strong>Indicaciones:</strong> ${data.indicaciones}`;
    }
  } catch (error) {
    console.error("Error al cargar el encabezado:", error);
  }
}

// 2. Cargar Preguntas Dinámicas desde Firestore
async function cargarPreguntas() {
  try {
    const querySnapshot = await getDocs(collection(db, "preguntas"));
    contenedorPreguntas.innerHTML = "";

    if (querySnapshot.empty) {
      contenedorPreguntas.innerHTML = `
        <div class="alert alert-warning text-center small rounded-3">
          No hay preguntas activas registradas en este momento.
        </div>`;
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const preguntaId = docSnap.id;

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
        
        <!-- Campo para especificar en caso de seleccionar 'Otra / Otro' -->
        <div class="mt-2 d-none" id="contenedor-otro-${preguntaId}">
          <input type="text" class="form-control input-modern input-otro" id="input-otro-${preguntaId}" placeholder="Especifica tu respuesta..." autocomplete="off">
          <div class="invalid-feedback">Por favor, especifica tu respuesta.</div>
        </div>
        
        <div class="invalid-feedback">Esta pregunta es obligatoria.</div>
      `;

      contenedorPreguntas.appendChild(preguntaBlock);

      // Evento para detectar si elige "Otra", "Otro" o "Especifique"
      const selectElement = preguntaBlock.querySelector('.pregunta-input');
      const contenedorOtro = preguntaBlock.querySelector(`#contenedor-otro-${preguntaId}`);
      const inputOtro = preguntaBlock.querySelector(`#input-otro-${preguntaId}`);

      selectElement.addEventListener('change', (e) => {
        const valorSeleccionado = e.target.value.trim().toLowerCase();
        
        if (valorSeleccionado === 'otra' || valorSeleccionado === 'otro' || valorSeleccionado.includes('especifique')) {
          contenedorOtro.classList.remove('d-none');
          inputOtro.setAttribute('required', 'true');
        } else {
          contenedorOtro.classList.add('d-none');
          inputOtro.removeAttribute('required');
          inputOtro.value = "";
          inputOtro.classList.remove('is-invalid');
        }
      });
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

// 3. Consultar en Firestore si el correo ya registró respuesta
async function verificarCorreoExistente(correo) {
  const q = query(
    collection(db, "respuestas_encuesta"), 
    where("correo", "==", correo)
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

// 4. Handler para enviar las respuestas
formEncuesta.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlertas();

  const correo = inputCorreo.value.trim();
  const inputsPreguntas = document.querySelectorAll('.pregunta-input');
  
  let esValido = true;

  // Validar Correo
  if (!correo) {
    inputCorreo.classList.add('is-invalid');
    esValido = false;
  } else {
    inputCorreo.classList.remove('is-invalid');
  }

  // Validar Selección de Preguntas
  const respuestasSeleccionadas = {};

  inputsPreguntas.forEach(select => {
    const idPregunta = select.getAttribute('data-id');
    const valorSelect = select.value;
    const inputOtro = document.getElementById(`input-otro-${idPregunta}`);

    if (!valorSelect || valorSelect === "") {
      select.classList.add('is-invalid');
      esValido = false;
    } else {
      select.classList.remove('is-invalid');

      // Validar si eligió opción de texto especificado
      const valorMinuscula = valorSelect.trim().toLowerCase();
      if (valorMinuscula === 'otra' || valorMinuscula === 'otro' || valorMinuscula.includes('especifique')) {
        const textoEspecifico = inputOtro ? inputOtro.value.trim() : "";
        
        if (!textoEspecifico) {
          inputOtro.classList.add('is-invalid');
          esValido = false;
        } else {
          inputOtro.classList.remove('is-invalid');
          respuestasSeleccionadas[idPregunta] = `Otra: ${textoEspecifico}`;
        }
      } else {
        respuestasSeleccionadas[idPregunta] = valorSelect;
      }
    }
  });

  if (!esValido) {
    mostrarError("Por favor, completa tu correo y responde todas las preguntas del formulario.");
    return;
  }

  // Bloqueo de botón mientras valida en Firestore
  btnEnviar.disabled = true;
  btnEnviar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Validando correo...`;

  try {
    // Validar Duplicado de Correo
    const yaExiste = await verificarCorreoExistente(correo);

    if (yaExiste) {
      mostrarError("Este correo electrónico ya ha registrado una respuesta previamente.");
      inputCorreo.classList.add('is-invalid');
      return;
    }

    // Guardado de Datos
    btnEnviar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Enviando...`;

    const payload = {
      correo: correo,
      respuestas: respuestasSeleccionadas,
      fechaEnvio: new Date()
    };

    await addDoc(collection(db, "respuestas_encuesta"), payload);
    
    // Limpieza de Formulario y Estado
    formEncuesta.reset();
    inputCorreo.classList.remove('is-invalid');
    inputsPreguntas.forEach(s => s.classList.remove('is-invalid'));
    document.querySelectorAll('[id^="contenedor-otro-"]').forEach(div => div.classList.add('d-none'));

    alertaExito.classList.remove('d-none');

    setTimeout(() => {
      alertaExito.classList.add('d-none');
    }, 5000);

  } catch (error) {
    console.error("Error al registrar la encuesta:", error);
    mostrarError("Ocurrió un error inesperado al procesar la respuesta.");
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.innerHTML = `<i class="bi bi-send-fill me-2"></i> Enviar Encuesta`;
  }
});

// Inicialización al cargar la página
cargarEncabezado();
cargarPreguntas();