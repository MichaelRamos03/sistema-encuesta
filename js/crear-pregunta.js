import { db, collection, addDoc, doc, setDoc, getDoc } from './firebase.js';

const formPregunta = document.getElementById('formCrearPregunta');
const formHeader = document.getElementById('formConfigEncuesta');

const alerta = document.getElementById('alertaAdmin');
const alertaTitulo = document.getElementById('alertaAdminTitulo');
const alertaTexto = document.getElementById('alertaAdminTexto');

const btnGuardarPregunta = document.getElementById('btnGuardarPregunta');
const btnGuardarHeader = document.getElementById('btnGuardarHeader');

function mostrarNotificacion(titulo, mensaje) {
  if (alerta && alertaTitulo && alertaTexto) {
    alertaTitulo.textContent = titulo;
    alertaTexto.textContent = mensaje;
    alerta.classList.remove('d-none');
    setTimeout(() => alerta.classList.add('d-none'), 3500);
  }
}

// Cargar solo Título y Objetivo existente
async function cargarConfiguracion() {
  try {
    const docRef = doc(db, "configuracion", "general");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.titulo) document.getElementById('tituloEncuesta').value = data.titulo;
      if (data.objetivo) document.getElementById('objetivoEncuesta').value = data.objetivo;
    }
  } catch (error) {
    console.error("Error al cargar la configuración:", error);
  }
}

// Guardar Título y Objetivo
if (formHeader) {
  formHeader.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    btnGuardarHeader.disabled = true;
    btnGuardarHeader.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Guardando...`;

    const configData = {
      titulo: document.getElementById('tituloEncuesta').value.trim(),
      objetivo: document.getElementById('objetivoEncuesta').value.trim(),
      fechaActualizacion: new Date()
    };

    try {
      await setDoc(doc(db, "configuracion", "general"), configData);
      mostrarNotificacion("Encabezado Guardado", "Título y objetivo actualizados correctamente.");
    } catch (error) {
      console.error("Error al guardar encabezado: ", error);
      alert("Error al actualizar la información general.");
    } finally {
      btnGuardarHeader.disabled = false;
      btnGuardarHeader.innerHTML = `<i class="bi bi-save-fill me-2"></i> Guardar Encabezado`;
    }
  });
}

// Guardar Pregunta
if (formPregunta) {
  formPregunta.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    btnGuardarPregunta.disabled = true;
    btnGuardarPregunta.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Guardando...`;

    const texto = document.getElementById('textoPregunta').value.trim();
    const opcionesTexto = document.getElementById('opcionesPregunta').value;

    const opcionesArray = opcionesTexto.split(',').map(op => op.trim()).filter(op => op !== "");

    try {
      await addDoc(collection(db, "preguntas"), {
        texto: texto,
        opciones: opcionesArray,
        fechaCreacion: new Date()
      });

      mostrarNotificacion("Pregunta Agregada", "La pregunta se registró exitosamente.");
      formPregunta.reset();

    } catch (error) {
      console.error("Error al guardar la pregunta: ", error);
      alert("Hubo un error al guardar en la base de datos.");
    } finally {
      btnGuardarPregunta.disabled = false;
      btnGuardarPregunta.innerHTML = `<i class="bi bi-cloud-arrow-up-fill me-2 fs-5"></i> Guardar Pregunta`;
    }
  });
}

cargarConfiguracion();