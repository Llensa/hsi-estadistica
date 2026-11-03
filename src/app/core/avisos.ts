import { formatearPeriodo } from './calculos';
import type { FilaDescartada, ReporteProfesional } from './types';

export interface Aviso {
  texto: string;
  /** Detalle opcional (por ejemplo, las filas descartadas) */
  detalle?: FilaDescartada[];
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Avisos de calidad de datos de un archivo */
export function avisosDeReporte(r: ReporteProfesional): Aviso[] {
  const avisos: Aviso[] = r.avisosColumnas.map((texto) => ({ texto }));

  const generos = Object.entries(r.generosSinEspecificar);
  const sinGenero = generos.reduce((a, [, n]) => a + n, 0);
  if (sinGenero > 0) {
    const detalle = generos
      .map(([valor, n]) => `${valor ? `"${valor}"` : 'vacío'} (${n})`)
      .join(', ');
    avisos.push({
      texto: `${plural(sinGenero, 'atención quedó', 'atenciones quedaron')} en 'Sin Especificar' por el género autopercibido: ${detalle}.`,
    });
  }

  if (r.periodos.length > 1) {
    avisos.push({
      texto: `El archivo tiene atenciones de varios meses (${r.periodos.map(formatearPeriodo).join(', ')}). Los días de distintos meses se suman en la misma fila.`,
    });
  }

  if (r.sinDocumento > 0) {
    avisos.push({
      texto: `${plural(r.sinDocumento, 'atención no tiene', 'atenciones no tienen')} número de documento: se contaron como Nuevas (N).`,
    });
  }

  if (r.descartadas.length > 0) {
    avisos.push({
      texto: `${plural(r.descartadas.length, 'fila no se contó', 'filas no se contaron')} en la planilla.`,
      detalle: r.descartadas,
    });
  }

  if (r.totalAtenciones === 0) {
    avisos.push({ texto: 'Ninguna atención de este archivo se pudo contar.' });
  }

  return avisos;
}
