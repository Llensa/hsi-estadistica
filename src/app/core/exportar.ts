import { extraerPacientesConObraSocial, formatearFechaCelda } from './anexo';
import { calcularConsolidado, formatearPeriodo, leerFechas } from './calculos';
import { esVacio, indexarFila, texto, valor } from './columnas';
import { totalesPorObraSocial } from './resumen';
import { ANCHOS_RMCE, MERGES_RMCE, calcularRmce, filasRmce, referenciasRmce, type DatosRmce } from './rmce';
import { GENEROS, RANGOS, type DiaStats, type MatrizMensual, type ReporteProfesional } from './types';

type XLSXModulo = typeof import('xlsx');
type Celda = string | number;

const ETIQUETA_GENERO = { M: 'M', F: 'F', 'Sin Especificar': 'Sin especificar' } as const;
const HOJAS_FIJAS = ['Resumen', 'Consolidado', 'RMCE Consolidado', 'Obras sociales', 'Atenciones'];

export type FormatoExcel = 'completa' | 'resumida' | 'ambas';

/** Agrega debajo de lo que hay en la hoja una explicación de cada apartado */
function agregarReferencias(XLSX: XLSXModulo, ws: import('xlsx').WorkSheet, lineas: string[]) {
  XLSX.utils.sheet_add_aoa(ws, [[], ['Referencias'], ...lineas.map((l) => [l])], { origin: -1 });
}

const REFERENCIAS_PLANILLA = [
  'Planilla diaria: una fila por cada día del mes (1 a 31). T = total del mes.',
  'N: pacientes nuevos (primera atención del DNI en el archivo del profesional). R: atenciones repetidas del mismo paciente.',
  'M = Varón cis, F = Mujer cis, Sin especificar = otro valor o vacío en "Género autopercibido".',
  'Rangos de edad: años cumplidos el día de la atención. -1 = menor de 1 año; 65 y más = 65 años o más.',
  'TOTAL M, TOTAL F y TOTAL SIN ESPECIFICAR: suma de los rangos de cada género. TOTAL CONSULTAS = N + R.',
  'Solo cuentan las filas con fechas válidas; las descartadas se informan en la hoja Resumen.',
];
const MAX_NOMBRE_HOJA = 31;

const totalGenero = (d: DiaStats, g: (typeof GENEROS)[number]) =>
  RANGOS.reduce((a, r) => a + d[g][r], 0);

const sumar = (filas: Celda[][], col: number) =>
  filas.reduce((a, f) => a + (f[col] as number), 0);

/** Encabezados, 31 días y fila T de una planilla */
export function filasPlanilla(matriz: MatrizMensual): Celda[][] {
  const grupos = GENEROS.flatMap((g) => [ETIQUETA_GENERO[g], ...RANGOS.slice(1).map(() => '')]);
  const encabezado1 = ['Día', 'N', 'R', ...grupos, 'TOTAL M', 'TOTAL F', 'TOTAL SIN ESPECIFICAR', 'TOTAL CONSULTAS'];
  const encabezado2 = ['', '', '', ...GENEROS.flatMap(() => [...RANGOS]), '', '', '', ''];
  const cuerpo: Celda[][] = matriz.map((d) => [
    d.dia,
    d.N,
    d.R,
    ...GENEROS.flatMap((g) => RANGOS.map((r) => d[g][r])),
    ...GENEROS.map((g) => totalGenero(d, g)),
    d.N + d.R,
  ]);
  const totales: Celda[] = ['T', ...encabezado1.slice(1).map((_, i) => sumar(cuerpo, i + 1))];
  return [encabezado1, encabezado2, ...cuerpo, totales];
}

/** Excel limita los nombres de hoja: 31 caracteres, sin : \ / ? * [ ] y sin repetir */
export function nombresDeHojas(nombres: string[], reservados: string[] = HOJAS_FIJAS): string[] {
  const usados = new Set(reservados.map((n) => n.toLowerCase()));
  return nombres.map((nombre) => {
    const base = (nombre.replace(/[:\\/?*[\]]/g, ' ').trim() || 'Planilla').slice(0, MAX_NOMBRE_HOJA);
    let candidato = base;
    for (let i = 2; usados.has(candidato.toLowerCase()); i++) {
      const sufijo = ` (${i})`;
      candidato = base.slice(0, MAX_NOMBRE_HOJA - sufijo.length) + sufijo;
    }
    usados.add(candidato.toLowerCase());
    return candidato;
  });
}

function hojaPlanilla(XLSX: XLSXModulo, titulo: string, matriz: MatrizMensual) {
  const ws = XLSX.utils.aoa_to_sheet([[titulo], ...filasPlanilla(matriz)]);
  agregarReferencias(XLSX, ws, REFERENCIAS_PLANILLA);
  const primera = 3;
  ws['!merges'] = GENEROS.map((_, i) => ({
    s: { r: 1, c: primera + i * RANGOS.length },
    e: { r: 1, c: primera + (i + 1) * RANGOS.length - 1 },
  }));
  return ws;
}

function hojaResumen(XLSX: XLSXModulo, reportes: ReporteProfesional[], advertencias: string[]) {
  const establecimientos = [...new Set(reportes.map((r) => r.establecimiento).filter(Boolean))];
  const periodos = [...new Set(reportes.flatMap((r) => r.periodos))].sort();
  const filas: Celda[][] = [
    ['Estadísticas médicas'],
    ['Establecimiento', establecimientos.join(', ')],
    ['Período', periodos.map(formatearPeriodo).join(', ')],
    ['Planillas', reportes.length],
    ...advertencias.map((a) => ['Advertencia', a]),
    [],
    ['Profesional', 'Especialidad', 'Período', 'Atenciones', 'N', 'R', 'M', 'F', 'Sin especificar', 'Filas descartadas', 'Archivo'],
  ];
  for (const r of reportes) {
    filas.push([
      r.profesional,
      r.especialidad,
      r.periodos.map(formatearPeriodo).join(', '),
      r.totalAtenciones,
      r.matriz.reduce((a, d) => a + d.N, 0),
      r.matriz.reduce((a, d) => a + d.R, 0),
      ...GENEROS.map((g) => r.matriz.reduce((a, d) => a + totalGenero(d, g), 0)),
      r.descartadas.length,
      r.nombreArchivo,
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws['!cols'] = [{ wch: 30 }, { wch: 24 }, { wch: 18 }];
  agregarReferencias(XLSX, ws, [
    'Resumen: datos generales y una fila por cada planilla cargada.',
    'Atenciones: consultas contadas (filas con fecha de atención y de nacimiento válidas).',
    'N: pacientes nuevos (primera atención del DNI en el archivo del profesional). R: atenciones repetidas.',
    'M = Varón cis, F = Mujer cis, Sin especificar = otro valor o vacío en "Género autopercibido".',
    'Filas descartadas: sin fecha válida, con nacimiento posterior a la atención o edad mayor a 120 años.',
    'Advertencia: situaciones que pueden alterar los totales, como meses mezclados o profesionales repetidos.',
    'El resto de las hojas: Consolidado y una hoja por profesional (planilla diaria), RMCE (resumen mensual), Obras sociales y, si se eligió, Atenciones.',
  ]);
  return ws;
}

function hojaObrasSociales(XLSX: XLSXModulo, reportes: ReporteProfesional[]) {
  const totales = totalesPorObraSocial(extraerPacientesConObraSocial(reportes));
  const ws = XLSX.utils.aoa_to_sheet([
    ['Obra social / Prepaga', 'Atenciones', 'Profesionales'],
    ...totales.map((t) => [t.obraSocial, t.atenciones, t.profesionales]),
  ]);
  ws['!cols'] = [{ wch: 30 }];
  agregarReferencias(XLSX, ws, [
    'Atenciones: cantidad de Anexos II (atenciones con obra social o prepaga informada) de cada cobertura.',
    'Profesionales: cuántos profesionales distintos atendieron pacientes de esa cobertura.',
    'Los nombres se agrupan sin distinguir mayúsculas ni tildes.',
  ]);
  return ws;
}

function hojaRmce(XLSX: XLSXModulo, reportes: ReporteProfesional[], datos?: DatosRmce) {
  const rmce = calcularRmce(reportes);
  const ws = XLSX.utils.aoa_to_sheet(filasRmce(rmce, datos));
  ws['!merges'] = MERGES_RMCE.map((r) => XLSX.utils.decode_range(r));
  ws['!cols'] = ANCHOS_RMCE.map((wch) => ({ wch }));
  agregarReferencias(XLSX, ws, referenciasRmce(rmce));
  return ws;
}

/** Todas las filas de los archivos. Tiene datos personales y de salud. */
export function filasAtenciones(reportes: ReporteProfesional[]): Celda[][] {
  const filas: Celda[][] = [
    ['Profesional', 'Especialidad', 'Establecimiento', 'Apellidos', 'Nombres', 'Documento', 'Fecha de nacimiento', 'Género', 'Fecha de atención', 'Problemas de salud', 'Obra social/Prepaga', 'N° de afiliado', 'Contada en la planilla'],
  ];
  for (const r of reportes) {
    for (const fila of r.filas) {
      if (Object.values(fila).every(esVacio)) continue;
      const c = indexarFila(fila);
      filas.push([
        r.profesional,
        texto(valor(c, 'especialidad')) || r.especialidad,
        texto(valor(c, 'establecimiento')) || r.establecimiento,
        texto(valor(c, 'apellidos')) || texto(valor(c, 'apellidoYNombre')),
        texto(valor(c, 'nombres')),
        texto(valor(c, 'documento')),
        formatearFechaCelda(valor(c, 'nacimiento')),
        texto(valor(c, 'genero')),
        formatearFechaCelda(valor(c, 'atencion')),
        texto(valor(c, 'problema')),
        texto(valor(c, 'obraSocial')),
        texto(valor(c, 'afiliado')),
        'motivo' in leerFechas(c) ? 'No' : 'Sí',
      ]);
    }
  }
  return filas;
}

export interface OpcionesExportar {
  incluirPacientes: boolean;
  advertencias?: string[];
  /** Qué planillas van: diaria, resumen mensual o ambas */
  formato?: FormatoExcel;
  datosRmce?: DatosRmce;
}

/** Un solo libro con el resumen, el consolidado y una hoja por profesional */
export function armarLibro(
  XLSX: XLSXModulo,
  reportes: ReporteProfesional[],
  { incluirPacientes, advertencias = [], formato = 'completa', datosRmce }: OpcionesExportar
): import('xlsx').WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hojaResumen(XLSX, reportes, advertencias), 'Resumen');
  const diaria = formato !== 'resumida';
  const resumida = formato !== 'completa';
  const nombres = nombresDeHojas([
    ...(diaria ? reportes.map((r) => r.profesional) : []),
    ...(resumida ? reportes.map((r) => `RMCE ${r.profesional}`) : []),
  ]);

  if (diaria) {
    XLSX.utils.book_append_sheet(
      wb,
      hojaPlanilla(XLSX, 'Consolidado general', calcularConsolidado(reportes)),
      'Consolidado'
    );
    reportes.forEach((r, i) => {
      const titulo = [r.profesional, r.especialidad, r.periodos.map(formatearPeriodo).join(', ')]
        .filter(Boolean)
        .join(' · ');
      XLSX.utils.book_append_sheet(wb, hojaPlanilla(XLSX, titulo, r.matriz), nombres[i]);
    });
  }

  if (resumida) {
    const desde = diaria ? reportes.length : 0;
    XLSX.utils.book_append_sheet(wb, hojaRmce(XLSX, reportes, datosRmce), 'RMCE Consolidado');
    reportes.forEach((r, i) =>
      XLSX.utils.book_append_sheet(wb, hojaRmce(XLSX, [r], datosRmce), nombres[desde + i])
    );
  }

  XLSX.utils.book_append_sheet(wb, hojaObrasSociales(XLSX, reportes), 'Obras sociales');
  if (incluirPacientes) {
    const ws = XLSX.utils.aoa_to_sheet(filasAtenciones(reportes));
    agregarReferencias(XLSX, ws, [
      'Atenciones: una fila por cada fila de los archivos de HSI. Contiene datos personales y de salud.',
      'Contada en la planilla: Sí = entra en las estadísticas; No = fila descartada (ver motivos en la app).',
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Atenciones');
  }
  return wb;
}

/** Nombre sin datos de personas: solo el período */
export function nombreArchivoExcel(reportes: ReporteProfesional[]): string {
  const periodos = [...new Set(reportes.flatMap((r) => r.periodos))].sort();
  const sufijo = periodos.length === 1 ? periodos[0] : periodos.length ? 'varios-meses' : 'sin-periodo';
  return `estadisticas-${sufijo}.xlsx`;
}

export async function exportarExcel(
  reportes: ReporteProfesional[],
  opciones: OpcionesExportar
): Promise<void> {
  const XLSX = await import('xlsx');
  XLSX.writeFile(armarLibro(XLSX, reportes, opciones), nombreArchivoExcel(reportes));
}
