/** Una fila del Excel tal como la devuelve SheetJS (clave = encabezado de la columna) */
export type Fila = Record<string, unknown>;

export const RANGOS = [
  '-1',
  '1',
  '2 a 4',
  '5 a 9',
  '10 a 14',
  '15 a 19',
  '20 a 49',
  '50 a 64',
  '65 y más',
] as const;

export type Rango = (typeof RANGOS)[number];
export type Genero = 'M' | 'F' | 'Sin Especificar';
export const GENEROS: readonly Genero[] = ['M', 'F', 'Sin Especificar'];
export type ConteoRangos = Record<Rango, number>;

export interface DiaStats {
  dia: number; // 1-31
  N: number;
  R: number;
  M: ConteoRangos;
  F: ConteoRangos;
  'Sin Especificar': ConteoRangos;
}

/** 31 posiciones: índice 0 = día 1 */
export type MatrizMensual = DiaStats[];

export interface FilaDescartada {
  /** Número de fila en el Excel (1 = primera fila de la hoja) */
  fila: number;
  motivo: string;
}

export interface ResultadoCalculo {
  matriz: MatrizMensual;
  /** Atenciones contadas en la matriz */
  totalAtenciones: number;
  /** Filas que no se pudieron contar, con el motivo */
  descartadas: FilaDescartada[];
  /** Pacientes sin 'Nro documento' (se cuentan como N) */
  sinDocumento: number;
  /** Valores de 'Género autopercibido' que fueron a 'Sin Especificar' y cuántas veces ('' = vacío) */
  generosSinEspecificar: Record<string, number>;
  /** Meses presentes en las fechas de atención, como 'AAAA-MM', ordenados */
  periodos: string[];
}

export interface ReporteProfesional extends ResultadoCalculo {
  id: string;
  /** Igual para todos los profesionales que salieron del mismo archivo */
  archivoId: string;
  nombreArchivo: string;
  /** Cuántos profesionales distintos tenía el archivo (si es más de 1, se separó) */
  profesionalesEnArchivo: number;
  /** Nombre del profesional normalizado, para detectar duplicados */
  claveProfesional: string;
  establecimiento: string;
  especialidad: string;
  profesional: string;
  /** Fila del Excel donde se encontró el encabezado (1 = primera) */
  filaEncabezado: number;
  /** Hoja del Excel que se leyó */
  hoja: string;
  /** Columnas opcionales que no están en el archivo */
  avisosColumnas: string[];
  filas: Fila[];
}

/** Vista activa del panel principal */
export type Vista =
  | { tipo: 'general' }
  | { tipo: 'profesional'; id: string }
  | { tipo: 'anexo' };

/** Paciente con obra social/prepaga, listo para el Anexo II */
export interface PacienteAnexo {
  id: string;
  reporteId: string;
  establecimiento: string;
  especialidad: string;
  profesional: string;
  apellidos: string;
  nombres: string;
  documento: string;
  fechaAtencion: string; // dd/mm/aaaa
  problemaSalud: string;
  obraSocial: string;
  afiliado: string;
}
