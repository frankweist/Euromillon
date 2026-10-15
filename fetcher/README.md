# Proxy de resultados de Euromillones

El servidor Express de `fetcher/server.js` consulta la página de resultados de TuLotero y expone `GET /resultados`.

## Configuración

- `PORT`: puerto HTTP (por defecto, `3000`).
- `PROXY_KEY`: clave compartida opcional. Si está definida, cada petición a `/resultados` debe enviar `x-api-key: <clave>` o `?key=<clave>`. Es preferible la cabecera para evitar que la clave quede en URL y registros.
- Si `PROXY_KEY` no está definida, el endpoint es público. Para un despliegue expuesto a Internet, configura una clave nueva y privada.

El servidor guarda durante una hora la lista obtenida en una consulta y comparte una consulta en curso entre peticiones simultáneas. Si la consulta falla, espera 60 segundos antes de volver a iniciar Chromium.

## Endpoint

`GET /resultados` devuelve el sorteo más reciente. `GET /resultados?fecha=<texto>` busca una coincidencia exacta con la fecha mostrada por TuLotero. La respuesta conserva los campos `fecha`, `numeros` y `estrellas`; los números son cadenas de texto.

`/health` responde `OK` sin autenticación.
