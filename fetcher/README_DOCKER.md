Arrancar el proxy (opción más fácil)

1) Copia el ejemplo de entorno y genera una clave segura:

  - PowerShell (genera GUID):

    $k = [guid]::NewGuid().ToString(); echo $k

  - Node (genera 16 bytes hex):

    node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

  Copia el valor y pégalo en `.env` como `PROXY_KEY=...`.

2) Copia `.env.example` a `.env` y edítalo:

  cp .env.example .env
  (editar .env y reemplazar PROXY_KEY)

3) Construir y arrancar (desde la carpeta `fetcher/`):

  docker compose up -d

  - Esto construye la imagen desde el Dockerfile y publica el puerto 3000.
  - Nota: la imagen se basa en Node 20+ para contar con las Web APIs (File, fetch internals) que usa alguna dependencia. Si por alguna razón necesitas ejecutar el servidor en Node 18, el contenedor ahora incluye un "polyfill" mínimo para `File` que evita el error `ReferenceError: File is not defined`, aunque **se recomienda usar Node 20+** en producción.

4) Probar que funciona (local):

  curl 'http://localhost:3000/fetch?key=MI_CLAVE'
  # o con header
  curl -H "x-api-key: MI_CLAVE" http://localhost:3000/fetch

  Debes recibir JSON con `winNums` y `winStars` o `{ error: 'not_found' }`.

5) Configurar la app (Ajustes → Proxy):

  - Proxy URL: http://<IP-del-host>:3000/fetch
  - Clave del proxy: el valor de `PROXY_KEY`

Ejecutar sin Docker (opción rápida para pruebas)

  # Instala dependencias
  npm ci
  # o si no tienes package-lock.json
  npm install

  # Ejecuta el servidor
  npm run start:local

Notas de despliegue

- Para Portainer/OMV: usa la opción "Use an image" (si ya subes a un registro), o sube el `docker-compose.yml` como stack y deja que construya localmente. Si no quieres que Portainer construya, primero `docker build` y `docker push` a un registro, y en Portainer usa la imagen {usuario}/tulotero-proxy:tag

- Seguridad: si expones el proxy públicamente, usa HTTPS (reverse proxy) y obliga `PROXY_KEY`.
