import { formatearFecha, parseFecha } from './calculos';
import { esVacio, indexarFila, normClave, texto, valor } from './columnas';
import type { PacienteAnexo, ReporteProfesional } from './types';

/**
 * Valores de 'Obra social/Prepaga' que significan "no tiene cobertura".
 * Se comparan normalizados (sin tildes ni signos). Agregá los que use tu HSI.
 */
const SIN_COBERTURA = new Set(
  [
    '-',
    '--',
    '0',
    'no',
    'ninguna',
    'ninguno',
    'no tiene',
    'no posee',
    'sin obra social',
    'sin cobertura',
    'sin os',
    's d',
    'n a',
    'sd',
    'na',
  ].map(normClave)
);

export function tieneCobertura(v: unknown): boolean {
  if (esVacio(v)) return false;
  const n = normClave(texto(v));
  return n !== '' && !SIN_COBERTURA.has(n);
}

function formatearFechaCelda(v: unknown): string {
  const f = parseFecha(v);
  return f ? formatearFecha(f) : texto(v);
}

/** Filtra solo los pacientes cuya 'Obra social/Prepaga' NO está vacía */
export function extraerPacientesConObraSocial(reportes: ReporteProfesional[]): PacienteAnexo[] {
  const resultado: PacienteAnexo[] = [];

  for (const r of reportes) {
    r.filas.forEach((fila, i) => {
      const celdas = indexarFila(fila);
      const obraSocial = valor(celdas, 'obraSocial');
      if (!tieneCobertura(obraSocial)) return;

      let apellidos = texto(valor(celdas, 'apellidos'));
      const nombres = texto(valor(celdas, 'nombres'));
      // Si HSI trae 'Apellido y nombre' en una sola columna, va completo en Apellidos
      if (!apellidos && !nombres) apellidos = texto(valor(celdas, 'apellidoYNombre'));

      resultado.push({
        id: `${r.id}-${i}`,
        reporteId: r.id,
        establecimiento: texto(valor(celdas, 'establecimiento')) || r.establecimiento,
        especialidad: texto(valor(celdas, 'especialidad')) || r.especialidad,
        profesional: texto(valor(celdas, 'profesional')) || r.profesional,
        apellidos,
        nombres,
        documento: texto(valor(celdas, 'documento')),
        fechaAtencion: formatearFechaCelda(valor(celdas, 'atencion')),
        problemaSalud: texto(valor(celdas, 'problema')),
        obraSocial: texto(obraSocial),
        afiliado: texto(valor(celdas, 'afiliado')),
      });
    });
  }

  return resultado;
}
