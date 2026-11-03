import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as XLSX from 'xlsx';
import { extraerPacientesConObraSocial, tieneCobertura } from './anexo';
import { filtrarProfesionales } from './busqueda';
import {
  calcularConsolidado,
  calcularEdad,
  normalizarGenero,
  parseFecha,
  procesarPacientes,
  rangoEdad,
} from './calculos';
import { Estado } from './estado';
import { armarLibro, filasAtenciones, filasPlanilla, nombreArchivoExcel, nombresDeHojas } from './exportar';
import { faltantesAnexo, mesDeAnexo, totalesPorObraSocial } from './resumen';
import type { Fila, PacienteAnexo, ReporteProfesional } from './types';

const fila = (dni: unknown, atencion: unknown, extra: Fila = {}): Fila => ({
  'Nro documento': dni,
  'Fecha de nacimiento': '10/05/1980',
  'Género autopercibido': 'Mujer cis',
  'Fecha de atención': atencion,
  ...extra,
});

const reporte = (profesional: string, filas: Fila[], extra: Partial<ReporteProfesional> = {}) =>
  ({
    ...procesarPacientes(filas),
    id: profesional,
    archivoId: profesional,
    nombreArchivo: `${profesional}.xls`,
    profesionalesEnArchivo: 1,
    claveProfesional: profesional.toLowerCase(),
    establecimiento: 'CS Prueba',
    especialidad: 'Clínica Médica',
    profesional,
    filaEncabezado: 1,
    hoja: 'H',
    avisosColumnas: [],
    filas,
    ...extra,
  }) as ReporteProfesional;

const paciente = (extra: Partial<PacienteAnexo> = {}): PacienteAnexo => ({
  id: '1',
  reporteId: 'r',
  establecimiento: 'CS',
  especialidad: 'E',
  profesional: 'P',
  apellidos: 'Prueba',
  nombres: 'Inventada',
  documento: '123',
  fechaAtencion: '03/03/2026',
  problemaSalud: '',
  obraSocial: 'OSEP',
  afiliado: '99',
  ...extra,
});

describe('parseFecha', () => {
  it('lee serial de Excel con hora, sin correrse de día', () => {
    expect(parseFecha(46084.99)).toEqual({ y: 2026, m: 3, d: 3 });
  });
  it('lee texto dd/mm/aaaa y aaaa-mm-dd', () => {
    expect(parseFecha('05/03/2026')).toEqual({ y: 2026, m: 3, d: 5 });
    expect(parseFecha('2026-03-05')).toEqual({ y: 2026, m: 3, d: 5 });
  });
  it('rechaza fechas imposibles y un DNI', () => {
    expect(parseFecha('31/04/2026')).toBeNull();
    expect(parseFecha(30111222)).toBeNull();
  });
  it('valida el 29 de febrero según el año', () => {
    expect(parseFecha('29/02/2024')).not.toBeNull();
    expect(parseFecha('29/02/2026')).toBeNull();
  });
});

describe('edad y rangos', () => {
  it('cumple años el mismo día de la atención', () => {
    const nac = { y: 2000, m: 3, d: 5 };
    expect(calcularEdad(nac, { y: 2026, m: 3, d: 5 })).toBe(26);
    expect(calcularEdad(nac, { y: 2026, m: 3, d: 4 })).toBe(25);
  });
  it('respeta los bordes de cada rango', () => {
    const casos: [number, string][] = [
      [0, '-1'], [1, '1'], [2, '2 a 4'], [4, '2 a 4'], [5, '5 a 9'], [9, '5 a 9'],
      [10, '10 a 14'], [14, '10 a 14'], [15, '15 a 19'], [19, '15 a 19'], [20, '20 a 49'],
      [49, '20 a 49'], [50, '50 a 64'], [64, '50 a 64'], [65, '65 y más'],
    ];
    for (const [edad, rango] of casos) expect(rangoEdad(edad)).toBe(rango as never);
  });
});

describe('género', () => {
  it('solo cis se asigna a M o F', () => {
    expect(normalizarGenero('Varón cis')).toBe('M');
    expect(normalizarGenero('Mujer cis')).toBe('F');
    expect(normalizarGenero('Mujer trans')).toBe('Sin Especificar');
    expect(normalizarGenero('')).toBe('Sin Especificar');
  });
});

describe('procesarPacientes', () => {
  it('la primera atención por fecha es N y las siguientes R, aunque estén desordenadas', () => {
    const r = procesarPacientes([fila(1, '20/03/2026'), fila(1, '05/03/2026')]);
    expect(r.matriz[4].N).toBe(1);
    expect(r.matriz[19].R).toBe(1);
  });
  it('compara DNI como número o texto con puntos', () => {
    const r = procesarPacientes([fila(30111222, '05/03/2026'), fila('30.111.222', '06/03/2026')]);
    expect(r.matriz.reduce((a, d) => a + d.R, 0)).toBe(1);
  });
  it('sin documento cuenta como N y se informa', () => {
    const r = procesarPacientes([fila('', '05/03/2026'), fila('', '05/03/2026')]);
    expect(r.matriz[4].N).toBe(2);
    expect(r.sinDocumento).toBe(2);
  });
  it('descarta filas sin fecha válida e ignora las vacías', () => {
    const vacia: Fila = { 'Nro documento': '', 'Fecha de atención': '' };
    const r = procesarPacientes([fila(1, 'sin fecha'), vacia, fila(2, '05/03/2026')]);
    expect(r.descartadas.length).toBe(1);
    expect(r.totalAtenciones).toBe(1);
  });
});

describe('calcularConsolidado', () => {
  it('suma celda por celda', () => {
    const a = reporte('A', [fila(1, '05/03/2026')]);
    const b = reporte('B', [fila(2, '05/03/2026')]);
    const t = calcularConsolidado([a, b]);
    expect(t[4].N).toBe(2);
    expect(t[4].F['20 a 49'] + t[4].F['15 a 19'] + t[4].F['50 a 64']).toBe(2);
  });
});

describe('anexo', () => {
  it('no toma como cobertura los valores vacíos conocidos', () => {
    expect(tieneCobertura('Sin obra social')).toBeFalse();
    expect(tieneCobertura('-')).toBeFalse();
    expect(tieneCobertura('OSEP')).toBeTrue();
  });
  it('extrae solo las filas con cobertura', () => {
    const r = reporte('A', [
      fila(1, '05/03/2026', { 'Obra social/Prepaga': 'OSEP' }),
      fila(2, '05/03/2026', { 'Obra social/Prepaga': '' }),
    ]);
    expect(extraerPacientesConObraSocial([r]).length).toBe(1);
  });
});

describe('resumen', () => {
  it('lista lo que le falta al Anexo', () => {
    expect(faltantesAnexo(paciente())).toEqual([]);
    expect(faltantesAnexo(paciente({ afiliado: '', fechaAtencion: 'sin fecha' }))).toEqual([
      'fecha válida',
      'n° de afiliado',
    ]);
  });
  it('obtiene el mes de la atención', () => {
    expect(mesDeAnexo(paciente())).toBe('2026-03');
    expect(mesDeAnexo(paciente({ fechaAtencion: '' }))).toBe('');
  });
  it('agrupa obras sociales sin distinguir tildes ni mayúsculas y ordena por atenciones', () => {
    const t = totalesPorObraSocial([
      paciente({ obraSocial: 'IOSFA' }),
      paciente({ obraSocial: 'Osep', profesional: 'Q' }),
      paciente({ obraSocial: 'OSEP' }),
    ]);
    expect(t.map((x) => [x.atenciones, x.profesionales])).toEqual([[2, 2], [1, 1]]);
  });
});

describe('búsqueda', () => {
  const lista = [reporte('García, Ana', []), reporte('Torres, Inés', [], { especialidad: 'Ginecología' })];
  const nombres = (q: string) => filtrarProfesionales(lista, q).map((r) => r.profesional);

  it('ignora tildes, mayúsculas y orden', () => {
    expect(nombres('ANA GARCIA')).toEqual(['García, Ana']);
  });
  it('busca por especialidad', () => {
    expect(nombres('gineco')).toEqual(['Torres, Inés']);
  });
  it('sin texto devuelve todo', () => {
    expect(nombres('  ').length).toBe(2);
  });
});

describe('exportar', () => {
  const a = reporte('García, Ana', [
    fila(1, '05/03/2026', { Apellidos: 'Zárate', 'Obra social/Prepaga': 'OSEP' }),
    fila(2, 'sin fecha', { Apellidos: 'Otra' }),
  ]);
  const b = reporte('Torres: Inés / Dra', [fila(3, '06/03/2026')]);

  it('la fila T coincide con el total de consultas', () => {
    const filas = filasPlanilla(a.matriz);
    const t = filas[filas.length - 1];
    expect(t[0]).toBe('T');
    expect(t[t.length - 1]).toBe(a.totalAtenciones);
  });
  it('arma nombres de hoja válidos y sin repetir', () => {
    const n = nombresDeHojas(['A/B', 'A B', 'x'.repeat(40), 'Resumen']);
    expect(n[0]).toBe('A B');
    expect(n[1]).toBe('A B (2)');
    expect(n[2].length).toBe(31);
    expect(n[3]).toBe('Resumen (2)');
  });
  it('sin pacientes no incluye nombres ni DNI', () => {
    const wb = armarLibro(XLSX, [a, b], { incluirPacientes: false });
    expect(wb.SheetNames).toEqual([
      'Resumen', 'Consolidado', 'García, Ana', 'Torres  Inés   Dra', 'Obras sociales',
    ]);
    const todo = wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n');
    expect(todo).not.toContain('Zárate');
  });
  it('con pacientes agrega la hoja Atenciones y marca las filas no contadas', () => {
    const wb = armarLibro(XLSX, [a], { incluirPacientes: true });
    expect(wb.SheetNames).toContain('Atenciones');
    const filas = filasAtenciones([a]);
    expect(filas.length).toBe(3);
    expect(filas[1][12]).toBe('Sí');
    expect(filas[2][12]).toBe('No');
  });
  it('el nombre del archivo solo tiene el período', () => {
    expect(nombreArchivoExcel([a])).toBe('estadisticas-2026-03.xlsx');
  });
});

describe('Estado', () => {
  let estado: Estado;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    estado = TestBed.inject(Estado);
  });

  it('acepta otro mes con el mismo nombre de archivo', () => {
    const base = { nombreArchivo: 'reporte.xlsx', claveProfesional: 'p' };
    const enero = reporte('P', [fila(1, '05/01/2026')], { ...base, id: 'e', archivoId: 'e' });
    const febrero = reporte('P', [fila(1, '05/02/2026')], { ...base, id: 'f', archivoId: 'f' });
    expect(estado.agregarReportes([enero]).agregados.length).toBe(1);
    expect(estado.agregarReportes([febrero]).agregados.length).toBe(1);
    expect(estado.agregarReportes([febrero]).repetidos.length).toBe(1);
  });
  it('avisa si un profesional viene de dos archivos con el mismo mes', () => {
    const x = reporte('P', [fila(1, '05/03/2026')], { id: 'x', archivoId: 'x', nombreArchivo: 'x.xls' });
    const y = reporte('P', [fila(1, '06/03/2026')], { id: 'y', archivoId: 'y', nombreArchivo: 'y.xls' });
    estado.agregarReportes([x, y]);
    expect(estado.duplicados().get('x')).toEqual(['y.xls']);
  });
  it('quitar la planilla abierta vuelve a la vista general', () => {
    estado.agregarReportes([reporte('P', [fila(1, '05/03/2026')])]);
    estado.setVista({ tipo: 'profesional', id: 'P' });
    estado.quitarReporte('P');
    expect(estado.vista().tipo).toBe('general');
  });
});
