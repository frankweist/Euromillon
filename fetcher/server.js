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

  // Busca cada bloque de resultado individual
  $('.game-result').each((i, element) => {
    const sorteo = {};

    // Extrae la fecha del sorteo
    const fechaText = $(element).find('.date').text().trim();
    sorteo.fecha = fechaText;

    // Extrae los números principales
    const numeros = [];
    $(element).find('.number-box .number').each((j, num) => {
      numeros.push($(num).text().trim());
    });
    sorteo.numeros = numeros;

    // Extrae las estrellas
    const estrellas = [];
    $(element).find('.star-box .number').each((j, star) => {
      estrellas.push($(star).text().trim());
    });
    sorteo.estrellas = estrellas;

    sorteos.push(sorteo);
  });

  // Si se pide una fecha concreta, la busca
  if (fecha) {
    return sorteos.find(sorteo => sorteo.fecha === fecha);
  }

  // Si no, devuelve el último resultado encontrado
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
      res.status(404).json({ error: 'Resultados no encontrados para la fecha especificada.' });
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error al obtener los datos.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
