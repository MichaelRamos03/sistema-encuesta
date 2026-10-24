import { 
  db, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from './firebase.js';

const contenedorGraficas = document.getElementById('contenedorGraficas');
const totalBadge = document.getElementById('totalRespuestasBadge');
const btnVaciar = document.getElementById('btnVaciarRespuestas');
const btnExportar = document.getElementById('btnExportarPDF');

const chartColors = [
  '#4f46e5', '#3b82f6', '#10b981', '#f59e0b', 
  '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'
];

async function renderizarGraficas() {
  if (!contenedorGraficas) return;

  try {
    // 1. Obtener preguntas ordenadas cronológicamente (P1, P2, P3...)
    const qPreguntas = query(collection(db, "preguntas"), orderBy("fechaCreacion", "asc"));
    const snapshotPreguntas = await getDocs(qPreguntas);
    
    // 2. Obtener respuestas registradas
    let snapshotRespuestas;
    try {
      snapshotRespuestas = await getDocs(collection(db, "respuestas_encuesta"));
    } catch (errResp) {
      console.warn("Colección 'respuestas_encuesta' vacía o no iniciada:", errResp);
      snapshotRespuestas = { empty: true, size: 0, forEach: () => {} };
    }

    if (snapshotPreguntas.empty) {
      contenedorGraficas.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="glass-card p-5">
            <i class="bi bi-exclamation-circle fs-1 text-warning d-block mb-3"></i>
            <h5 class="fw-bold">No hay preguntas creadas</h5>
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

      // Generar tarjeta para la gráfica
      const colDiv = document.createElement('div');
      colDiv.className = 'col-md-6 col-xl-6 mb-4 tarjeta-pregunta';
      colDiv.innerHTML = `
        <div class="glass-card p-3 h-100 d-flex flex-column justify-content-between">
          <h6 class="fw-bold text-dark mb-2 small">
            <span class="badge bg-primary text-white me-1">P${indexPregunta}</span> ${textoPregunta}
          </h6>
          <div class="chart-container" style="position: relative; height:180px; width:100%;">
            <canvas id="chart-${idPregunta}"></canvas>
          </div>
        </div>
      `;
      contenedorGraficas.appendChild(colDiv);

      // Renderizar gráfica de barras horizontales compactas
      const canvasEl = document.getElementById(`chart-${idPregunta}`);
      if (canvasEl && typeof Chart !== 'undefined') {
        const ctx = canvasEl.getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Votos',
              data: dataValues,
              backgroundColor: chartColors.slice(0, labels.length),
              borderRadius: 4
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const valor = context.raw || 0;
                    const porcentaje = totalVotosPregunta > 0 
                      ? ((valor / totalVotosPregunta) * 100).toFixed(1) 
                      : 0;
                    return ` ${valor} voto(s) (${porcentaje}%)`;
                  }
                }
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: { precision: 0, font: { size: 10 } }
              },
              y: {
                ticks: { font: { size: 10 } }
              }
            }
          }
        });
      }
    });

  } catch (error) {
    console.error("Error al renderizar gráficas:", error);
  }
}

// Botón de Impresión
if (btnExportar) {
  btnExportar.addEventListener('click', () => {
    window.print();
  });
}

// Botón de Vaciar Respuestas
if (btnVaciar) {
  btnVaciar.addEventListener('click', async () => {
    if (confirm("¿Estás seguro de que deseas borrar TODAS las respuestas registradas?")) {
      try {
        const snapshot = await getDocs(collection(db, "respuestas_encuesta"));
        const borrados = snapshot.docs.map(documento => deleteDoc(doc(db, "respuestas_encuesta", documento.id)));
        await Promise.all(borrados);
        location.reload();
      } catch (error) {
        console.error("Error al borrar respuestas:", error);
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderizarGraficas);
} else {
  renderizarGraficas();
}