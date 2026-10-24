import { db, collection, getDocs, deleteDoc, doc } from './firebase.js';

const contenedorGraficas = document.getElementById('contenedorGraficas');
const totalBadge = document.getElementById('totalRespuestasBadge');
const btnVaciar = document.getElementById('btnVaciarRespuestas');

const chartColors = [
  '#4f46e5', '#3b82f6', '#10b981', '#f59e0b', 
  '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'
];

async function renderizarGraficas() {
  if (!contenedorGraficas) return;

  try {
    // 1. Obtener preguntas registradas
    const snapshotPreguntas = await getDocs(collection(db, "preguntas"));
    
    // 2. Obtener respuestas de la encuesta de forma segura
    let snapshotRespuestas;
    try {
      snapshotRespuestas = await getDocs(collection(db, "respuestas_encuesta"));
    } catch (errResp) {
      console.warn("Colección 'respuestas_encuesta' no iniciada aún:", errResp);
      snapshotRespuestas = { empty: true, size: 0, forEach: () => {} };
    }

    // Si no hay preguntas creadas
    if (snapshotPreguntas.empty) {
      contenedorGraficas.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="glass-card p-5">
            <i class="bi bi-exclamation-circle fs-1 text-warning d-block mb-3"></i>
            <h5 class="fw-bold">No hay preguntas creadas</h5>
            <p class="text-muted small mb-0">Crea preguntas desde el panel para empezar a recopilar datos.</p>
          </div>
        </div>`;
      if (totalBadge) totalBadge.textContent = "0 Respuestas";
      return;
    }

    const totalRespuestas = snapshotRespuestas.size || 0;
    if (totalBadge) totalBadge.textContent = `${totalRespuestas} Encuesta(s) Recibida(s)`;

    contenedorGraficas.innerHTML = ""; // Limpiar spinner

    let indexPregunta = 0;

    snapshotPreguntas.forEach((docPregunta) => {
      indexPregunta++;
      const dataPregunta = docPregunta.data();
      const idPregunta = docPregunta.id;
      const textoPregunta = dataPregunta.texto;
      const opciones = dataPregunta.opciones || [];

      const conteoOpciones = {};
      opciones.forEach(op => conteoOpciones[op] = 0);

      // Conteo de respuestas para la pregunta actual
      let totalVotosPregunta = 0;
      if (!snapshotRespuestas.empty) {
        snapshotRespuestas.forEach((docResp) => {
          const dataResp = docResp.data();
          if (dataResp.respuestas && dataResp.respuestas[idPregunta]) {
            const seleccion = dataResp.respuestas[idPregunta];
            if (conteoOpciones[seleccion] !== undefined) {
              conteoOpciones[seleccion]++;
              totalVotosPregunta++;
            }
          }
        });
      }

      const labels = Object.keys(conteoOpciones);
      const dataValues = Object.values(conteoOpciones);

      // Generar HTML con desglose de porcentajes en texto
      let desgloseHTML = `<div class="mt-3 pt-3 border-top">`;
      labels.forEach((label, idx) => {
        const votos = conteoOpciones[label];
        const porcentaje = totalVotosPregunta > 0 ? ((votos / totalVotosPregunta) * 100).toFixed(1) : 0;
        const color = chartColors[idx % chartColors.length];

        desgloseHTML += `
          <div class="d-flex justify-content-between align-items-center mb-1 small">
            <span>
              <span class="d-inline-block rounded-circle me-1" style="width:10px; height:10px; background-color:${color}"></span>
              ${label}
            </span>
            <span class="fw-bold text-dark">${votos} voto(s) (${porcentaje}%)</span>
          </div>
        `;
      });
      desgloseHTML += `</div>`;

      // Inyectar HTML de la tarjeta
      const colDiv = document.createElement('div');
      colDiv.className = 'col-md-6 col-xl-6 mb-4';
      colDiv.innerHTML = `
        <div class="glass-card p-4 h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="fw-bold text-dark mb-0">
                <span class="badge bg-primary text-white me-2">P${indexPregunta}</span>${textoPregunta}
              </h5>
            </div>
            <div class="chart-container d-flex justify-content-center align-items-center" style="min-height:220px;">
              <canvas id="chart-${idPregunta}"></canvas>
            </div>
          </div>
          ${desgloseHTML}
        </div>
      `;
      contenedorGraficas.appendChild(colDiv);

      // Renderizar gráfica con Chart.js
      const canvasEl = document.getElementById(`chart-${idPregunta}`);
      if (canvasEl && typeof Chart !== 'undefined') {
        const ctx = canvasEl.getContext('2d');
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: dataValues,
              backgroundColor: chartColors.slice(0, labels.length),
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  font: { family: 'Inter', size: 12 },
                  usePointStyle: true
                }
              },
              // Configuración de los Tooltips para mostrar Porcentaje
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const label = context.label || '';
                    const valor = context.raw || 0;
                    const porcentaje = totalVotosPregunta > 0 
                      ? ((valor / totalVotosPregunta) * 100).toFixed(1) 
                      : 0;
                    return ` ${label}: ${valor} votos (${porcentaje}%)`;
                  }
                }
              }
            }
          }
        });
      }
    });

  } catch (error) {
    console.error("Error al renderizar gráficas:", error);
    if (contenedorGraficas) {
      contenedorGraficas.innerHTML = `
        <div class="col-12 alert alert-danger text-center rounded-4 p-4">
          <i class="bi bi-bug-fill fs-3 d-block mb-2"></i>
          <strong>Error al procesar los datos:</strong> ${error.message}
        </div>`;
    }
  }
}

// Evento para vaciar las respuestas
if (btnVaciar) {
  btnVaciar.addEventListener('click', async () => {
    const confirmar = confirm("¿Estás seguro de que deseas borrar TODAS las respuestas registradas?");
    
    if (confirmar) {
      try {
        const snapshot = await getDocs(collection(db, "respuestas_encuesta"));
        const borrados = snapshot.docs.map(documento => deleteDoc(doc(db, "respuestas_encuesta", documento.id)));
        
        await Promise.all(borrados);
        alert("Respuestas eliminadas correctamente.");
        location.reload();
      } catch (error) {
        console.error("Error al borrar respuestas:", error);
        alert("Hubo un error al intentar vaciar las respuestas.");
      }
    }
  });
}

// Inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderizarGraficas);
} else {
  renderizarGraficas();
}