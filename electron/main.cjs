// Proceso principal de la app de escritorio.
// Reglas de confidencialidad: la app no se conecta a internet y su sesión vive
// solo en memoria, así que la app no guarda en disco nada de lo cargado.
const { app, BrowserWindow, Menu, dialog, net, protocol, session } = require('electron');
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
  "worker-src 'self'",
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
  // Solo se guarda lo que genera la app (el Excel), y Windows pregunta dónde
  sesion.on('will-download', (evento, item) => {
    if (!item.getURL().startsWith('blob:') || !item.getFilename().endsWith('.xlsx')) {
      evento.preventDefault();
      return;
    }
    item.setSaveDialogOptions({
      title: 'Guardar Excel',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
  });
}

let ventana = null;

async function crearVentana() {
  const sesion = session.fromPartition(PARTICION);
  servirApp(sesion);
  await bloquearInternet(sesion);

  ventana = new BrowserWindow({
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
  // La página avisa que hay datos cargados; acá se pregunta antes de cerrar
  ventana.webContents.on('will-prevent-unload', (evento) => {
    const eleccion = dialog.showMessageBoxSync(ventana, {
      type: 'warning',
      noLink: true,
      buttons: ['Cerrar y perder los datos', 'Seguir trabajando'],
      defaultId: 1,
      cancelId: 1,
      title: 'Estadísticas médicas',
      message: 'Hay datos cargados. Si cerrás la app, se pierden.',
    });
    if (eleccion === 0) evento.preventDefault();
  });
  ventana.webContents.on('render-process-gone', () => ventana.reload());
  ventana.loadURL(`${ORIGEN}/index.html`);
}

// Evita que otro programa lea por depuración los datos cargados
const depuracion = ['remote-debugging-port', 'remote-debugging-pipe'];
if (app.isPackaged && depuracion.some((s) => app.commandLine.hasSwitch(s))) app.exit(1);

Menu.setApplicationMenu(null);
app.on('window-all-closed', () => app.quit());

// Una sola ventana: si se abre otra vez, se trae al frente la que ya está abierta
if (app.requestSingleInstanceLock()) {
  app.on('second-instance', () => {
    if (!ventana) return;
    if (ventana.isMinimized()) ventana.restore();
    ventana.focus();
  });
  app.whenReady().then(crearVentana);
} else {
  app.quit();
}
