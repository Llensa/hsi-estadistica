import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Confirmacion } from '../core/confirmacion';
import { Estado } from '../core/estado';
import { exportarExcel } from '../core/exportar';
import { IMPRIMIR_MES } from './boton-imprimir';

const SECUNDARIO =
  'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-wait disabled:opacity-60';

/** Acciones sobre todo lo cargado: imprimir el mes completo y exportar a un solo Excel */
@Component({
  selector: 'app-acciones-mes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-print flex flex-wrap items-center justify-end gap-2' },
  template: `
    <button type="button" (click)="exportar()" [disabled]="exportando()" [class]="boton">
      {{ exportando() ? 'Exportando…' : 'Exportar a Excel' }}
    </button>
    <button type="button" (click)="imprimirTodo()" [class]="boton">Imprimir todo el mes</button>
    @if (error()) {
      <p role="alert" class="w-full text-right text-sm text-red-700">{{ error() }}</p>
    }
  `,
})
export class AccionesMes {
  private readonly estado = inject(Estado);
  private readonly confirmacion = inject(Confirmacion);

  protected readonly boton = SECUNDARIO;
  protected readonly exportando = signal(false);
  protected readonly error = signal('');

  private readonly advertencias = computed(() => {
    const lista: string[] = [];
    if (this.estado.periodos().length > 1) {
      lista.push('Hay varios meses cargados: el consolidado suma por número de día y los mezcla.');
    }
    if (this.estado.duplicados().size > 0) {
      lista.push('Hay profesionales cargados más de una vez con el mismo mes.');
    }
    return lista;
  });

  protected imprimirTodo(): void {
    document.body.classList.add(IMPRIMIR_MES);
    window.addEventListener('afterprint', () => document.body.classList.remove(IMPRIMIR_MES), {
      once: true,
    });
    window.print();
  }

  protected async exportar(): Promise<void> {
    const eleccion = await this.confirmacion.pedir({
      titulo: 'Exportar a Excel',
      mensaje:
        'Sin datos de pacientes se exportan los conteos: resumen, consolidado, una hoja por profesional y obras sociales. Con datos de pacientes se agrega una hoja con nombres, DNI y diagnósticos: el archivo queda en esta PC bajo tu responsabilidad.',
      opciones: [
        { id: 'sin', etiqueta: 'Sin datos de pacientes' },
        { id: 'con', etiqueta: 'Con datos de pacientes', peligro: true },
      ],
    });
    if (!eleccion) return;

    this.exportando.set(true);
    this.error.set('');
    try {
      await exportarExcel(this.estado.reportesProfesionales(), {
        incluirPacientes: eleccion === 'con',
        advertencias: this.advertencias(),
      });
    } catch {
      this.error.set('No se pudo generar el Excel.');
    } finally {
      this.exportando.set(false);
    }
  }
}
