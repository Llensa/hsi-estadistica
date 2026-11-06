import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Estado } from '../core/estado';
import { GRUPOS_RMCE, calcularRmce, type DatosRmce, type FilaRmce } from '../core/rmce';
import type { ReporteProfesional } from '../core/types';

/** Versión corta: Resumen Mensual de Consultorio Externo (formulario 2.1) */
@Component({
  selector: 'app-resumen-mensual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'rmce block' },
  template: `
    @let r = rmce();
    @let d = estado.datosRmce();

    @if (editable()) {
      <div class="no-print mb-3 flex flex-wrap items-end gap-3 text-sm">
        @for (c of campos; track c.clave) {
          <label class="flex flex-col gap-1 font-medium text-slate-700">
            {{ c.etiqueta }}
            <input
              type="text"
              [value]="d[c.clave]"
              (input)="cambiar(c.clave, $any($event.target).value)"
              class="w-40 rounded-md border border-slate-300 px-2 py-1 font-normal text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            />
          </label>
        }
      </div>
    }

    <div class="planilla-wrap overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="planilla rmce-tabla w-full border-collapse text-sm">
        <caption class="sr-only">Resumen Mensual de Consultorio Externo</caption>
        <tbody>
          <tr>
            <td [class]="celda + ' text-center'">2,1</td>
            <td [attr.colspan]="16" [class]="celda + ' text-center text-base font-bold'">
              Resumen Mensual de Consultorio Externo
            </td>
            <td [class]="celda">1. Hoja N° {{ d.hoja }}</td>
            <td [class]="celda">N {{ r.nuevos }}</td>
            <td [class]="celda">R {{ r.repetidos }}</td>
          </tr>
          <tr>
            <td [class]="celda + ' font-semibold'">{{ r.establecimiento }}</td>
            <td [attr.colspan]="12" [class]="celda + ' font-semibold'">DOC.: {{ r.doc }}</td>
            <td [attr.colspan]="4" [class]="celda">3. MES {{ r.meses }}</td>
            <td [attr.colspan]="3" [class]="celda">4. AÑO {{ r.anio }}</td>
          </tr>
          <tr>
            <td [class]="celda">{{ d.localidad }}</td>
            <td [attr.colspan]="8" [class]="celda"></td>
            <td [attr.colspan]="6" [class]="celda">6. DEPENDENCIA ADMINISTRATIVA</td>
            <td [attr.colspan]="2" [class]="celda">{{ d.dependencia }}</td>
            <td [class]="celda">7. REGIÓN SANITARIA {{ d.region }}</td>
            <td [class]="celda">V {{ r.varones || '' }}</td>
            <td [class]="celda">M {{ r.mujeres || '' }}</td>
          </tr>
          <tr>
            <th rowspan="3" scope="col" [class]="th">8. SERVICIO</th>
            <th [attr.colspan]="16" scope="colgroup" [class]="th">10. EDAD Y SEXO</th>
            <th rowspan="3" scope="col" [class]="th">11. TOTAL</th>
            <th colspan="2" rowspan="2" scope="colgroup" [class]="th">12. OBRA SOCIAL</th>
          </tr>
          <tr>
            @for (g of grupos; track g) {
              <th colspan="2" scope="colgroup" [class]="th">{{ g }}</th>
            }
          </tr>
          <tr>
            @for (g of grupos; track g) {
              <th scope="col" [class]="th">V</th>
              <th scope="col" [class]="th">M</th>
            }
            <th scope="col" [class]="th">SI</th>
            <th scope="col" [class]="th">NO</th>
          </tr>
          @for (s of r.servicios; track s.servicio) {
            <tr>
              <th scope="row" [class]="celda + ' text-left font-medium'">{{ s.servicio }}</th>
              @for (v of edad(s); track $index) {
                <td [class]="num">{{ v || '' }}</td>
              }
              <td [class]="num + ' font-semibold'">{{ s.total }}</td>
              <td [class]="num">{{ s.osSi }}</td>
              <td [class]="num">{{ s.osNo }}</td>
            </tr>
          }
          <tr class="bg-slate-100 font-bold">
            <th scope="row" [class]="celda + ' text-left'">13. TOTALES</th>
            @for (v of edad(r.totales); track $index) {
              <td [class]="num">{{ v }}</td>
            }
            <td [class]="num">{{ r.totales.total }}</td>
            <td [class]="num">{{ r.totales.osSi }}</td>
            <td [class]="num">{{ r.totales.osNo }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    @if (r.sinEspecificar > 0) {
      <p class="mt-2 text-xs text-slate-600">
        {{ r.sinEspecificar }}
        {{ r.sinEspecificar === 1 ? 'atención tiene' : 'atenciones tienen' }} género sin
        especificar: cuentan en 11. TOTAL pero no en 10. EDAD Y SEXO.
      </p>
    }
  `,
})
export class ResumenMensual {
  protected readonly estado = inject(Estado);

  readonly reportes = input.required<ReporteProfesional[]>();
  /** Muestra los campos para completar (localidad, dependencia, región y hoja) */
  readonly editable = input(true);

  protected readonly rmce = computed(() => calcularRmce(this.reportes()));
  protected readonly grupos = GRUPOS_RMCE;

  protected readonly campos: { clave: keyof DatosRmce; etiqueta: string }[] = [
    { clave: 'localidad', etiqueta: 'Localidad' },
    { clave: 'dependencia', etiqueta: 'Dependencia administrativa' },
    { clave: 'region', etiqueta: 'Región sanitaria' },
    { clave: 'hoja', etiqueta: 'Hoja N°' },
  ];

  protected readonly celda = 'border border-slate-300 px-2 py-1 whitespace-nowrap text-slate-800';
  protected readonly th = `${this.celda} bg-slate-50 text-center font-semibold`;
  protected readonly num = `${this.celda} text-center tabular-nums`;

  protected edad(f: FilaRmce): number[] {
    return f.V.flatMap((v, i) => [v, f.M[i]]);
  }

  protected cambiar(clave: keyof DatosRmce, valor: string): void {
    this.estado.datosRmce.update((d) => ({ ...d, [clave]: valor }));
  }
}
