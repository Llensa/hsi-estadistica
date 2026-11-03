import { normClave } from './columnas';
import type { ReporteProfesional } from './types';

/**
 * Filtra planillas por profesional o especialidad. Ignora tildes, mayúsculas y orden:
 * "ana garcia" encuentra a "García, Ana". Todas las palabras tienen que aparecer.
 */
export function filtrarProfesionales(
  reportes: ReporteProfesional[],
  busqueda: string
): ReporteProfesional[] {
  const palabras = normClave(busqueda).split(' ').filter(Boolean);
  if (palabras.length === 0) return reportes;
  return reportes.filter((r) => {
    const donde = normClave(
      `${r.profesional || r.nombreArchivo} ${r.especialidad ?? ''}`
    );
    return palabras.every((p) => donde.includes(p));
  });
}
