import { esVacio, indexarFila, normClave, numeroDeFila, texto, valor } from './columnas';
import {
  GENEROS,
  RANGOS,
  type ConteoRangos,
  type Fila,
  type FilaDescartada,
  type Genero,
  type MatrizMensual,
  type Rango,
  type ReporteProfesional,
  type ResultadoCalculo,
} from './types';

export interface YMD {
  y: number;
  m: number;
  d: number;
}

const MS_DIA = 86_400_000;
/** Último serial válido de Excel (31/12/9999). Evita tomar un DNI como fecha. */
const SERIAL_MAXIMO = 2_958_465;

function validar(f: YMD): YMD | null {
  if (f.y < 1900 || f.y > 2200) return null;
  const dt = new Date(Date.UTC(f.y, f.m - 1, f.d));
  const ok =
    dt.getUTCFullYear() === f.y && dt.getUTCMonth() === f.m - 1 && dt.getUTCDate() === f.d;
  return ok ? f : null;
}

/** Año de 2 dígitos: si queda en el futuro, es del siglo anterior */
function anioCompleto(a: string): number {
  const n = Number(a);
  if (a.length === 4) return n;
  const actual = new Date().getFullYear() % 100;
  return n > actual ? 1900 + n : 2000 + n;
}

/**
 * Convierte una celda a fecha. Acepta:
 * - número de serie de Excel (lo que trae un .xls con celdas de fecha)
 * - Date
 * - texto 'dd/mm/aaaa', 'dd-mm-aaaa', 'dd.mm.aa' (con o sin hora)
 * - texto 'aaaa-mm-dd' o 'aaaa/mm/dd' (con o sin hora)
 */
export function parseFecha(v: unknown): YMD | null {
  if (v instanceof Date) {
    return isNaN(v.getTime())
      ? null
      : validar({ y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate() });
  }
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || v <= 60 || v > SERIAL_MAXIMO) return null;
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * MS_DIA);
    return validar({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
  }
  if (typeof v === 'string') {
    const s = v.trim();
    let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})(?!\d)/);
    if (m) return validar({ y: anioCompleto(m[3]), m: Number(m[2]), d: Number(m[1]) });
    m = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?!\d)/);
    if (m) return validar({ y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) });
  }
  return null;
}

export const formatearFecha = (f: YMD): string =>
  `${String(f.d).padStart(2, '0')}/${String(f.m).padStart(2, '0')}/${f.y}`;

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** 'AAAA-MM' -> 'Marzo 2026' */
export function formatearPeriodo(periodo: string): string {
  const [y, m] = periodo.split('-').map(Number);
  return MESES[m - 1] ? `${MESES[m - 1]} ${y}` : periodo;
}

export function calcularEdad(nacimiento: YMD, atencion: YMD): number {
  let edad = atencion.y - nacimiento.y;
  if (atencion.m < nacimiento.m || (atencion.m === nacimiento.m && atencion.d < nacimiento.d)) {
    edad--;
  }
  return edad;
}

export function rangoEdad(edad: number): Rango {
  if (edad < 1) return '-1';
  if (edad === 1) return '1';
  if (edad <= 4) return '2 a 4';
  if (edad <= 9) return '5 a 9';
  if (edad <= 14) return '10 a 14';
  if (edad <= 19) return '15 a 19';
  if (edad <= 49) return '20 a 49';
  if (edad <= 64) return '50 a 64';
  return '65 y más';
}

/** 'Varón cis' -> M, 'Mujer cis' -> F, cualquier otro valor o vacío -> 'Sin Especificar' */
export function normalizarGenero(v: unknown): Genero {
  const s = normClave(texto(v));
  if (s === 'varon cis') return 'M';
  if (s === 'mujer cis') return 'F';
  return 'Sin Especificar';
}

/** Deja el documento comparable: sin puntos, espacios ni guiones */
export const normalizarDni = (v: unknown): string =>
  texto(v)
    .replace(/[.\s-]/g, '')
    .replace(/^0+(?=\d)/, '')
    .toUpperCase();

const conteoVacio = (): ConteoRangos =>
  Object.fromEntries(RANGOS.map((r) => [r, 0])) as ConteoRangos;

export const crearMatriz = (): MatrizMensual =>
  Array.from({ length: 31 }, (_, i) => ({
    dia: i + 1,
    N: 0,
    R: 0,
    M: conteoVacio(),
    F: conteoVacio(),
    'Sin Especificar': conteoVacio(),
  }));

const claveFecha = (f: YMD) => f.y * 10_000 + f.m * 100 + f.d;

/** Valida las fechas de una fila y calcula la edad, o devuelve el motivo del descarte */
export function leerFechas(celdas: Map<string, unknown>): { at: YMD; edad: number } | { motivo: string } {
  const rawAt = valor(celdas, 'atencion');
  const rawNac = valor(celdas, 'nacimiento');
  if (esVacio(rawAt)) return { motivo: 'Falta la fecha de atención' };
  const at = parseFecha(rawAt);
  if (!at) return { motivo: `Fecha de atención no reconocida: "${texto(rawAt)}"` };
  if (esVacio(rawNac)) return { motivo: 'Falta la fecha de nacimiento' };
  const nac = parseFecha(rawNac);
  if (!nac) return { motivo: `Fecha de nacimiento no reconocida: "${texto(rawNac)}"` };

  const edad = calcularEdad(nac, at);
  if (edad < 0) return { motivo: 'La fecha de nacimiento es posterior a la de atención' };
  if (edad > 120) return { motivo: `Edad fuera de rango (${edad} años)` };
  return { at, edad };
}

interface Atencion {
  orden: number;
  at: YMD;
  edad: number;
  genero: Genero;
  dni: string;
}

/**
 * Función pura: filas crudas del Excel -> matriz de 31 días y avisos.
 * @param filaEncabezado fila del Excel donde está el encabezado (para numerar filas descartadas)
 */
export function procesarPacientes(filas: Fila[], filaEncabezado = 4): ResultadoCalculo {
  const matriz = crearMatriz();
  const descartadas: FilaDescartada[] = [];
  const generosSinEspecificar: Record<string, number> = {};
  const periodos = new Set<string>();
  let sinDocumento = 0;

  const atenciones: Atencion[] = [];

  filas.forEach((fila, i) => {
    if (Object.values(fila).every(esVacio)) return; // fila en blanco

    const celdas = indexarFila(fila);
    const fechas = leerFechas(celdas);
    if ('motivo' in fechas) {
      descartadas.push({ fila: numeroDeFila(fila, i, filaEncabezado), motivo: fechas.motivo });
      return;
    }
    const { at, edad } = fechas;

    const rawGenero = valor(celdas, 'genero');
    const genero = normalizarGenero(rawGenero);
    if (genero === 'Sin Especificar') {
      const clave = texto(rawGenero);
      generosSinEspecificar[clave] = (generosSinEspecificar[clave] ?? 0) + 1;
    }

    periodos.add(`${at.y}-${String(at.m).padStart(2, '0')}`);
    atenciones.push({ orden: i, at, edad, genero, dni: normalizarDni(valor(celdas, 'documento')) });
  });

  // Orden cronológico (estable) para que el 'Nuevo' caiga en la primera atención del paciente
  atenciones.sort((a, b) => claveFecha(a.at) - claveFecha(b.at) || a.orden - b.orden);

  const vistos = new Set<string>();
  for (const a of atenciones) {
    const dia = matriz[a.at.d - 1];
    if (!a.dni) {
      dia.N++;
      sinDocumento++;
    } else if (vistos.has(a.dni)) {
      dia.R++;
    } else {
      vistos.add(a.dni);
      dia.N++;
    }
    dia[a.genero][rangoEdad(a.edad)]++;
  }

  return {
    matriz,
    totalAtenciones: atenciones.length,
    descartadas,
    sinDocumento,
    generosSinEspecificar,
    periodos: [...periodos].sort(),
  };
}

/** Atajo: solo la matriz de 31 días */
export const calcularMatriz = (filas: Fila[]): MatrizMensual => procesarPacientes(filas).matriz;

/** Suma celda por celda y día por día las matrices de todos los profesionales */
export function calcularConsolidado(reportesProfesionales: ReporteProfesional[]): MatrizMensual {
  const total = crearMatriz();
  for (const reporte of reportesProfesionales) {
    reporte.matriz.forEach((dia, i) => {
      const t = total[i];
      t.N += dia.N;
      t.R += dia.R;
      for (const g of GENEROS) {
        for (const rango of RANGOS) t[g][rango] += dia[g][rango];
      }
    });
  }
  return total;
}
