const express = require('express');
const puppeteer = require('puppeteer');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const CACHE_TTL = 60 * 60; // 1 hour
const TULOTERO_URL = 'https://www.tulotero.es/euromillones/resultados';

app.use(cors());
app.options('*', cors());

// Root endpoint to provide a status message
app.get('/', (req, res) => {
  res.status(200).send('Proxy service is running. Use the /resultados endpoint to get Euromillones results.');
});

// Health check endpoint to verify deployment success
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const cache = new NodeCache({ stdTTL: CACHE_TTL });

async function fetchResultsWithPuppeteer(fecha = null) {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      headless: true,
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

    if (fecha) {
      return sorteos.find(sorteo => sorteo.fecha === fecha);
    }

    return sorteos.length > 0 ? sorteos[0] : null;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

app.get('/resultados', async (req, res) => {
  const { fecha } = req.query;
  const cacheKey = fecha || 'latest';

  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`[Cache] HIT for key: ${cacheKey}`);
    return res.json(cachedData);
  }
  console.log(`[Cache] MISS for key: ${cacheKey}`);

  try {
    const result = await fetchResultsWithPuppeteer(fecha);

    if (result) {
      cache.set(cacheKey, result);
      res.json(result);
    } else {
      res.status(404).json({ error: 'Resultados no encontrados con Puppeteer.' });
    }
  } catch (error) {
    console.error('Error fetching data with Puppeteer:', error);
    res.status(500).json({ error: 'Error al obtener los datos con Puppeteer.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
