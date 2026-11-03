import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { avisosDeReporte } from '../core/avisos';
import type { ReporteProfesional } from '../core/types';

/** Panel de avisos de un archivo (no se imprime) */
@Component({
  selector: 'app-avisos-reporte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-print block' },
  template: `
    @if (avisos().length > 0) {
      <section
        class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        aria-label="Avisos del archivo"
      >
        <h3 class="font-semibold">Revisá estos datos de {{ reporte().nombreArchivo }}</h3>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          @for (a of avisos(); track a.texto) {
            <li>
              {{ a.texto }}
              @if (a.detalle?.length) {
                <details class="mt-1">
                  <summary class="cursor-pointer text-amber-800 underline">Ver filas</summary>
                  <ul class="mt-1 max-h-48 space-y-0.5 overflow-y-auto pl-2">
                    @for (d of a.detalle; track d.fila) {
                      <li>Fila {{ d.fila }}: {{ d.motivo }}</li>
                    }
                  </ul>
                </details>
              }
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class AvisosReporte {
  readonly reporte = input.required<ReporteProfesional>();
  protected readonly avisos = computed(() => avisosDeReporte(this.reporte()));
}
