import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { formatearPeriodo } from '../core/calculos';
import { Estado } from '../core/estado';
import type { ReporteProfesional } from '../core/types';
import { Planilla } from './planilla';

/** Una planilla por profesional. Solo se ve al usar 'Imprimir todo el mes'. */
@Component({
  selector: 'app-impresion-mes',
  imports: [Planilla],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (r of estado.reportesProfesionales(); track r.id) {
      <section class="solo-mes">
        <h2>{{ r.profesional }}</h2>
        <p>{{ detalle(r) }}</p>
        <app-planilla [matriz]="r.matriz" />
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
