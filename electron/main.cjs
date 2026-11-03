// Proceso principal de la app de escritorio.
// Reglas de confidencialidad: la app no se conecta a internet y su sesión vive
// solo en memoria, así que la app no guarda en disco nada de lo cargado.
const { app, BrowserWindow, Menu, net, protocol, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ESQUEMA = 'app';
const RAIZ = path.join(__dirname, '..', 'dist', 'volcado-hsi', 'browser');
// Sin "persist:" al inicio, Electron guarda esta sesión solo en memoria.
const PARTICION = 'volcado-hsi';
const ORIGEN = `${ESQUEMA}://local`;
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'",
  "frame-src 'none'",
].join('; ');

// WebRTC usa UDP directo y no pasa por webRequest
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp');

protocol.registerSchemesAsPrivileged([
  { scheme: ESQUEMA, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function servirApp(sesion) {
  sesion.protocol.handle(ESQUEMA, async (solicitud) => {
    const relativa = decodeURIComponent(new URL(solicitud.url).pathname).replace(/^\/+/, '');
    const archivo = path.resolve(RAIZ, relativa || 'index.html');
    if (archivo !== RAIZ && !archivo.startsWith(RAIZ + path.sep)) {
      return new Response('No permitido', { status: 403 });
    }
    const respuesta = await net.fetch(pathToFileURL(archivo).toString());
    const cabeceras = new Headers(respuesta.headers);
    cabeceras.set('Content-Security-Policy', CSP);
    return new Response(respuesta.body, { status: respuesta.status, headers: cabeceras });
  });
}

async function bloquearInternet(sesion) {
  // Segunda capa: todo el tráfico va a un proxy que no existe
  await sesion.setProxy({ proxyRules: 'http://127.0.0.1:9' });
  sesion.webRequest.onBeforeRequest((detalles, responder) => {
    const { protocol: origen } = new URL(detalles.url);
    responder({ cancel: ![`${ESQUEMA}:`, 'blob:', 'data:'].includes(origen) });
  });
  sesion.setPermissionRequestHandler((_contenido, _permiso, responder) => responder(false));
  sesion.setPermissionCheckHandler(() => false);
  sesion.on('will-download', (evento) => evento.preventDefault());
}

async function crearVentana() {
  const sesion = session.fromPartition(PARTICION);
  servirApp(sesion);
  await bloquearInternet(sesion);

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
    if (new URL(destino).origin !== ORIGEN) evento.preventDefault();
  });
  ventana.webContents.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
  ventana.webContents.on('render-process-gone', () => ventana.reload());
  ventana.loadURL(`${ORIGEN}/index.html`);
}

// Evita que otro programa lea por depuración los datos cargados
const depuracion = ['remote-debugging-port', 'remote-debugging-pipe'];
if (app.isPackaged && depuracion.some((s) => app.commandLine.hasSwitch(s))) app.exit(1);

Menu.setApplicationMenu(null);
app.whenReady().then(crearVentana);
app.on('window-all-closed', () => app.quit());
