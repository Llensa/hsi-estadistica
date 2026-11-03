import { parseFecha } from './calculos';
import { normClave } from './columnas';
import type { PacienteAnexo } from './types';

export interface TotalObraSocial {
  clave: string;
  obraSocial: string;
  atenciones: number;
  profesionales: number;
}

/** Datos que le faltan a un Anexo II para poder presentarse */
export function faltantesAnexo(p: PacienteAnexo): string[] {
  const faltan: string[] = [];
  if (!p.apellidos && !p.nombres) faltan.push('nombre');
  if (!p.documento) faltan.push('documento');
  if (!parseFecha(p.fechaAtencion)) faltan.push('fecha válida');
  if (!p.afiliado) faltan.push('n° de afiliado');
  return faltan;
}

/** Mes de la atención como 'AAAA-MM', o '' si la fecha no es válida */
export function mesDeAnexo(p: PacienteAnexo): string {
  const f = parseFecha(p.fechaAtencion);
  return f ? `${f.y}-${String(f.m).padStart(2, '0')}` : '';
}

/** Agrupa sin distinguir tildes ni signos: "OSEP" y "O.S.E.P." quedan separados solo si difieren en letras */
export function totalesPorObraSocial(pacientes: PacienteAnexo[]): TotalObraSocial[] {
  const grupos = new Map<string, { obraSocial: string; atenciones: number; ids: Set<string> }>();
  for (const p of pacientes) {
    const clave = normClave(p.obraSocial);
    const g = grupos.get(clave) ?? { obraSocial: p.obraSocial, atenciones: 0, ids: new Set() };
    g.atenciones++;
    g.ids.add(normClave(p.profesional));
    grupos.set(clave, g);
  }
  return [...grupos.entries()]
    .map(([clave, g]) => ({
      clave,
      obraSocial: g.obraSocial,
      atenciones: g.atenciones,
      profesionales: g.ids.size,
    }))
    .sort((a, b) => b.atenciones - a.atenciones || a.obraSocial.localeCompare(b.obraSocial));
}
