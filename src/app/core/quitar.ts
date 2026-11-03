import { Injectable, inject } from '@angular/core';
import { Confirmacion, type OpcionConfirmar } from './confirmacion';
import { Estado } from './estado';
import type { ReporteProfesional } from './types';

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Quitar planillas siempre pasa por una confirmación */
@Injectable({ providedIn: 'root' })
export class QuitarReportes {
  private readonly estado = inject(Estado);
  private readonly confirmacion = inject(Confirmacion);

  async quitar(r: ReporteProfesional): Promise<void> {
    const hermanos = this.estado.delMismoArchivo(r.archivoId);
    const anexos = this.estado.pacientesAnexo().filter((p) => p.reporteId === r.id).length;

    const partes = [
      `Se quita su planilla (${plural(r.totalAtenciones, 'atención', 'atenciones')}) del consolidado`,
    ];
    if (anexos) partes.push(`y ${plural(anexos, 'Anexo II', 'Anexos II')}`);
    const mensaje = `${partes.join(' ')}. Para recuperarla hay que volver a cargar ${r.nombreArchivo}.`;

    const opciones: OpcionConfirmar[] =
      hermanos.length > 1
        ? [
            { id: 'uno', etiqueta: `Quitar solo a ${r.profesional}`, peligro: true },
            {
              id: 'archivo',
              etiqueta: `Quitar el archivo completo (${hermanos.length} profesionales)`,
              peligro: true,
            },
          ]
        : [{ id: 'uno', etiqueta: 'Quitar', peligro: true }];

    const eleccion = await this.confirmacion.pedir({
      titulo: `¿Quitar a ${r.profesional}?`,
      mensaje,
      opciones,
    });
    if (eleccion === 'uno') this.estado.quitarReporte(r.id);
    if (eleccion === 'archivo') this.estado.quitarArchivo(r.archivoId);
  }

  async quitarTodos(): Promise<void> {
    const reportes = this.estado.reportesProfesionales();
    if (!reportes.length) return;
    const archivos = new Set(reportes.map((r) => r.archivoId)).size;
    const eleccion = await this.confirmacion.pedir({
      titulo: '¿Quitar todos los archivos?',
      mensaje: `Se quitan ${plural(archivos, 'archivo', 'archivos')} (${plural(reportes.length, 'planilla', 'planillas')}), el consolidado y los Anexos II. Para recuperarlos hay que volver a cargarlos.`,
      opciones: [{ id: 'todos', etiqueta: 'Quitar todos', peligro: true }],
    });
    if (eleccion === 'todos') this.estado.limpiar();
  }
}
