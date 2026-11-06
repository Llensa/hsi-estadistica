import { tieneCobertura } from './anexo';
import { leerFechas, normalizarGenero, rangoEdad } from './calculos';
import { esVacio, indexarFila, normClave, texto, valor } from './columnas';
import type { Rango, ReporteProfesional } from './types';

/**
 * Resumen Mensual de Consultorio Externo (formulario 2.1).
 * Versión corta de la planilla: una fila por servicio, edad y sexo, total y obra social.
 */

export const GRUPOS_RMCE = [
  '< 1 año',
  '1 a 4',
  '5 a 9',
  '10 a 14',
  '15 a 19',
  '20 a 49',
  '50 a 64',
  '> 65',
] as const;

export type GrupoRmce = (typeof GRUPOS_RMCE)[number];

/** El formulario junta los rangos '1' y '2 a 4' en '1 a 4' */
const GRUPO_DE_RANGO: Record<Rango, GrupoRmce> = {
  '-1': '< 1 año',
  '1': '1 a 4',
  '2 a 4': '1 a 4',
  '5 a 9': '5 a 9',
  '10 a 14': '10 a 14',
  '15 a 19': '15 a 19',
  '20 a 49': '20 a 49',
  '50 a 64': '50 a 64',
  '65 y más': '> 65',
};

export interface FilaRmce {
  servicio: string;
  /** Varones por grupo de edad (Varón cis) */
  V: number[];
  /** Mujeres por grupo de edad (Mujer cis) */
  M: number[];
  /** Todas las atenciones, incluidas las de género sin especificar */
  total: number;
  osSi: number;
  osNo: number;
}

/** Campos del formulario que no vienen en el Excel de HSI */
export interface DatosRmce {
  localidad: string;
  dependencia: string;
  region: string;
  hoja: string;
}

export const DATOS_RMCE_VACIOS: DatosRmce = { localidad: '', dependencia: '', region: '', hoja: '' };

export interface Rmce {
  establecimiento: string;
  doc: string;
  meses: string;
  anio: string;
  nuevos: number;
  repetidos: number;
  varones: number;
  mujeres: number;
  /** Atenciones que entran en TOTAL pero no en EDAD Y SEXO */
  sinEspecificar: number;
  servicios: FilaRmce[];
  totales: FilaRmce;
}

const filaVacia = (servicio: string): FilaRmce => ({
  servicio,
  V: GRUPOS_RMCE.map(() => 0),
  M: GRUPOS_RMCE.map(() => 0),
  total: 0,
  osSi: 0,
  osNo: 0,
});

/** 'Guidolin, Ana' -> 'GUIDOLIN' (el formulario lleva el apellido) */
export const apellidoDoc = (profesional: string): string =>
  profesional.split(',')[0].trim().toUpperCase();

const unicos = (valores: string[]) => [...new Set(valores.filter(Boolean))];

export function calcularRmce(reportes: ReporteProfesional[], doc?: string): Rmce {
  const porServicio = new Map<string, FilaRmce>();
  let sinEspecificar = 0;

  for (const r of reportes) {
    for (const fila of r.filas) {
      if (Object.values(fila).every(esVacio)) continue;
      const celdas = indexarFila(fila);
      const fechas = leerFechas(celdas);
      if ('motivo' in fechas) continue; // las descartadas tampoco cuentan en la planilla

      const servicio = (texto(valor(celdas, 'especialidad')) || r.especialidad || 'Sin servicio').toUpperCase();
      const clave = normClave(servicio);
      const f = porServicio.get(clave) ?? filaVacia(servicio);
      porServicio.set(clave, f);

      const grupo = GRUPOS_RMCE.indexOf(GRUPO_DE_RANGO[rangoEdad(fechas.edad)]);
      const genero = normalizarGenero(valor(celdas, 'genero'));
      if (genero === 'M') f.V[grupo]++;
      else if (genero === 'F') f.M[grupo]++;
      else sinEspecificar++;

      f.total++;
      if (tieneCobertura(valor(celdas, 'obraSocial'))) f.osSi++;
      else f.osNo++;
    }
  }

  const servicios = [...porServicio.values()].sort((a, b) => a.servicio.localeCompare(b.servicio));
  const totales = filaVacia('13. TOTALES');
  for (const s of servicios) {
    s.V.forEach((v, i) => (totales.V[i] += v));
    s.M.forEach((v, i) => (totales.M[i] += v));
    totales.total += s.total;
    totales.osSi += s.osSi;
    totales.osNo += s.osNo;
  }

  const periodos = unicos(reportes.flatMap((r) => r.periodos)).sort();
  const suma = (k: 'N' | 'R') => reportes.reduce((a, r) => a + r.matriz.reduce((b, d) => b + d[k], 0), 0);

  return {
    establecimiento: unicos(reportes.map((r) => r.establecimiento)).join(', '),
    doc: doc ?? (reportes.length === 1 ? apellidoDoc(reportes[0].profesional) : 'TODOS'),
    meses: unicos(periodos.map((p) => String(Number(p.slice(5))))).join(', '),
    anio: unicos(periodos.map((p) => p.slice(0, 4))).join(', '),
    nuevos: suma('N'),
    repetidos: suma('R'),
    varones: totales.V.reduce((a, v) => a + v, 0),
    mujeres: totales.M.reduce((a, v) => a + v, 0),
    sinEspecificar,
    servicios,
    totales,
  };
}

type Celda = string | number;
const COLUMNAS = 20;
const vacio = (n: number) => (n === 0 ? '' : n);
const conLetra = (letra: string, n: number) => (n ? `${letra} ${n}` : letra);

/** Celdas combinadas del encabezado, iguales al formulario original */
export const MERGES_RMCE = [
  'B1:C2', 'D1:Q2', 'R2:T2', 'B3:M3', 'N3:O3', 'S3:T3', 'B4:I4', 'J4:O4', 'P4:Q4', 'A5:A7',
  'B5:Q5', 'R5:R7', 'S5:T6', 'B6:C6', 'D6:E6', 'F6:G6', 'H6:I6', 'J6:K6', 'L6:M6', 'N6:O6', 'P6:Q6',
];

export const ANCHOS_RMCE = [21, ...Array(16).fill(7), 11.5, 8.4, 8.4];

function filaDatos(f: FilaRmce, conCeros: boolean): Celda[] {
  const edad = f.V.flatMap((v, i) => [v, f.M[i]]).map((n) => (conCeros ? n : vacio(n)));
  return [f.servicio, ...edad, f.total, f.osSi, f.osNo];
}

/** Filas del formulario, columna por columna como el original (A a T) */
export function filasRmce(rmce: Rmce, datos: DatosRmce = DATOS_RMCE_VACIOS): Celda[][] {
  const fila = () => Array<Celda>(COLUMNAS).fill('');

  const f1 = fila();
  f1[1] = '2,1';
  f1[3] = 'Resumen Mensual de Consultorio Externo';
  f1[17] = `1. Hoja N° ${datos.hoja}`.trim();
  f1[18] = `N ${rmce.nuevos}`;
  f1[19] = `R ${rmce.repetidos}`;

  const f3 = fila();
  f3[0] = rmce.establecimiento;
  f3[1] = `DOC.: ${rmce.doc}`;
  f3[13] = `3. MES ${rmce.meses}`;
  f3[17] = `4. AÑO ${rmce.anio}`;

  const f4 = fila();
  f4[0] = datos.localidad;
  f4[9] = '6. DEPENDENCIA ADMINISTRATIVA';
  f4[15] = datos.dependencia;
  f4[17] = `7. REGIÓN SANITARIA ${datos.region}`.trim();
  f4[18] = conLetra('V', rmce.varones);
  f4[19] = conLetra('M', rmce.mujeres);

  const f5 = fila();
  f5[0] = '8. SERVICIO';
  f5[1] = '10. EDAD Y SEXO';
  f5[17] = '11. TOTAL';
  f5[18] = '12. OBRA SOCIAL';

  const f6 = fila();
  GRUPOS_RMCE.forEach((g, i) => (f6[1 + i * 2] = g));

  const f7 = fila();
  GRUPOS_RMCE.forEach((_, i) => {
    f7[1 + i * 2] = 'V';
    f7[2 + i * 2] = 'M';
  });
  f7[18] = 'SI';
  f7[19] = 'NO';

  return [
    f1,
    fila(),
    f3,
    f4,
    f5,
    f6,
    f7,
    ...rmce.servicios.map((s) => filaDatos(s, false)),
    filaDatos(rmce.totales, true),
  ];
}

/** Explicación de cada apartado, para poner debajo del formulario */
export function referenciasRmce(rmce: Rmce): string[] {
  const lineas = [
    'Resumen Mensual de Consultorio Externo (formulario 2.1): versión corta de la planilla diaria.',
    'N: pacientes nuevos (primera atención del DNI en el archivo del profesional). R: atenciones repetidas del mismo paciente.',
    'DOC.: apellido del profesional. 3. MES y 4. AÑO: período de las atenciones.',
    'V y M (fila 4): total de varones (Varón cis) y de mujeres (Mujer cis).',
    '8. SERVICIO: especialidad de la atención. Hay una fila por servicio.',
    '10. EDAD Y SEXO: atenciones por edad cumplida el día de la atención. V = varón, M = mujer. "1 a 4" junta 1 año y 2 a 4 años.',
    '11. TOTAL: todas las atenciones del servicio (N + R).',
    '12. OBRA SOCIAL: SI = tiene obra social o prepaga informada; NO = sin cobertura o vacío.',
    '13. TOTALES: suma de todos los servicios.',
    'Localidad, 6. DEPENDENCIA ADMINISTRATIVA, 7. REGIÓN SANITARIA y 1. Hoja N° no vienen en HSI: se completan en la app o a mano.',
  ];
  if (rmce.sinEspecificar > 0) {
    lineas.push(
      `${rmce.sinEspecificar} ${rmce.sinEspecificar === 1 ? 'atención tiene' : 'atenciones tienen'} género sin especificar: cuentan en 11. TOTAL pero no en 10. EDAD Y SEXO.`
    );
  }
  return lineas;
}
