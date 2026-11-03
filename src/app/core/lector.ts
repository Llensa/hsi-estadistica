import type { ReporteProfesional } from './types';

/** Corta la lectura de un archivo dañado o malicioso que no termina nunca */
const LIMITE_MS = 120_000;

/** Lee un Excel en segundo plano. Devuelve una planilla por profesional. */
export function leerArchivo(file: File): Promise<ReporteProfesional[]> {
  return new Promise((resolver, rechazar) => {
    const worker = new Worker(new URL('./lector.worker', import.meta.url), { type: 'module' });
    const terminar = (accion: () => void) => {
      clearTimeout(limite);
      worker.terminate();
      accion();
    };
    const limite = setTimeout(
      () => terminar(() => rechazar(new Error('La lectura tardó demasiado y se canceló.'))),
      LIMITE_MS
    );

    worker.onmessage = ({ data }) =>
      terminar(() => (data.error ? rechazar(new Error(data.error)) : resolver(data.reportes)));
    worker.onerror = () =>
      terminar(() => rechazar(new Error('No se pudo leer el archivo. Probá de nuevo.')));
    worker.postMessage(file);
  });
}
