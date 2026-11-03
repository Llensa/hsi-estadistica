import { parseArchivo } from './parse-reporte';

// Lee el Excel fuera de la ventana principal para que la app no se congele
addEventListener('message', async (ev) => {
  try {
    postMessage({ reportes: await parseArchivo((ev as MessageEvent<File>).data) });
  } catch (e) {
    postMessage({ error: (e as Error)?.message ?? 'error al leer' });
  }
});
