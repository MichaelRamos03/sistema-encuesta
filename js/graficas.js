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
      snapshotRespuestas = { empty: true, size: 0, forEach: () => {} };
    }

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

      // Desglose de votos y porcentajes debajo de la dona
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

      // Tarjeta web con formato Dona
      const colDiv = document.createElement('div');
      colDiv.className = 'col-md-6 col-xl-6 mb-4 tarjeta-pregunta';
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

      // Renderizar gráfica de DONA
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
        font: { family: 'Inter', size: 11 },
        usePointStyle: true,
        padding: 12
      }
    },
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
  }
}

// Botón de Impresión para PDF
if (btnExportar) {
  btnExportar.addEventListener('click', () => {
    window.print();
  });
}

// Vaciar respuestas
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