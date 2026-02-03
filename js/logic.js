export function getParticipante(state, id) {
  return state.participantes.find((p) => p.id === id) || null;
}

export function ensurePayMonth(state, month) {
  if (!month) return;

  // Si el mes no existe, lo creamos
  if (!state.pagos[month]) {
    state.pagos[month] = {
      entries: {},
    };
  }

  // Aseguramos que CADA participante tenga una entrada en ese mes
  state.participantes.forEach((p) => {
    if (!state.pagos[month].entries[p.id]) {
      state.pagos[month].entries[p.id] = {
        pagado: false,
        fechaPago: '',
        medio: '',
        notas: '',
        cantidad: 0,
      };
    }
  });
}

export function isEligibleForDraw(state, participante, day, payMonth) {
  // 1. Si no hay participante o está inactivo, fuera
  if (!participante || !participante.activo) return false;

  // 2. Aseguramos que existan los datos de ese mes
  ensurePayMonth(state, payMonth);

  // 3. Obtenemos la entrada de pago
  const entry = state.pagos[payMonth].entries[participante.id];

  // ERROR CORREGIDO: Forzamos comparación booleana estricta
  if (!entry || entry.pagado !== true) return false;

  // 4. Comprobamos preferencia (limpiando espacios y minúsculas)
  const pref = (participante.preferencia || 'ambos').toLowerCase().trim();
  const diaBuscado = day.toLowerCase().trim();

  if (pref === 'ambos') return true;
  return pref === diaBuscado;
}

export function computeEligibleIds(state, day, payMonth) {
  if (!payMonth || !day) return [];

  // Importante: Asegurar datos antes de filtrar
  ensurePayMonth(state, payMonth);

  return state.participantes
    .filter((p) => isEligibleForDraw(state, p, day, payMonth))
    .map((p) => p.id);
}

/**
 * Calcula el resumen de resultados de un sorteo dado la combinación ganadora.
 * - winNums: array de números ganadores (enteros)
 * - winStars: array de estrellas ganadoras (enteros)
 * - premioTotal: importe total disponible para repartir
 * Retorna un objeto resumen con conteos y detalles mínimos.
 */
export function computeResultsForDraw(state, sorteo, winNums, winStars, premioTotal = 0) {
  if (!sorteo) return null;

  const normalize = (arr) => (Array.isArray(arr) ? arr.map((n) => Number(n)).filter((x) => !isNaN(x)) : []);
  const wn = normalize(winNums);
  const we = normalize(winStars);

  const winners = [];
  let apuestasCount = 0;
  let fijasCount = 0;

  // Evaluar apuestas del sorteo
  (sorteo.apuestas || []).forEach((ap) => {
    const numAciertos = (ap.numeros || []).filter((n) => wn.includes(n)).length;
    const estAciertos = (ap.estrellas || []).filter((e) => we.includes(e)).length;
    const gano = numAciertos >= 2 || (numAciertos >= 1 && estAciertos >= 2);
    if (gano) {
      winners.push({ type: 'apuesta', id: ap.id, numAciertos, estAciertos });
      apuestasCount++;
    }
  });

  // Evaluar apuestas fijas globales
  (state.config.apuestasFijas || []).forEach((ap, idx) => {
    const numAciertos = (ap.nums || []).filter((n) => wn.includes(n)).length;
    const estAciertos = (ap.ests || []).filter((e) => we.includes(e)).length;
    const gano = numAciertos >= 2 || (numAciertos >= 1 && estAciertos >= 2);
    if (gano) {
      winners.push({ type: 'fija', idx, numAciertos, estAciertos });
      fijasCount++;
    }
  });

  const totalWinners = winners.length;
  const totalDistributed = totalWinners > 0 ? Number(premioTotal) : 0;
  const perWinner = totalWinners > 0 ? totalDistributed / totalWinners : 0;

  return {
    fecha: sorteo.fecha,
    dia: sorteo.dia,
    winNums: wn,
    winStars: we,
    totalWinners,
    counts: { apuestas: apuestasCount, fijas: fijasCount },
    totalDistributed,
    perWinner,
    winners,
  };
}
