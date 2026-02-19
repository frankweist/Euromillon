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
const path = require('path');
const NodeCache = require('node-cache');

const PORT = process.env.PORT || 3003;
const KEY = process.env.PROXY_KEY || '317a50fc-5772-498c-9c4b-fe9acbffed6e';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '600', 10);

const app = express();

// Enable CORS for all origins and methods
app.use(cors());
app.options('*', cors());

const cache = new NodeCache({ stdTTL: CACHE_TTL });

function parseHtmlForResults(html, fecha = null) {
  const $ = cheerio.load(html);
  let jsonText = null;

  $('script').each((i, el) => {
    const txt = $(el).html() || '';
    if (txt.includes('console.log({"resultados":[')) {
      jsonText = txt;
    }
  });

  if (!jsonText) return null;

  const match = jsonText.match(/console\.log\((\{[\s\S]*?\})\);?/);
  if (!match) return null;

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (e) {
    return null;
  }

  if (!data.resultados || !data.resultados.length) return null;

  const normalizeDate = (s) => {
    if (!s) return null;
    s = ('' + s).trim();
    const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
    const m3 = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m3) return `${m3[3]}-${m3[2]}-${m3[1]}`;
    return s;
  };

  let first = null;
  if (fecha) {
    // If a specific date is provided, find that result.
    const target = normalizeDate(fecha);
    first = data.resultados.find((r) => {
      const cand = normalizeDate(r.fecha) || normalizeDate(r.date) || '';
      return cand && cand === target;
    });
  } else {
    // Otherwise, find the latest Euromillones result.
    first = data.resultados.find((r) => r.juego === 'EUROMILLONES') || data.resultados[0];
  }

  if (!first || !first.combinacion || !first.estrella1 || !first.estrella2) return null;

  const winNums = first.combinacion.split(',').map((n) => parseInt(n, 10));
  const winStars = [first.estrella1, first.estrella2].map((n) => parseInt(n, 10));

  if (winNums.length !== 5 || winStars.length !== 2 || winNums.some(isNaN) || winStars.some(isNaN)) return null;

  return { winNums, winStars };
}

// API route. This MUST be defined before the static middleware.
app.get('/fetch', async (req, res) => {
  const key = req.query.key || req.headers['x-api-key'];
  const fecha = req.query.fecha || req.query.date || null;
  const cacheKey = fecha ? `result:${fecha}` : 'latest';
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log('💾 Serving from cache');
    return res.json(cached);
  }

  try {
    console.log('🔄 Fetching from tulotero.es...');
    const r = await axios.get('https://tulotero.es/resultados-euromillones/', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const parsed = parseHtmlForResults(r.data, fecha);
    const out = parsed ? { ...parsed, source: 'tulotero' } : { error: 'not_found' };
    
    if (parsed) {
      cache.set(cacheKey, out);
    }
    res.json(out);

  } catch (err) {
    console.error('💥 Fetch error:', err.message);
    res.status(502).json({ error: 'fetch_failed', details: err.message });
  }
});

// Serve static files from the root directory (one level up from 'fetcher')
// This should be defined AFTER the API routes.
const staticPath = path.join(__dirname, '..');
console.log(`Serving static files from: ${staticPath}`);
app.use(express.static(staticPath));

// Fallback for Single Page Applications (SPA). Send index.html for any other unknown requests.
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 tulotero-proxy listening on http://localhost:${PORT}`);
});