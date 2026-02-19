const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const CACHE_TTL = 60 * 60; // 1 hour
const TULOTERO_URL = 'https://www.tulotero.es/euromillones/resultados';

// Enable CORS for all origins and methods
app.use(cors());
app.options('*', cors());

const cache = new NodeCache({ stdTTL: CACHE_TTL });

function parseHtmlForResults(html, fecha = null) {
  const $ = cheerio.load(html);
  const sorteos = [];

  // Find each result block
  $('app-game-draw-result').each((i, element) => {
    const sorteo = {};

    // Extract the date from the specific element
    const fechaText = $(element).find('h3.font-bold.text-lg.text-primary.uppercase').text().trim();
    sorteo.fecha = fechaText;

    // Extract the main numbers
    const numeros = [];
    $(element).find('.number-box .number').each((j, num) => {
      numeros.push($(num).text().trim());
    });
    sorteo.numeros = numeros;

    // Extract the stars
    const estrellas = [];
    $(element).find('.star-box .number').each((j, star) => {
      estrellas.push($(star).text().trim());
    });
    sorteo.estrellas = estrellas;

    sorteos.push(sorteo);
  });

  // If a specific date is requested, find it
  if (fecha) {
    return sorteos.find(sorteo => sorteo.fecha === fecha);
  }

  // Otherwise, return the latest result found
  return sorteos.length > 0 ? sorteos[0] : null;
}


app.get('/resultados', async (req, res) => {
  const { fecha } = req.query;
  const cacheKey = fecha || 'latest';

  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const { data: html } = await axios.get(TULOTERO_URL);
    const result = parseHtmlForResults(html, fecha);

    if (result) {
      cache.set(cacheKey, result);
      res.json(result);
    } else {
      res.status(404).json({ error: 'Resultados no encontrados.' });
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error al obtener los datos.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
