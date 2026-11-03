// Proceso principal de la app de escritorio.
// Reglas de confidencialidad: la app no se conecta a internet y su sesión vive
// solo en memoria, así que al cerrarla no queda nada de lo cargado.
const { app, BrowserWindow, Menu, net, protocol, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ESQUEMA = 'app';
const RAIZ = path.join(__dirname, '..', 'dist', 'volcado-hsi', 'browser');
// Sin "persist:" al inicio, Electron guarda esta sesión solo en memoria.
const PARTICION = 'volcado-hsi';

protocol.registerSchemesAsPrivileged([
  { scheme: ESQUEMA, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function servirApp(sesion) {
  sesion.protocol.handle(ESQUEMA, (solicitud) => {
    const relativa = decodeURIComponent(new URL(solicitud.url).pathname).replace(/^\/+/, '');
    const archivo = path.resolve(RAIZ, relativa || 'index.html');
    if (archivo !== RAIZ && !archivo.startsWith(RAIZ + path.sep)) {
      return new Response('No permitido', { status: 403 });
    }
    return net.fetch(pathToFileURL(archivo).toString());
  });
}

function bloquearInternet(sesion) {
  sesion.webRequest.onBeforeRequest((detalles, responder) => {
    const { protocol: origen } = new URL(detalles.url);
    responder({ cancel: ![`${ESQUEMA}:`, 'blob:', 'data:'].includes(origen) });
  });
  sesion.setPermissionRequestHandler((_contenido, _permiso, responder) => responder(false));
}

function crearVentana() {
  const sesion = session.fromPartition(PARTICION);
  servirApp(sesion);
  bloquearInternet(sesion);

  const ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Estadísticas médicas',
    autoHideMenuBar: true,
    webPreferences: {
      session: sesion,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });

  ventana.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  ventana.webContents.on('will-navigate', (evento, destino) => {
    if (!destino.startsWith(`${ESQUEMA}://`)) evento.preventDefault();
  });
  ventana.loadURL(`${ESQUEMA}://local/index.html`);
}

Menu.setApplicationMenu(null);
app.whenReady().then(crearVentana);
app.on('window-all-closed', () => app.quit());
