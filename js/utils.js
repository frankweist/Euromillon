export const STORAGE_KEY = 'pena_euromillones_v1';
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

export function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
export function pad2(n) {
  return String(n).padStart(2, '0');
}
export function toISODate(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}
export function toISOMonth(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`;
}
export function euro(n) {
  return Number(n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}
export function clampStr(s) {
  return (s ?? '').toString().trim();
}
export function escapeHtml(str) {
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
}
export function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const getDefault = () => ({
    meta: { version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    config: {
      costeApuesta: 2.5,
      apuestasFijas: [],
      nextDrawWeeks: 8,
      nextDrawDays: { martes: true, viernes: true },
    },
    participantes: [],
    pagos: {},
    sorteos: [],
  });
  if (!raw) return getDefault();
  const st = JSON.parse(raw);

  // Aseguramos que existan las nuevas propiedades si el usuario ya tenía datos
  st.config = {
    costeApuesta: 2.5,
    apuestasFijas: [],
    nextDrawWeeks: 8,
    nextDrawDays: { martes: true, viernes: true },
    ...st.config,
  };
  // Eliminar campos antiguos de pagos
  if (st.pagos) {
    Object.values(st.pagos).forEach((mes) => {
      if (mes.importeMensual !== undefined) delete mes.importeMensual;
    });
  }
  if (st.config && st.config.mensualSugerido !== undefined) delete st.config.mensualSugerido;
  st.participantes = st.participantes || [];
  st.pagos = st.pagos || {};
  st.sorteos = st.sorteos || [];
  return st;
}

export function saveState(state) {
  state.meta.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Parsea un bloque de texto/HTML buscando la última combinación de Euromillones
 * heurísticamente: busca una corrida de 7 números próxima y devuelve {winNums, winStars, prize}
 */
export function parseResultsFromText(text) {
  if (!text) return null;
  const txt = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // Buscar posible premio (Bote) como heurística
  let prize = null;
  const prizeMatch = text.match(/Bote[^0-9]*([0-9\.,]+)/i);
  if (prizeMatch) {
    prize = prizeMatch[1].replace(/\./g, '').replace(/,/g, '.');
    prize = parseFloat(prize);
  }

  // Extraemos todos los números y sus índices
  const numRegex = /\b(\d{1,2})\b/g;
  let m;
  const matches = [];
  while ((m = numRegex.exec(txt)) !== null) {
    matches.push({ val: parseInt(m[1], 10), idx: m.index });
  }

  // Buscamos corridas de al menos 7 números consecutivos en posición
  const runs = [];
  for (let i = 0; i < matches.length; i++) {
    let run = [matches[i]];
    for (let j = i + 1; j < matches.length && run.length < 20; j++) {
      const gap = matches[j].idx - (matches[j - 1].idx + String(matches[j - 1].val).length);
      if (gap <= 6) {
        run.push(matches[j]);
      } else break;
    }
    if (run.length >= 7) runs.push(run);
  }

  // Elegimos la última corrida relevante si existe, sino la primera
  const chosen = runs.length ? runs[runs.length - 1] : runs[0] || null;
  if (!chosen) return null;

  const numbers = chosen.map((x) => x.val);
  // Tomamos los primeros 5 como números y los últimos 2 como estrellas
  const winNums = numbers.slice(0, 5);
  const winStars = numbers.slice(5, 7);

  return { winNums, winStars, prize };
}