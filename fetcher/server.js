const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const NodeCache = require('node-cache');
const cors = require('cors');
const path = require('path');
const { timingSafeEqual } = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const PROXY_KEY = process.env.PROXY_KEY;

const CACHE_TTL = 60 * 60; // 1 hour
const TULOTERO_URL = 'https://www.tulotero.es/euromillones/resultados';

app.use(cors());
app.options('*', cors());

// Servir ficheros estáticos desde el directorio raíz del proyecto
app.use(express.static(path.join(__dirname, '..')));

// La ruta raíz ahora servirá index.html gracias a express.static
// Mantenemos esta ruta de API por si se accede directamente a /health
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const cache = new NodeCache({ stdTTL: CACHE_TTL });
let resultsPromise = null;

async function fetchResultsWithPuppeteer() {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(TULOTERO_URL, { waitUntil: 'networkidle0' });

    await page.waitForSelector('app-game-draw-result');

    const sorteos = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('app-game-draw-result').forEach(element => {
        const sorteo = {};
        const fechaText = element.querySelector('h3.font-bold.text-lg.text-primary.uppercase')?.innerText.trim();
        if (fechaText) {
            sorteo.fecha = fechaText;

            const numeros = [];
            element.querySelectorAll('.number-box .number').forEach(num => {
            numeros.push(num.innerText.trim());
            });
            sorteo.numeros = numeros;

            const estrellas = [];
            element.querySelectorAll('.star-box .number').forEach(star => {
            estrellas.push(star.innerText.trim());
            });
            sorteo.estrellas = estrellas;

            results.push(sorteo);
        }
      });
      return results;
    });

    return sorteos;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

app.get('/resultados', async (req, res) => {
  const { fecha } = req.query;
  if (fecha !== undefined && (typeof fecha !== 'string' || fecha.length > 100)) {
    return res.status(400).json({ error: 'Fecha inválida.' });
  }

  if (PROXY_KEY) {
    const suppliedKey = req.get('x-api-key') || req.query.key;
    const expected = Buffer.from(PROXY_KEY);
    if (typeof suppliedKey !== 'string' ||
        Buffer.byteLength(suppliedKey) !== expected.length ||
        !timingSafeEqual(Buffer.from(suppliedKey), expected)) {
      return res.status(401).json({ error: 'No autorizado.' });
    }
  }

  try {
    let results = cache.get('all-results');
    if (!results) {
      if (cache.get('fetch-failed')) {
        return res.status(503).json({ error: 'Resultados temporalmente no disponibles.' });
      }
      if (!resultsPromise) {
        resultsPromise = fetchResultsWithPuppeteer()
          .then(data => {
            if (data.length) cache.set('all-results', data);
            else cache.set('fetch-failed', true, 60);
            return data;
          })
          .catch(error => { cache.set('fetch-failed', true, 60); throw error; })
          .finally(() => { resultsPromise = null; });
      }
      results = await resultsPromise;
    }

    const result = fecha ? results.find(sorteo => sorteo.fecha === fecha) : results[0];
    if (result) return res.json(result);
    return res.status(404).json({ error: 'Resultados no encontrados con Puppeteer.' });
  } catch (error) {
    console.error('Error fetching data with Puppeteer:', error);
    return res.status(500).json({ error: 'Error al obtener los datos con Puppeteer.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
