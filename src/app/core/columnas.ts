import type { Fila } from './types';

/**
 * Normaliza un encabezado o un valor para compararlo:
 * sin tildes, en minúsculas y sin signos ('N° Documento' -> 'n documento',
 * 'Obra social/Prepaga' -> 'obra social prepaga').
 */
export const normClave = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Nombres aceptados para cada columna, ya normalizados con normClave.
 * Si el Excel de HSI usa otro nombre, agregalo acá.
 */
export const COLUMNAS = {
  atencion: ['fecha de atencion', 'fecha atencion', 'fecha de la atencion'],
  nacimiento: ['fecha de nacimiento', 'fecha nacimiento', 'fecha nac'],
  genero: ['genero autopercibido', 'genero'],
  documento: [
    'nro documento',
    'nro de documento',
    'numero de documento',
    'numero documento',
    'n documento',
    'documento',
    'dni',
  ],
  establecimiento: ['establecimiento', 'institucion', 'efector'],
  especialidad: ['especialidad', 'servicio'],
  profesional: ['profesional', 'medico', 'profesional que atendio'],
  obraSocial: ['obra social prepaga', 'obra social', 'prepaga', 'cobertura', 'financiador'],
  apellidos: ['apellidos', 'apellido'],
  nombres: ['nombres', 'nombre'],
  apellidoYNombre: ['apellido y nombre', 'apellido y nombres', 'apellidos y nombres', 'paciente'],
  problema: ['problemas de salud', 'problema de salud', 'diagnostico', 'diagnosticos'],
  afiliado: [
    'nro afiliado',
    'nro de afiliado',
    'numero de afiliado',
    'numero afiliado',
    'n afiliado',
    'afiliado',
  ],
} as const;

export type Columna = keyof typeof COLUMNAS;

/** Convierte una celda a texto limpio */
export const texto = (v: unknown): string =>
  v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim();

export const esVacio = (v: unknown): boolean => texto(v) === '';

/** Indexa una fila por encabezado normalizado */
export function indexarFila(fila: Fila): Map<string, unknown> {
  const celdas = new Map<string, unknown>();
  for (const [k, v] of Object.entries(fila)) {
    const clave = normClave(k);
    // Si hay dos columnas con el mismo nombre, gana la primera que tenga dato
    if (!celdas.has(clave) || esVacio(celdas.get(clave))) celdas.set(clave, v);
  }
  return celdas;
}

/** Devuelve el primer valor no vacío entre los nombres aceptados de la columna */
export function valor(celdas: Map<string, unknown>, columna: Columna): unknown {
  for (const k of COLUMNAS[columna]) {
    const v = celdas.get(k);
    if (!esVacio(v)) return v;
  }
  return '';
}

/** ¿El encabezado contiene alguna de las variantes de la columna? */
export function tieneColumna(encabezados: Iterable<string>, columna: Columna): boolean {
  const set = new Set(Array.from(encabezados, normClave));
  return COLUMNAS[columna].some((k) => set.has(k));
}

/** Primer valor no vacío de una columna en todas las filas (para los metadatos) */
export function primerValor(filas: Fila[], columna: Columna): string {
  for (const fila of filas) {
    const v = texto(valor(indexarFila(fila), columna));
    if (v) return v;
  }
  return '';
}

/**
 * Número de fila real en el Excel (1 = primera fila).
 * SheetJS guarda la posición en la propiedad oculta __rowNum__ (empieza en 0).
 */
export function numeroDeFila(fila: Fila, indice: number, filaEncabezado: number): number {
  const rowNum = (fila as { __rowNum__?: unknown }).__rowNum__;
  return typeof rowNum === 'number' ? rowNum + 1 : filaEncabezado + 1 + indice;
}
