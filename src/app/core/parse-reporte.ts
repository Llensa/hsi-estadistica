import { procesarPacientes } from './calculos';
import { indexarFila, normClave, primerValor, texto, tieneColumna, valor } from './columnas';
import type { Fila, ReporteProfesional } from './types';

/** El encabezado se busca en las primeras filas (por defecto HSI lo pone en la fila 4) */
const FILAS_A_REVISAR = 30;
const MAX_FILAS = 100_000;
export const SIN_PROFESIONAL = 'Sin profesional informado';

/** Id único (crypto.randomUUID solo existe en https o localhost) */
const nuevoId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

interface Encabezado {
  hoja: string;
  /** Índice de fila absoluto en la hoja (0 = fila 1 del Excel) */
  fila: number;
  columnas: string[];
}

interface Grupo {
  nombre: string;
  filas: Fila[];
}

/** Valores distintos (sin repetir, en orden de aparición) de una columna */
function valoresDistintos(filas: Fila[], columna: 'especialidad'): string[] {
  const vistos = new Map<string, string>();
  for (const f of filas) {
    const v = texto(valor(indexarFila(f), columna));
    const k = normClave(v);
    if (k && !vistos.has(k)) vistos.set(k, v);
  }
  return [...vistos.values()];
}

/**
 * Separa las filas por la columna 'Profesional'.
 * - Si hay un solo profesional, las filas sin profesional quedan con él.
 * - Si hay varios, las filas sin profesional van a un grupo aparte.
 */
export function agruparPorProfesional(filas: Fila[]): Grupo[] {
  const grupos = new Map<string, Grupo>();
  const sinNombre: Fila[] = [];

  for (const fila of filas) {
    const nombre = texto(valor(indexarFila(fila), 'profesional'));
    const clave = normClave(nombre);
    if (!clave) {
      sinNombre.push(fila);
      continue;
    }
    const g = grupos.get(clave);
    if (g) g.filas.push(fila);
    else grupos.set(clave, { nombre, filas: [fila] });
  }

  const lista = [...grupos.values()];
  if (lista.length === 0) return [{ nombre: '', filas }];
  if (lista.length === 1) return [{ nombre: lista[0].nombre, filas }];

  // Solo cuenta como grupo si alguna fila sin profesional tiene datos
  const conDatos = sinNombre.filter((f) => Object.values(f).some((v) => texto(v) !== ''));
  if (conDatos.length) lista.push({ nombre: SIN_PROFESIONAL, filas: conDatos });
  return lista;
}

/**
 * Lee un Excel de HSI. Devuelve una planilla por cada profesional del archivo
 * (normalmente una sola).
 */
export async function parseArchivo(file: File): Promise<ReporteProfesional[]> {
  // SheetJS se carga solo cuando hace falta (mantiene liviano el inicio de la app)
  const XLSX = await import('xlsx');

  let wb: import('xlsx').WorkBook;
  try {
    // raw: true evita que SheetJS reinterprete fechas de texto (dd/mm) como mm/dd
    // sheetRows frena archivos que declaran millones de filas para colgar la app
    wb = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: true, sheetRows: MAX_FILAS + 1 });
  } catch {
    throw new Error('No se pudo abrir. Verificá que sea un Excel exportado de HSI.');
  }

  // Busca la hoja y la fila que tienen la columna 'Fecha de atención'
  let encabezado: Encabezado | null = null;
  for (const hoja of wb.SheetNames) {
    const ws = wb.Sheets[hoja];
    const ref = ws?.['!ref'];
    if (!ws || !ref) continue;

    const rango = XLSX.utils.decode_range(ref);
    rango.e.r = Math.min(rango.e.r, rango.s.r + FILAS_A_REVISAR - 1);
    const primeras = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: '',
      blankrows: true,
      range: XLSX.utils.encode_range(rango),
    });

    const idx = primeras.findIndex((fila) => tieneColumna(fila.map(texto), 'atencion'));
    if (idx >= 0) {
      encabezado = { hoja, fila: rango.s.r + idx, columnas: primeras[idx].map(texto) };
      break;
    }
  }

  if (!encabezado) {
    // No se muestra el contenido de las filas: podría ser un paciente
    throw new Error(
      "No se encontró la columna 'Fecha de atención'. ¿Exportaste el reporte correcto de HSI?"
    );
  }
  if (!tieneColumna(encabezado.columnas, 'nacimiento')) {
    throw new Error(
      `No se encontró la columna 'Fecha de nacimiento' (encabezado en la fila ${encabezado.fila + 1}).`
    );
  }

  const ws = wb.Sheets[encabezado.hoja];
  const filas = XLSX.utils.sheet_to_json<Fila>(ws, { range: encabezado.fila, defval: '' });
  if (filas.length === 0) {
    throw new Error(`No hay pacientes debajo del encabezado (fila ${encabezado.fila + 1}).`);
  }

  const avisosColumnas: string[] = [];
  const rangoCompleto = ws['!fullref'] ?? ws['!ref'];
  if (rangoCompleto && XLSX.utils.decode_range(rangoCompleto).e.r > MAX_FILAS) {
    avisosColumnas.push(
      `El archivo supera las ${MAX_FILAS} filas: solo se leyeron las primeras y faltan atenciones.`
    );
  }
  if (!tieneColumna(encabezado.columnas, 'genero')) {
    avisosColumnas.push(
      "Falta la columna 'Género autopercibido': todos los pacientes quedan en 'Sin Especificar'."
    );
  }
  if (!tieneColumna(encabezado.columnas, 'documento')) {
    avisosColumnas.push(
      "Falta la columna 'Nro documento': todas las atenciones se cuentan como Nuevas (N)."
    );
  }

  const filaEncabezado = encabezado.fila + 1;
  const archivoId = nuevoId();
  const nombreBase = file.name.replace(/\.[^.]+$/, '');
  const grupos = agruparPorProfesional(filas);

  return grupos.map((g) => {
    const avisos = [...avisosColumnas];
    if (g.nombre === SIN_PROFESIONAL) {
      avisos.push(
        "Estas filas no tienen dato en la columna 'Profesional'. Revisalas en el Excel."
      );
    }
    const profesional = g.nombre || nombreBase;
    return {
      ...procesarPacientes(g.filas, filaEncabezado),
      id: nuevoId(),
      archivoId,
      nombreArchivo: file.name,
      profesionalesEnArchivo: grupos.length,
      claveProfesional: normClave(profesional),
      establecimiento: primerValor(g.filas, 'establecimiento') || primerValor(filas, 'establecimiento'),
      especialidad: valoresDistintos(g.filas, 'especialidad').join(', '),
      profesional,
      filaEncabezado,
      hoja: encabezado.hoja,
      avisosColumnas: avisos,
      filas: g.filas,
    };
  });
}
