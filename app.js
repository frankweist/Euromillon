
/* -------------------------------------------------------------------------
   app.js - Orquestador Principal (Módulos)
   ------------------------------------------------------------------------- */
import * as utils from './js/utils.js';
import * as ui from './js/ui.js';
import * as logic from './js/logic.js';

document.addEventListener('DOMContentLoaded', () => {

// Estado global de la aplicación
let state = utils.loadState();

// Devuelve el próximo sorteo (martes/viernes) que tenga al menos un jugador elegible
function getNextEligibleDraw(state, maxWeeks = 8, allowedDays = ['martes', 'viernes']) {
  const now = new Date();
  const allowedSet = new Set(allowedDays.map((d) => d.toLowerCase()));
  const dowToStr = (dow) => (dow === 2 ? 'martes' : dow === 5 ? 'viernes' : '');

  for (let i = 0; i < maxWeeks * 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const day = d.getDay(); // 0=Sun,1=Mon,...
    const diaStr = dowToStr(day);
    if (!diaStr || !allowedSet.has(diaStr)) continue;
    const payMonth = utils.toISOMonth(d);
    const ids = logic.computeEligibleIds(state, diaStr, payMonth);
    if (ids && ids.length > 0) {
      return { fecha: utils.toISODate(d), dia: diaStr, ids };
    }
  }
  return null;
}

/* ---------------- DASHBOARD ---------------- */
function renderDashboard() {
  const month = utils.toISOMonth(new Date());
  utils.$('#kpiMes').textContent = month;

  const activos = state.participantes.filter((p) => p.activo).length;
  utils.$('#kpiActivos').textContent = activos;

  logic.ensurePayMonth(state, month);
  const entries = state.pagos[month].entries;
  const activosIds = state.participantes.filter((p) => p.activo).map((p) => p.id);
  const pagados = activosIds.filter((id) => entries[id]?.pagado).length;

  utils.$('#kpiPagados').textContent = pagados;
  utils.$('#kpiPendientes').textContent = activos - pagados;

  utils.$('#dashCosteApuesta').textContent = utils.euro(state.config.costeApuesta);
  utils.$('#dashMensualSugerido').textContent = utils.euro(state.config.mensualSugerido);

  // Inicializar inputs del Dashboard
  if (!utils.$('#dashFechaSorteo').value)
    utils.$('#dashFechaSorteo').value = utils.toISODate(new Date());
  if (!utils.$('#dashPayMonth').value)
    utils.$('#dashPayMonth').value = utils.toISOMonth(new Date());
  if (!utils.$('#dashDiaSorteo').value) utils.$('#dashDiaSorteo').value = 'martes';

  const updateElegibles = () => {
    const dia = utils.$('#dashDiaSorteo').value;
    const payMonth = utils.$('#dashPayMonth').value;
    const ids = logic.computeEligibleIds(state, dia, payMonth);

    utils.$('#dashElegiblesCount').textContent = ids.length;
    utils.$('#dashTotalEuros').textContent = utils.euro(
      ids.length * (state.config.costeApuesta || 2.5)
    );

    const list = utils.$('#dashElegiblesList');
    list.innerHTML = '';
    ids.forEach((id) => {
      const p = logic.getParticipante(state, id);
      if (p) {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = p.nombre;
        list.appendChild(chip);
      }
    });

    // Habilitar/deshabilitar acciones según elegibles
    const btnCrear = utils.$('#btnCrearSorteoDesdeDashboard');
    const btnExport = utils.$('#btnExportCsv');
    if (btnCrear) btnCrear.disabled = ids.length === 0;
    if (btnExport) btnExport.disabled = ids.length === 0;
  };

  // Actualizamos cuando cambien inputs relevantes
  utils.$('#dashFechaSorteo').onchange = updateElegibles;
  utils.$('#dashDiaSorteo').onchange = updateElegibles;
  utils.$('#dashPayMonth').onchange = updateElegibles;

  updateElegibles();

  // Calculamos el próximo sorteo con jugadores elegibles usando la configuración
  const allowed = [];
  if (state.config && state.config.nextDrawDays) {
    if (state.config.nextDrawDays.martes) allowed.push('martes');
    if (state.config.nextDrawDays.viernes) allowed.push('viernes');
  }

  const weeks =
    state.config && typeof state.config.nextDrawWeeks === 'number' ? state.config.nextDrawWeeks : 8;

  if (allowed.length === 0) {
    utils.$('#dashProximoSorteo').textContent = 'No hay días seleccionados para el cálculo';
    utils.$('#dashProximoInfo').textContent = '';
  } else {
    const next = getNextEligibleDraw(state, weeks, allowed);
    if (next) {
      utils.$('#dashProximoSorteo').textContent = `${next.fecha} — ${utils.cap(next.dia)}`;
      const total = next.ids.length * (state.config.costeApuesta || 2.5);
      utils.$('#dashProximoInfo').textContent =
        `${next.ids.length} jugadores · ${utils.euro(total)}`;
    } else {
      utils.$('#dashProximoSorteo').textContent =
        `Ningún sorteo apto en las próximas ${weeks} semanas`;
      utils.$('#dashProximoInfo').textContent = '';
    }
  }

  // Últimos resultados (3 más recientes con resultados registrados)
  const recent = (state.sorteos || [])
    .filter((s) => s.resultados && typeof s.resultados.totalWinners === 'number')
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 3);

  // Mostrar los números jugados en el último sorteo con apuestas
  const lastWithApuestas = (state.sorteos || [])
    .filter((s) => (s.apuestas && s.apuestas.length > 0) || (s.apuestasFijas && s.apuestasFijas.length > 0))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const dashJugados = utils.$('#dashUltimosJugados');
  if (dashJugados) {
    if (!lastWithApuestas) {
      dashJugados.innerHTML = '<div class="muted">No hay apuestas registradas aún.</div>';
    } else {
      let html = '';
      if (lastWithApuestas.apuestasFijas && lastWithApuestas.apuestasFijas.length > 0) {
        html += '<div class="item-sub">Fijas:</div>';
        html += lastWithApuestas.apuestasFijas.map((ap, idx) => `<div class="item">#${idx + 1}: ${ap.numeros.join(', ')} | Estrellas: ${ap.estrellas.join(', ')}</div>`).join('');
      }
      if (lastWithApuestas.apuestas && lastWithApuestas.apuestas.length > 0) {
        html += '<div class="item-sub">Normales:</div>';
        html += lastWithApuestas.apuestas.map((ap, idx) => `<div class="item">#${idx + 1}: ${ap.numeros.join(', ')} | Estrellas: ${ap.estrellas.join(', ')}</div>`).join('');
      }
      dashJugados.innerHTML = html;
    }
  }

  const dashResults = utils.$('#dashUltimosResultados');
  if (dashResults) {
    if (!recent || recent.length === 0) {
      dashResults.innerHTML = '<div class="muted">No hay resultados registrados aún.</div>';
    } else {
      dashResults.innerHTML = recent
        .map(
          (r) => `<div class="item"><div class="item-top"><div><div class="item-title">${r.fecha} — ${utils.cap(r.dia)}</div><div class="item-sub">Ganadores: ${r.resultados.totalWinners} · Repartido: ${utils.euro(r.resultados.totalDistributed)}</div></div></div></div>`
        )
        .join('');
    }
  }
}

/* ---------------- PARTICIPANTES ---------------- */
function renderParticipantes() {
  const search = utils.clampStr(utils.$('#pSearch').value).toLowerCase();
  const filter = utils.$('#pFilter').value;

  const rows = state.participantes
    .filter((p) => {
      const okSearch = !search || (p.nombre || '').toLowerCase().includes(search);
      const okFilter =
        filter === 'todos' ||
        (filter === 'activos' && p.activo) ||
        (filter === 'inactivos' && !p.activo);
      return okSearch && okFilter;
    })
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));

  const tbody = utils.$('#pTbody');
  tbody.innerHTML = '';

  rows.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
            <td>${utils.escapeHtml(p.nombre)}</td>
            <td><span class="badge">${p.preferencia || 'ambos'}</span></td>
            <td>${p.activo ? '<span class="badge ok">Sí</span>' : '<span class="badge no">No</span>'}</td>
            <td>${utils.escapeHtml(p.notas || '')}</td>
            <td class="right"></td>
        `;
    const tdAcc = tr.querySelector('.right');
    tdAcc.append(
      ui.mkBtn('Editar', 'btn-ghost', () => openParticipanteForm(p.id)),
      ui.mkBtn('Borrar', 'btn-danger', () => deleteParticipante(p.id))
    );
    tbody.appendChild(tr);
  });
}

function openParticipanteForm(id = null) {
  const editing = id ? logic.getParticipante(state, id) : null;
  const body = `
        <div class="row">
            <div class="grow">
                <label class="label">Nombre</label>
                <input class="input" id="mpNombre" value="${editing ? utils.escapeHtml(editing.nombre) : ''}">
            </div>
            <div class="grow">
                <label class="label">Preferencia</label>
                <select class="select" id="mpPref">
                    <option value="ambos">Martes y viernes</option>
                    <option value="martes">Solo martes</option>
                    <option value="viernes">Solo viernes</option>
                </select>
            </div>
        </div>
    `;
  const btnSave = ui.mkBtn('Guardar', 'btn-primary', () => {
    const nombre = utils.clampStr(utils.$('#mpNombre').value);
    if (!nombre) {
      ui.showAlert('Nombre requerido');
      return;
    }
    if (editing) {
      editing.nombre = nombre;
      editing.preferencia = utils.$('#mpPref').value;
    } else {
      state.participantes.push({
        id: utils.uid(),
        nombre,
        preferencia: utils.$('#mpPref').value,
        activo: true,
      });
    }
    utils.saveState(state);
    ui.modal.close();
    renderParticipantes();
  });
  ui.modal.open(editing ? 'Editar' : 'Nuevo', body, [
    ui.mkBtn('Cancelar', 'btn-ghost', ui.modal.close),
    btnSave,
  ]);
  if (editing) utils.$('#mpPref').value = editing.preferencia;
}

// Eliminar participante (manejo seguro y limpieza de referencias)
function deleteParticipante(id) {
  ui.showConfirm(
    '¿Seguro que quieres borrar este participante? Esta acción no es reversible.'
  ).then((ok) => {
    if (!ok) return;

    // 1) Borramos del listado de participantes
    state.participantes = state.participantes.filter((p) => p.id !== id);

    // 2) Borramos entradas de pagos asociadas
    Object.keys(state.pagos).forEach((month) => {
      if (state.pagos[month] && state.pagos[month].entries && state.pagos[month].entries[id]) {
        delete state.pagos[month].entries[id];
      }
    });

    // 3) Quitamos al participante de cualquier sorteo y recalculamos totales
    state.sorteos.forEach((s) => {
      s.jugadores = (s.jugadores || []).filter((pid) => pid !== id);
      s.totalEuros = (s.jugadores ? s.jugadores.length : 0) * (state.config.costeApuesta || 2.5);
    });

    // 4) Guardamos y refrescamos UI
    utils.saveState(state);
    renderParticipantes();
    renderPagos();
    renderSorteos();
    renderDashboard();
  });
}

/* ---------------- PAGOS ---------------- */
function renderPagos() {
  const monthInput = utils.$('#payMonth');
  if (!monthInput.value) monthInput.value = utils.toISOMonth(new Date());

  const month = monthInput.value;
  logic.ensurePayMonth(state, month);

  // Advertencia si no hay entradas (posible estado inicial)
  if (!state.pagos[month] || !state.pagos[month].entries) {
    console.warn(`renderPagos: no hay entradas para el mes ${month}`);
  }

  // Inicializamos el importe mensual para este mes si existe
  const payImporteInput = utils.$('#payImporteMensual');
  if (payImporteInput) {
    if (state.pagos[month] && state.pagos[month].importeMensual !== undefined) {
      payImporteInput.value = state.pagos[month].importeMensual;
    } else {
      payImporteInput.value = state.config.mensualSugerido;
    }
    payImporteInput.onchange = (e) => {
      logic.ensurePayMonth(state, month);
      state.pagos[month].importeMensual = parseFloat(e.target.value) || 0;
      utils.saveState(state);
    };
  } else {
    console.warn('renderPagos: #payImporteMensual not found in DOM');
  }

  const tbody = utils.$('#payTbody');
  tbody.innerHTML = '';

  // Mostrar tabla de pagos por participante
  state.participantes
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .forEach((p) => {
      const entry = state.pagos[month].entries[p.id];
      try {
        // Cantidad pagada este mes (editable)
        let cantidadPagada = entry && typeof entry.cantidad === 'number' ? entry.cantidad : 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
                <td>${utils.escapeHtml(p.nombre)}</td>
                <td>${p.activo ? 'Sí' : 'No'}</td>
                <td><select class="select sel-pagado"><option value="true" ${entry && entry.pagado ? 'selected' : ''}>Sí</option><option value="false" ${!entry || !entry.pagado ? 'selected' : ''}>No</option></select></td>
                <td><input type="date" class="input inp-fecha" value="${entry ? entry.fechaPago || '' : ''}"></td>
                <td><input type="text" class="input inp-medio" placeholder="Bizum..." value="${entry ? entry.medio || '' : ''}"></td>
                <td><input type="text" class="input inp-notas" value="${entry ? entry.notas || '' : ''}"></td>
                <td><input type="number" class="input inp-cantidad" min="0" step="0.01" value="${cantidadPagada}" style="max-width:90px;"></td>
            `;

        // Eventos en línea para ahorrar código
        const sel = tr.querySelector('.sel-pagado');
        if (sel)
          sel.onchange = (e) => {
            if (entry) {
              entry.pagado = e.target.value === 'true';
              utils.saveState(state);
            }
          };
        const inpFecha = tr.querySelector('.inp-fecha');
        if (inpFecha)
          inpFecha.onchange = (e) => {
            if (entry) {
              entry.fechaPago = e.target.value;
              utils.saveState(state);
            }
          };
        const inpMedio = tr.querySelector('.inp-medio');
        if (inpMedio)
          inpMedio.oninput = (e) => {
            if (entry) {
              entry.medio = e.target.value;
              utils.saveState(state);
            }
          };
        const inpNotas = tr.querySelector('.inp-notas');
        if (inpNotas)
          inpNotas.oninput = (e) => {
            if (entry) {
              entry.notas = e.target.value;
              utils.saveState(state);
            }
          };
        const inpCantidad = tr.querySelector('.inp-cantidad');
        if (inpCantidad)
          inpCantidad.onchange = (e) => {
            if (entry) {
              entry.cantidad = parseFloat(e.target.value) || 0;
              utils.saveState(state);
              renderPagos(); // Refrescar saldo total
            }
          };

        tbody.appendChild(tr);
      } catch (err) {
        console.error('renderPagos row error', err, p);
      }
    });

  // Usar la nueva función de contabilidad centralizada
  const accounting = logic.calculateAccounting(state);

  // Mostrar resumen de movimientos en una tarjeta (card) más visual
  const resumenDiv = utils.$('#payResumenMovimientos');
  if (resumenDiv) {
    resumenDiv.innerHTML = `
      <div class="card" style="margin-top: 20px;">
        <div class="card-header"><h3>Resumen de Contabilidad</h3></div>
        <div class="card-body">
          <div class="kpi-grid">
            <div class="kpi-item">
              <div class="kpi-value" style="color:var(--accent2);">${utils.euro(accounting.totalIncome)}</div>
              <div class="kpi-label">Ingresos Totales</div>
            </div>
            <div class="kpi-item">
              <div class="kpi-value" style="color:var(--danger);">${utils.euro(accounting.totalExpenses)}</div>
              <div class="kpi-label">Gastos en Apuestas</div>
            </div>
            <div class="kpi-item">
              <div class="kpi-value" style="color:var(--accent);">${utils.euro(accounting.totalPrizes)}</div>
              <div class="kpi-label">Premios Recibidos</div>
            </div>
            <div class="kpi-item">
              <div class="kpi-value">${utils.euro(accounting.balance)}</div>
              <div class="kpi-label">Saldo en Cuenta</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
/* ---------------- SORTEOS ---------------- */
function renderSorteos() {
  // Configurar fechas por defecto si están vacías
  if (!utils.$('#drawDate').value) utils.$('#drawDate').value = utils.toISODate(new Date());
  if (!utils.$('#drawPayMonth').value)
    utils.$('#drawPayMonth').value = utils.toISOMonth(new Date());

  const list = utils.$('#drawList');
  list.innerHTML = '';

  // Ordenar sorteos por fecha (recientes primero)
  const sorteosSorted = [...state.sorteos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  sorteosSorted.forEach((s) => {
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
            <div class="item-top">
                <div>
                    <div class="item-title">${s.fecha} — ${utils.cap(s.dia)}</div>
                    <div class="item-sub">Total: ${utils.euro(s.totalEuros)} | Jugadores: ${s.jugadores.length} | Apuestas: ${(s.apuestas ? s.apuestas.length : 0) + (s.apuestasFijas ? s.apuestasFijas.length : 0)} ${s.resultados ? `| Ganadores: ${s.resultados.totalWinners} · Repartido: ${utils.euro(s.resultados.totalDistributed)}` : ''}</div>
                </div>
                <div class="item-actions"></div>
            </div>
        `;

    const actions = item.querySelector('.item-actions');

    // Botón Ver/Editar Apuestas
    const btnEdit = ui.mkBtn('Apuestas/Detalle', 'btn-primary', () => {
      if (typeof openDrawDetail === 'function') {
        openDrawDetail(s.id);
      } else {
        alert('No se pudo abrir el detalle del sorteo.');
      }
    });

    // Botón Borrar
    const btnDel = ui.mkBtn('Borrar', 'btn-danger', () => {
      ui.showConfirm('¿Seguro que quieres eliminar este sorteo?').then((ok) => {
        if (!ok) return;
        state.sorteos = state.sorteos.filter((x) => x.id !== s.id);
        utils.saveState(state);
        renderSorteos();
      });
    });

    actions.append(btnEdit, btnDel);
    list.appendChild(item);
  });
}

function openDrawDetail(drawId) {
  const s = state.sorteos.find((x) => x.id === drawId);
  if (!s) return;

  const apuestasFijas = s.apuestasFijas || [];
  const apuestasNormales = s.apuestas || [];

  // Si no hay apuestas, mostrar mensaje y permitir añadir
  let apuestasHtml = '';
  if (apuestasFijas.length === 0 && apuestasNormales.length === 0) {
    apuestasHtml = `<div class="muted">No hay apuestas registradas para este sorteo.<br>Puedes añadirlas usando los botones de abajo.</div>`;
  } else {
    if (apuestasFijas.length > 0) {
      apuestasHtml += '<div class="item-sub">Fijas:</div>';
      apuestasHtml += apuestasFijas.map((ap, idx) => `<div class="item">#${idx + 1}: ${ap.numeros.join(', ')} | Estrellas: ${ap.estrellas.join(', ')} <button class="btn-danger-sm ap-remove" data-sid="${s.id}" data-apid="${ap.id}">✕</button></div>`).join('');
    }
    if (apuestasNormales.length > 0) {
      apuestasHtml += '<div class="item-sub">Normales:</div>';
      apuestasHtml += apuestasNormales.map((ap, idx) => `<div class="item">#${idx + 1}: ${ap.numeros.join(', ')} | Estrellas: ${ap.estrellas.join(', ')} <button class="btn-danger-sm ap-remove" data-sid="${s.id}" data-apid="${ap.id}">✕</button></div>`).join('');
    }
  }

  const bodyHtml = `
    <div class="row">
        <div class="grow stack">
            <h4>Apuestas</h4>
            <div id="mdApuestasList">${apuestasHtml}</div>
            <hr>
            <h4>Añadir Apuesta</h4>
            <div class="row">
                <div class="grow">
                    <label class="label">Números (5)</label>
                    <input class="input" id="newApNums" placeholder="2, 10, 25, 40, 48">
                </div>
                <div>
                    <label class="label">Estrellas (2)</label>
                    <input class="input" id="newApEsts" placeholder="5, 9" style="width:100px;">
                </div>
                <button class="btn btn-primary" id="btnAddAp">Añadir</button>
            </div>
        </div>
        <div class="divider"></div>
        <div class="grow stack">
            <h4>Resultados y Premio</h4>
            <div class="row">
                <div class="grow">
                    <label class="label">N. Ganadores</label>
                    <input class="input" id="mdWinN" placeholder="Ej: 2, 15, 20, 33, 48" value="${s.resultados ? s.resultados.winNums.join(', ') : ''}">
                </div>
                <div style="width:120px">
                    <label class="label">Estrellas</label>
                    <input class="input" id="mdWinE" placeholder="Ej: 5, 9" value="${s.resultados ? s.resultados.winStars.join(', ') : ''}">
                </div>
            </div>
            <div class="row">
                <div class="grow">
                    <label class="label">Premio Total (€)</label>
                    <input type="number" min="0" step="0.01" class="input" id="mdPremio" value="${s.premio || 0}">
                </div>
                <div class="grow">
                    <label class="label">Nota (opcional)</label>
                    <input class="input" id="mdNota" value="${utils.escapeHtml(s.nota || '')}">
                </div>
            </div>
            <div class="row">
              <button class="btn btn-primary" id="btnRegistrarResultados">Registrar Resultados</button>
              <button class="btn btn-ghost" id="btnProcesarPegado">Pegar y Procesar</button>
            </div>
            <textarea id="mdPasteResults" class="input" rows="3" placeholder="Pega aquí los resultados de Euromillones para auto-rellenar."></textarea>
            <div id="mdResultadosSummary" class="item-sub" style="margin-top:10px;">${s.resultados ? `Ganadores: ${s.resultados.totalWinners} · Total repartido: ${utils.euro(s.resultados.totalDistributed)}` : ''}</div>
        </div>
    </div>
  `;

  // Attach handlers for removing apuestas inside the modal (no globals)
  // We'll add the listeners after opening the modal to ensure nodes exist
  const attachRemoveApuestaHandlers = () => {
    ui.modal.body.querySelectorAll('.ap-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.sid;
        const apid = btn.dataset.apid;
        const sorteo = state.sorteos.find((x) => x.id === sid);
        if (!sorteo) return;
        sorteo.apuestas = sorteo.apuestas.filter((a) => a.id !== apid);
        utils.saveState(state);
        openDrawDetail(sid); // Refrescar modal
      });
    });
  };

  // Añadir clase compacta solo para el modal de sorteo
  ui.modal.el.classList.add('sorteo-compact');
  ui.modal.open(`Detalle Sorteo: ${s.fecha}`, bodyHtml, [
    ui.mkBtn('Cerrar y Guardar', 'btn-primary', () => {
      s.premio = parseFloat(utils.$('#mdPremio').value) || 0;
      s.nota = utils.$('#mdNota').value;
      utils.saveState(state);
      ui.modal.close();
      renderSorteos();
    }),
  ]);

  // Attach handlers for remove buttons inside modal
  attachRemoveApuestaHandlers();

  // Al cerrar el modal, quitar la clase compacta para no afectar otros diálogos
  const originalClose = ui.modal.close;
  ui.modal.close = function() {
    ui.modal.el.classList.remove('sorteo-compact');
    originalClose.call(ui.modal);
    // Restaurar el método para otros usos
    ui.modal.close = originalClose;
  };

  // Registrar resultados: parsear inputs y calcular resumen
  const btnRegistrar = utils.$('#btnRegistrarResultados');
  if (btnRegistrar) {
    btnRegistrar.onclick = () => {
      const rawN = utils.$('#mdWinN').value || '';
      const rawE = utils.$('#mdWinE').value || '';
      const premio = parseFloat(utils.$('#mdPremio').value) || 0;

      const wn = rawN.split(',').map((x) => parseInt(x.trim())).filter((x) => !isNaN(x));
      const we = rawE.split(',').map((x) => parseInt(x.trim())).filter((x) => !isNaN(x));

      if (wn.length < 5) {
        ui.showAlert('Introduce al menos 5 números ganadores');
        return;
      }

      const resumen = logic.computeResultsForDraw(state, s, wn, we, premio);
      if (!resumen) return ui.showAlert('Error al calcular resultados');

      // Guardamos resumen en el sorteo
      s.resultados = resumen;
      s.premio = premio;
      utils.saveState(state);

      // Actualizamos la sección de resumen dentro del modal
      const mdSum = utils.$('#mdResultadosSummary');
      if (mdSum) {
        mdSum.innerHTML = `<div class="item-sub">Ganadores: ${resumen.totalWinners} · Total repartido: ${utils.euro(resumen.totalDistributed)}</div>`;
      }

      ui.showAlert(`Resultados registrados. Ganadores: ${resumen.totalWinners}`);
      renderSorteos();
      renderDashboard();
    };
  }

  // Procesar pegado manual
  const btnProcesar = utils.$('#btnProcesarPegado');
  if (btnProcesar) {
    btnProcesar.onclick = () => {
      const raw = utils.$('#mdPasteResults').value || '';
      const parsed = utils.parseResultsFromText(raw);
      if (!parsed) return ui.showAlert('No se han podido extraer números de ese contenido. Asegúrate de pegar el bloque de resultados.');
      utils.$('#mdWinN').value = parsed.winNums.join(',');
      utils.$('#mdWinE').value = parsed.winStars.join(',');
      if (parsed.prize) utils.$('#mdPremio').value = parsed.prize;
      const mdStatus = utils.$('#mdResultadosSummary');
      if (mdStatus) mdStatus.textContent = 'Resultados procesados. Revísalos y pulsa Registrar.';
    };
  }

  // Evento añadir apuesta
  const btnAddAp = utils.$('#btnAddAp');
  if (btnAddAp) {
    btnAddAp.onclick = () => {
      const nRaw = utils.$('#newApNums').value.split(',').map((n) => parseInt(n.trim())).filter((n) => !isNaN(n));
      const eRaw = utils.$('#newApEsts').value.split(',').map((n) => parseInt(n.trim())).filter((n) => !isNaN(n));
      if (nRaw.length < 5) {
        ui.showAlert('Faltan números');
        return;
      }
      if (eRaw.length < 2) {
        ui.showAlert('Faltan estrellas');
        return;
      }
      s.apuestas.push({ id: utils.uid(), numeros: nRaw, estrellas: eRaw });
      utils.saveState(state);
      openDrawDetail(s.id); // Refresca la vista del modal
    };
  }
}

/* ---------------- ACCIÓN: CREAR SORTEO ---------------- */
utils.$('#btnCreateDraw').onclick = () => {
  // 1. Capturar valores
  const fecha = utils.$('#drawDate').value;
  const dia = utils.$('#drawDay').value; // "martes" o "viernes"
  const payMonth = utils.$('#drawPayMonth').value; // "2024-05" (ejemplo)
  const notaTicket = utils.$('#drawTicketNote').value;

  // 2. Validación de seguridad
  if (!payMonth || !fecha) {
    ui.showAlert('Por favor, selecciona la Fecha del sorteo y el Mes de pago.');
    return;
  }

  // 3. Calcular elegibles (Llamada a la lógica corregida)
  const elegibles = logic.computeEligibleIds(state, dia, payMonth);

  if (elegibles.length === 0) {
    ui.showAlert(
      `No hay jugadores aptos. Revisa que:\n1. En la pestaña PAGOS, el mes ${payMonth} tenga el 'Sí' marcado.\n2. Los participantes tengan preferencia '${dia}' o 'ambos'.`
    );
    return;
  }

  // 4. Añadir apuestas fijas automáticamente
  const apuestasFijas = (state.config.apuestasFijas || []).map((ap) => ({
    id: 'fija-' + utils.uid(),
    numeros: ap.nums.slice(),
    estrellas: ap.ests.slice(),
    esFija: true
  }));

  const nuevoSorteo = {
    id: utils.uid(),
    fecha,
    dia,
    payMonth,
    jugadores: elegibles,
    totalEuros: elegibles.length * (state.config.costeApuesta || 2.5),
    apuestas: [],
    apuestasFijas, // <-- añadimos aquí
    premio: 0,
    nota: notaTicket,
  };

  // 5. Guardar y refrescar
  state.sorteos.push(nuevoSorteo);
  utils.saveState(state);
  ui.showAlert(`¡Éxito! Sorteo creado con ${elegibles.length} jugadores.`);

  // Si tienes una función para limpiar el formulario, úsala aquí
  utils.$('#drawTicketNote').value = '';

  renderSorteos();
};
/* ---------------- AJUSTES ---------------- */
function renderAjustes() {
  // 1. Cargar valores de configuración
  utils.$('#cfgCosteApuesta').value = state.config.costeApuesta;
  utils.$('#cfgMensualSugerido').value = state.config.mensualSugerido;
  utils.$('#cfgNextDrawWeeks').value = state.config.nextDrawWeeks || 8;
  utils.$('#cfgDayMartes').checked = !!(
    state.config.nextDrawDays && state.config.nextDrawDays.martes
  );
  utils.$('#cfgDayViernes').checked = !!(
    state.config.nextDrawDays && state.config.nextDrawDays.viernes
  );
  // Proxy settings
  utils.$('#cfgProxyUrl').value = (state.config.proxy && state.config.proxy.url) || '';
  utils.$('#cfgProxyKey').value = (state.config.proxy && state.config.proxy.key) || '';

  // 2. Dibujar lista de apuestas fijas
  const container = utils.$('#listaApuestasFijas');
  if (!state.config.apuestasFijas) state.config.apuestasFijas = [];

  container.innerHTML = state.config.apuestasFijas
    .map(
      (ap, idx) => `
        <div class="row" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border: 1px solid var(--line)">
            <div class="grow">
                <strong>Apuesta ${idx + 1}:</strong> 
                <span style="color:var(--accent)">${ap.nums.join(', ')}</span> 
                <span style="color:var(--muted)">|</span> 
                <span style="color:var(--warn)">★ ${ap.ests.join(', ')}</span>
            </div>
            <button class="btn-danger-sm fija-remove" data-idx="${idx}">✕</button>
        </div>
    `
    )
    .join('');

  // Attach event listeners to 'eliminar apuesta fija' buttons
  container.querySelectorAll('.fija-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      if (isNaN(idx)) return;
      state.config.apuestasFijas.splice(idx, 1);
      utils.saveState(state);
      renderAjustes();
    });
  });
}

// Botón Añadir Apuesta Fija
utils.$('#btnAddFija').onclick = () => {
  const n = utils
    .$('#inFijaNums')
    .value.split(',')
    .map((x) => parseInt(x.trim()))
    .filter((x) => !isNaN(x));
  const e = utils
    .$('#inFijaEsts')
    .value.split(',')
    .map((x) => parseInt(x.trim()))
    .filter((x) => !isNaN(x));

  if (n.length === 5 && e.length === 2) {
    state.config.apuestasFijas.push({ nums: n, ests: e });
    utils.saveState(state);
    utils.$('#inFijaNums').value = '';
    utils.$('#inFijaEsts').value = '';
    renderAjustes();
  } else {
    ui.showAlert('Introduce 5 números y 2 estrellas separados por comas.');
  }
};

/* ---------------- GESTIÓN DE PESTAÑAS Y EVENTOS ---------------- */
function setTab(tabName) {
  utils.$$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName));
  utils.$$('.panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tabName}`));

  if (tabName === 'dashboard') renderDashboard();
  if (tabName === 'participantes') renderParticipantes();
  if (tabName === 'pagos') renderPagos();
  if (tabName === 'sorteos') renderSorteos();
  if (tabName === 'ajustes') renderAjustes();
  if (tabName === 'resultados') renderResultados();
}

// Inicialización de Eventos de la UI (Sustituye a los antiguos onclick)
utils.$$('.tab').forEach((btn) => {
  btn.onclick = () => setTab(btn.dataset.tab);
});

utils.$('#btnAddParticipante').onclick = () => openParticipanteForm();
utils.$('#payMonth').onchange = () => renderPagos();
utils.$('#modalClose').onclick = () => ui.modal.close();

// Previsualizar elegibles en la pantalla de SORTEOS
utils.$('#btnPreviewEligible').onclick = () => {
  const dia = utils.$('#drawDay').value;
  const payMonth = utils.$('#drawPayMonth').value || utils.toISOMonth(new Date());
  const ids = logic.computeEligibleIds(state, dia, payMonth);

  utils.$('#drawEligibleCount').textContent = ids.length;
  utils.$('#drawTotalEuros').textContent = utils.euro(
    ids.length * (state.config.costeApuesta || 2.5)
  );

  const list = utils.$('#eligiblePreview');
  list.innerHTML = '';
  ids.forEach((id) => {
    const p = logic.getParticipante(state, id);
    if (p) {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = p.nombre;
      list.appendChild(chip);
    }
  });
};

// Crear sorteo rápido desde DASHBOARD con jugadores calculados
utils.$('#btnCrearSorteoDesdeDashboard').onclick = () => {
  const dia = utils.$('#dashDiaSorteo').value;
  const payMonth = utils.$('#dashPayMonth').value;
  const fecha = utils.$('#dashFechaSorteo').value || utils.toISODate(new Date());

  if (!payMonth) {
    ui.showAlert('Selecciona el mes de pago en el Dashboard.');
    return;
  }

  const ids = logic.computeEligibleIds(state, dia, payMonth);
  if (ids.length === 0) {
    ui.showAlert('No hay jugadores aptos para crear el sorteo desde el Dashboard.');
    return;
  }

  const nuevoSorteo = {
    id: utils.uid(),
    fecha,
    dia,
    payMonth,
    jugadores: ids,
    totalEuros: ids.length * (state.config.costeApuesta || 2.5),
    apuestas: [],
    premio: 0,
    nota: 'Creado desde Dashboard',
  };

  state.sorteos.push(nuevoSorteo);
  utils.saveState(state);
  ui.showAlert(`¡Éxito! Sorteo creado con ${ids.length} jugadores desde Dashboard.`);
  renderSorteos();
  // Navegamos a la pestaña de sorteos y abrimos el detalle del nuevo sorteo para revisión
  setTab('sorteos');
  // Abrir detalle si la función está disponible
  if (typeof openDrawDetail === 'function') openDrawDetail(nuevoSorteo.id);
  renderDashboard();
};

// Navegar a la pestaña de SORTEOS
utils.$('#btnIrSorteo').onclick = () => setTab('sorteos');

// Exportar CSV de elegibles desde Dashboard
utils.$('#btnExportCsv').onclick = () => {
  const dia = utils.$('#dashDiaSorteo').value;
  const payMonth = utils.$('#dashPayMonth').value;
  if (!payMonth) {
    ui.showAlert('Selecciona el mes de pago en el Dashboard para exportar.');
    return;
  }

  const ids = logic.computeEligibleIds(state, dia, payMonth);
  const rows = ids.map((id) => {
    const p = logic.getParticipante(state, id);
    const nombre = p && p.nombre ? p.nombre.replace(/"/g, '""') : '';
    return `"${id}","${nombre}"`;
  });

  const csv = ['id,nombre', ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `elegibles_${payMonth}.csv`;
  a.click();
};

utils.$('#btnSaveCfg').onclick = () => {
  state.config.costeApuesta = parseFloat(utils.$('#cfgCosteApuesta').value);
  state.config.mensualSugerido = parseFloat(utils.$('#cfgMensualSugerido').value);
  state.config.nextDrawWeeks = parseInt(utils.$('#cfgNextDrawWeeks').value, 10) || 0;
  state.config.nextDrawDays = {
    martes: !!utils.$('#cfgDayMartes').checked,
    viernes: !!utils.$('#cfgDayViernes').checked,
  };
  // Proxy settings
  state.config.proxy = {
    url: utils.clampStr(utils.$('#cfgProxyUrl').value) || null,
    key: utils.clampStr(utils.$('#cfgProxyKey').value) || null,
  };
  utils.saveState(state);
  ui.showAlert('Ajustes guardados');
};

// Carga Inicial
setTab('dashboard');

/* ---------------- RESULTADOS (COMPROBADOR) ---------------- */
function renderResultados() {
  const container = utils.$('#tab-resultados');
  // Obtener lista de sorteos ordenados por fecha descendente
  const sorteos = (state.sorteos || []).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const fechaOptions = sorteos.map(s => `<option value="${s.id}">${s.fecha} — ${utils.cap(s.dia)}</option>`).join('');
  const selectedSorteoId = sorteos.length > 0 ? sorteos[0].id : '';
  const s = sorteos.find(x => x.id === selectedSorteoId) || null;

  container.innerHTML = `
    <div class="card">
      <div class="card-header"><h2>Comprobador de Aciertos</h2></div>
      <div class="card-body">
        <div class="row" style="gap:8px;align-items:flex-end;">
          <div class="grow">
            <label class="label">Sorteo</label>
            <select class="select" id="selSorteoResultados">${fechaOptions}</select>
          </div>
          <div class="grow">
            <label class="label">Números ganadores</label>
            <input class="input" id="winN" placeholder="Ej: 2, 15, 20, 33, 48">
          </div>
          <div style="width:120px">
            <label class="label">Estrellas</label>
            <input class="input" id="winE" placeholder="Ej: 5, 9">
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-primary" id="btnComparar">Comprobar</button>
            <button class="btn btn-ghost" id="btnBuscarResultadosWeb" title="Obtener resultados de ese sorteo">Buscar en TuLotero</button>
          </div>
        </div>
        <div id="resFetchStatus" style="margin-top:8px; color:var(--muted); font-size:0.9em"></div>
        <div id="apuestasResultados" style="margin-top:18px;"></div>
        <div id="visualizarResultados" style="margin-top: 25px;"></div>
      </div>
    </div>
  `;

  // Función para renderizar apuestas del sorteo seleccionado
  function renderApuestasResultados(sorteo) {
    const cont = utils.$('#apuestasResultados');
    if (!sorteo) {
      cont.innerHTML = '<div class="muted">Selecciona un sorteo para ver las apuestas jugadas.</div>';
      return;
    }
    let html = '';
    if (sorteo.apuestasFijas && sorteo.apuestasFijas.length > 0) {
      html += '<div class="item-sub">Apuestas Fijas:</div>';
      html += sorteo.apuestasFijas.map((ap, idx) => `<div class="item">#${idx + 1}: ${ap.numeros.join(', ')} | Estrellas: ${ap.estrellas.join(', ')}</div>`).join('');
    }
    if (sorteo.apuestas && sorteo.apuestas.length > 0) {
      html += '<div class="item-sub">Apuestas Normales:</div>';
      html += sorteo.apuestas.map((ap, idx) => `<div class="item">#${idx + 1}: ${ap.numeros.join(', ')} | Estrellas: ${ap.estrellas.join(', ')}</div>`).join('');
    }
    if (!html) html = '<div class="muted">No hay apuestas registradas para este sorteo.</div>';
    cont.innerHTML = html;
  }

  // Inicializar con el sorteo más reciente
  renderApuestasResultados(s);

  // Cambiar sorteo seleccionado
  utils.$('#selSorteoResultados').onchange = (e) => {
    const selId = e.target.value;
    const sorteo = sorteos.find(x => x.id === selId);
    renderApuestasResultados(sorteo);
    // Limpiar campos de resultado y comparación
    utils.$('#winN').value = '';
    utils.$('#winE').value = '';
    utils.$('#visualizarResultados').innerHTML = '';
    utils.$('#resFetchStatus').textContent = '';
  };
  // Buscar resultados en TuLotero/proxy para la fecha del sorteo seleccionado
  const btnBuscar = utils.$('#btnBuscarResultadosWeb');
  const resStatus = utils.$('#resFetchStatus');
  if (btnBuscar) {
    btnBuscar.onclick = async () => {
      if (resStatus) resStatus.textContent = '';
      const selId = utils.$('#selSorteoResultados').value;
      const sorteo = sorteos.find(x => x.id === selId);
      if (!sorteo) return;
      const fecha = sorteo.fecha;

      const proxyKey = state.config && state.config.proxy && state.config.proxy.key;
      
      // La URL del proxy ya no se lee de la configuración, es siempre relativa.
      const proxyUrl = '/fetch';

      if (resStatus) resStatus.textContent = 'Intentando obtener resultados desde el proxy...';

      try {
        const params = [];
        if (proxyKey) params.push(`key=${encodeURIComponent(proxyKey)}`);
        if (fecha) params.push(`fecha=${encodeURIComponent(fecha)}`);
        const url = proxyUrl + (params.length > 0 ? '?' + params.join('&') : '');
        const res = await fetch(url, { headers: proxyKey ? { 'x-api-key': proxyKey } : {} });
        if (!res.ok) {
            throw new Error(`El proxy devolvió un error: ${res.status} ${res.statusText}`);
        }

        const text = await res.text();
        try {
          const json = JSON.parse(text);
          if (json && json.winNums && json.winStars) {
            utils.$('#winN').value = json.winNums.join(',');
            utils.$('#winE').value = json.winStars.join(',');
            if (resStatus) resStatus.textContent = 'Resultados obtenidos desde el proxy.';
          } else {
            if (resStatus) resStatus.textContent = 'El proxy no devolvió resultados válidos.';
          }
        } catch(e) {
          console.error("JSON parsing error:", e, "\nResponse text:", text);
          if (resStatus) resStatus.textContent = `Error al interpretar la respuesta del proxy: ${e.message}. Revisa la consola para más detalles.`;
        }

      } catch (err) {
        if (resStatus) resStatus.textContent = `Error al contactar el proxy: ${err.message}. Revisa la URL y la conexión.`;
        console.error(err);
      }
    };
  }

  utils.$('#btnComparar').onclick = () => {
    const selId = utils.$('#selSorteoResultados').value;
    const sorteo = sorteos.find(x => x.id === selId);
    const wn = utils.$('#winN').value.split(',').map(Number);
    const we = utils.$('#winE').value.split(',').map(Number);
    const resultDiv = utils.$('#visualizarResultados');

    if (wn.length < 5) {
      ui.showAlert('Introduce al menos los 5 números ganadores');
      return;
    }
    if (!sorteo || ((!sorteo.apuestasFijas || sorteo.apuestasFijas.length === 0) && (!sorteo.apuestas || sorteo.apuestas.length === 0))) {
      return ui.showAlert('No hay apuestas registradas para este sorteo.');
    }

    let html = "<h3>Resultados:</h3><div class='stack'>";
    if (sorteo.apuestasFijas && sorteo.apuestasFijas.length > 0) {
      sorteo.apuestasFijas.forEach((ap, idx) => {
        const numAciertos = ap.numeros.filter((n) => wn.includes(n));
        const estAciertos = ap.estrellas.filter((e) => we.includes(e));
        const gano = numAciertos.length >= 2 || (numAciertos.length >= 1 && estAciertos.length >= 2);
        html += `
          <div class="item" style="border-left: 5px solid ${gano ? 'var(--accent2)' : 'var(--line)'}">
            <div class="item-top">
              <div class="item-title">Fija #${idx + 1}</div>
              <div>${gano ? '<span class="badge ok">CON PREMIO</span>' : '<span class="badge no">Sin premio</span>'}</div>
            </div>
            <div class="item-sub">
              Números acertados: <strong>${numAciertos.length}</strong> (${numAciertos.join(', ') || 'ninguno'})<br>
              Estrellas acertadas: <strong>${estAciertos.length}</strong> (${estAciertos.join(', ') || 'ninguna'})
            </div>
          </div>
        `;
      });
    }
    if (sorteo.apuestas && sorteo.apuestas.length > 0) {
      sorteo.apuestas.forEach((ap, idx) => {
        const numAciertos = ap.numeros.filter((n) => wn.includes(n));
        const estAciertos = ap.estrellas.filter((e) => we.includes(e));
        const gano = numAciertos.length >= 2 || (numAciertos.length >= 1 && estAciertos.length >= 2);
        html += `
          <div class="item" style="border-left: 5px solid ${gano ? 'var(--accent2)' : 'var(--line)'}">
            <div class="item-top">
              <div class="item-title">Normal #${idx + 1}</div>
              <div>${gano ? '<span class="badge ok">CON PREMIO</span>' : '<span class="badge no">Sin premio</span>'}</div>
            </div>
            <div class="item-sub">
              Números acertados: <strong>${numAciertos.length}</strong> (${numAciertos.join(', ') || 'ninguno'})<br>
              Estrellas acertadas: <strong>${estAciertos.length}</strong> (${estAciertos.join(', ') || 'ninguna'})
            </div>
          </div>
        `;
      });
    }
    html += '</div>';
    resultDiv.innerHTML = html;
  };
}
/* ---------------- UTILIDADES DE DATOS (RESET, IMP, EXP) ---------------- */

// BOTÓN RESET
utils.$('#btnResetAll').onclick = () => {
  ui.showConfirm(
    '¿ESTÁS SEGURO? Se borrarán todos los participantes, pagos y sorteos de forma permanente.'
  ).then((ok) => {
    if (!ok) return;
    localStorage.removeItem(utils.STORAGE_KEY);
    ui.showAlert('Datos borrados. La página se recargará.');
    window.location.reload();
  });
};

// BOTÓN EXPORTAR JSON
utils.$('#btnExportJson').onclick = () => {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `copia_peña_${utils.toISODate(new Date())}.json`;
  a.click();
};

// BOTÓN IMPORTAR JSON
utils.$('#btnImportJson').onclick = () => {
  utils.$('#fileImport').click();
};

utils.$('#fileImport').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      const valid =
        imported &&
        typeof imported === 'object' &&
        imported.config &&
        typeof imported.config === 'object' &&
        Array.isArray(imported.participantes) &&
        imported.pagos &&
        typeof imported.pagos === 'object' &&
        Array.isArray(imported.sorteos);

      if (valid) {
        imported.meta = imported.meta || {
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state = imported;
        utils.saveState(state);
        ui.showAlert('Datos importados con éxito');
        window.location.reload();
      } else {
        ui.showAlert(
          'El archivo no parece un respaldo válido. Comprueba que contiene config, participantes, pagos y sorteos.'
        );
      }
    } catch (err) {
      console.error(err);
      ui.showAlert('Error al leer el archivo.');
    }
  };
  reader.readAsText(file);
};
utils.$('#btnMarkAllPaid').onclick = () => massUpdatePayments(true);
utils.$('#btnMarkAllUnpaid').onclick = () => massUpdatePayments(false);

function massUpdatePayments(status) {
  const month = utils.$('#payMonth').value;
  if (!month) return;

  logic.ensurePayMonth(state, month);

  // Actualizamos a todos los participantes activos
  state.participantes.forEach((p) => {
    if (p.activo) {
      state.pagos[month].entries[p.id].pagado = status;
      if (status && !state.pagos[month].entries[p.id].fechaPago) {
        state.pagos[month].entries[p.id].fechaPago = utils.toISODate(new Date());
      }
    }
  });

  utils.saveState(state);
  renderPagos(); // Refrescar la tabla para ver los cambios
}

});
