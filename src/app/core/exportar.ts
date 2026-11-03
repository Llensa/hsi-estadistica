import { extraerPacientesConObraSocial, formatearFechaCelda } from './anexo';
import { calcularConsolidado, formatearPeriodo, leerFechas } from './calculos';
import { esVacio, indexarFila, texto, valor } from './columnas';
import { totalesPorObraSocial } from './resumen';
import { GENEROS, RANGOS, type DiaStats, type MatrizMensual, type ReporteProfesional } from './types';

type XLSXModulo = typeof import('xlsx');
type Celda = string | number;

const ETIQUETA_GENERO = { M: 'M', F: 'F', 'Sin Especificar': 'Sin especificar' } as const;
const HOJAS_FIJAS = ['Resumen', 'Consolidado', 'Obras sociales', 'Atenciones'];
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
  return ws;
}

function hojaObrasSociales(XLSX: XLSXModulo, reportes: ReporteProfesional[]) {
  const totales = totalesPorObraSocial(extraerPacientesConObraSocial(reportes));
  const ws = XLSX.utils.aoa_to_sheet([
    ['Obra social / Prepaga', 'Atenciones', 'Profesionales'],
    ...totales.map((t) => [t.obraSocial, t.atenciones, t.profesionales]),
  ]);
  ws['!cols'] = [{ wch: 30 }];
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
}

/** Un solo libro con el resumen, el consolidado y una hoja por profesional */
export function armarLibro(
  XLSX: XLSXModulo,
  reportes: ReporteProfesional[],
  { incluirPacientes, advertencias = [] }: OpcionesExportar
): import('xlsx').WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hojaResumen(XLSX, reportes, advertencias), 'Resumen');
  XLSX.utils.book_append_sheet(
    wb,
    hojaPlanilla(XLSX, 'Consolidado general', calcularConsolidado(reportes)),
    'Consolidado'
  );

  const nombres = nombresDeHojas(reportes.map((r) => r.profesional));
  reportes.forEach((r, i) => {
    const titulo = [r.profesional, r.especialidad, r.periodos.map(formatearPeriodo).join(', ')]
      .filter(Boolean)
      .join(' · ');
    XLSX.utils.book_append_sheet(wb, hojaPlanilla(XLSX, titulo, r.matriz), nombres[i]);
  });

  XLSX.utils.book_append_sheet(wb, hojaObrasSociales(XLSX, reportes), 'Obras sociales');
  if (incluirPacientes) {
    const ws = XLSX.utils.aoa_to_sheet(filasAtenciones(reportes));
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
