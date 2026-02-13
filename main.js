const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Crea la ventana del navegador.
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // Habilita Node.js en el proceso de renderizado (la ventana)
      // Es importante por seguridad, pero para esta app local es aceptable.
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // y carga el index.html de la aplicación.
  win.loadFile('index.html');

  // Opcional: Abre las herramientas de desarrollo (para depuración)
  // win.webContents.openDevTools();
}

// Este método se llamará cuando Electron haya finalizado
// la inicialización y esté listo para crear ventanas del navegador.
app.whenReady().then(createWindow);

// Sal cuando todas las ventanas se hayan cerrado, excepto en macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // En macOS, es común volver a crear una ventana en la aplicación cuando el
  // icono del dock es presionado y no hay otras ventanas abiertas.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
