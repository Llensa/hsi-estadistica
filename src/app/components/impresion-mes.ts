import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { formatearPeriodo } from '../core/calculos';
import { Estado } from '../core/estado';
import type { ReporteProfesional } from '../core/types';
import { Planilla } from './planilla';
import { ResumenMensual } from './resumen-mensual';

/** Una hoja por profesional, en el formato elegido. Solo se ve al usar 'Imprimir todo el mes'. */
@Component({
  selector: 'app-impresion-mes',
  imports: [Planilla, ResumenMensual],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (r of estado.reportesProfesionales(); track r.id) {
      <section class="solo-mes">
        <h2>{{ r.profesional }}</h2>
        <p>{{ detalle(r) }}</p>
        @if (estado.formato() !== 'resumida') {
          <app-planilla [matriz]="r.matriz" />
        }
        @if (estado.formato() !== 'completa') {
          <app-resumen-mensual [reportes]="[r]" [editable]="false" />
        }
      </section>
    }
  `,
})
export class ImpresionMes {
  protected readonly estado = inject(Estado);

  protected detalle(r: ReporteProfesional): string {
    return [r.especialidad, r.establecimiento, r.periodos.map(formatearPeriodo).join(', ')]
      .filter(Boolean)
      .join(' · ');
  }
}
