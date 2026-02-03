// Ensure a minimal File global exists on older Node versions (Node < 20)
// Some HTTP libraries (undici) expect the Web `File` global to exist and will
// throw `ReferenceError: File is not defined` on older Node runtimes. Provide a
// tiny no-op polyfill so the server can run; recommended to run on Node 20+.
if (typeof File === 'undefined') {
  globalThis.File = class File {};
}

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const NodeCache = require('node-cache');

const PORT = process.env.PORT || 3003;
const KEY = process.env.PROXY_KEY || '317a50fc-5772-498c-9c4b-fe9acbffed6e';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '600', 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));

const cache = new NodeCache({ stdTTL: CACHE_TTL });

function parseHtmlForResults(html, fecha = null) {
  const $ = cheerio.load(html);
  let jsonText = null;

  // Busca el <script> que contiene "console.log({"resultados":[
  $('script').each((i, el) => {
    const txt = $(el).html() || '';
    if (txt.includes('console.log({') && txt.includes('"resultados"')) {
      jsonText = txt;
      console.log('✅ Script encontrado');
    }
  });

  if (!jsonText) {
    console.log('❌ No se encontró el script con resultados');
    return null;
  }

  console.log('📄 Script encontrado, longitud:', jsonText.length);

  // Extrae el objeto pasado a console.log( ... )
  const match = jsonText.match(/console\.log\((\{[\s\S]*?\})\);?/);
  if (!match) {
    console.log('❌ No se pudo hacer match del JSON de resultados');
    return null;
  }

  console.log('✅ Match JSON encontrado');

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (e) {
    console.log('❌ Error parseando JSON de resultados:', e.message);
    return null;
  }

  console.log('✅ JSON parseado correctamente');

  if (!data.resultados || !data.resultados.length) {
    console.log('❌ resultados vacío o sin elementos');
    return null;
  }

  console.log('📊 Encontrados', data.resultados.length, 'resultados');

  // Si se proporciona una fecha, intentamos encontrar el resultado que concuerde con esa fecha
  const normalizeDate = (s) => {
    if (!s) return null;
    s = ('' + s).trim();
    // dd/mm/yyyy
    const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
    // yyyy-mm-dd
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
    // buscar dd/mm/yyyy dentro del texto
    const m3 = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m3) return `${m3[3]}-${m3[2]}-${m3[1]}`;
    return s;
  };

  let first = null;
  if (fecha) {
    const target = normalizeDate(fecha);
    first = data.resultados.find((r) => {
      const cand = normalizeDate(r.fecha) || normalizeDate(r.date) || '';
      return cand && cand === target;
    });
    if (first) console.log('🔎 Resultado encontrado por fecha:', fecha);
    else console.log('⚠️ No se encontró resultado por fecha, aplicando heurística');
  }

  // Fallback: Primer resultado de Euromillones o el primero del array
  if (!first) {
    first = data.resultados.find((r) => r.juego === 'EUROMILLONES') || data.resultados[0];
  }

  if (!first || !first.combinacion || !first.estrella1 || !first.estrella2) {
    console.log('❌ Estructura de resultado inesperada:', first);
    return null;
  }

  const winNums = first.combinacion.split(',').map((n) => parseInt(n, 10));
  const winStars = [first.estrella1, first.estrella2].map((n) => parseInt(n, 10));

  if (winNums.length !== 5 || winStars.length !== 2 || winNums.some(isNaN) || winStars.some(isNaN)) {
    console.log('❌ Números/estrellas no válidos:', winNums, winStars);
    return null;
  }

  console.log('✅ ÉXITO! Números:', winNums, 'Estrellas:', winStars);
  return { winNums, winStars };
}

app.get('/fetch', async (req, res) => {
  const key = req.query.key || req.headers['x-api-key'];
  console.log('🌐 Petición recibida en /fetch');
  console.log('🔑 Key recibida:', key || 'SIN KEY');

  // SIN VALIDACIÓN - siempre pasa
  console.log('✅ Key OK (sin validación)');

  // Soportamos cache por fecha: si se pasa fecha en query, la usamos para la key
  const fecha = req.query.fecha || req.query.date || null;
  const cacheKey = fecha ? `result:${fecha}` : 'latest';
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('💾 Respuesta servida desde cache:', cached);
    return res.json(cached);
  }

  try {
    console.log('🔄 Haciendo petición a tulotero.es...');
    const r = await axios.get('https://tulotero.es/resultados-euromillones/', {
      timeout: 10000,
      headers: { 'User-Agent': 'tulotero-proxy/1.0 (+https://example.com)' },
    });

    console.log('✅ HTML recibido, longitud:', r.data.length);
    console.log('📄 HTML primeros 500 caracteres:', r.data.slice(0, 500));

    const fecha = req.query.fecha || req.query.date || null;
    const parsed = parseHtmlForResults(r.data, fecha);
    console.log('🎯 Resultado del parseo:', parsed);

    const out = parsed ? { ...parsed, source: 'tulotero', matchedFecha: fecha || null } : { error: 'not_found' };
    cache.set(cacheKey, out);
    console.log('💾 Cache guardado:', out);
    res.json(out);
  } catch (err) {
    console.error('💥 fetch error:', err.message);
    res.status(502).json({ error: 'fetch_failed' });
  }
});

// Export para tests
module.exports = { parseHtmlForResults };

// Puerto
app.listen(PORT, () => {
  console.log(`🚀 tulotero-proxy listening on ${PORT}`);
});
