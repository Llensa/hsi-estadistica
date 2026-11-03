import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RANGOS, type DiaStats, type Genero, type MatrizMensual } from '../core/types';

const GRUPOS: { clave: Genero; etiqueta: string }[] = [
  { clave: 'M', etiqueta: 'M' },
  { clave: 'F', etiqueta: 'F' },
  { clave: 'Sin Especificar', etiqueta: 'Sin especificar' },
];

const sumaRangos = (d: DiaStats, g: Genero) => RANGOS.reduce((a, r) => a + d[g][r], 0);

@Component({
  selector: 'app-planilla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="planilla-wrap overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="planilla w-full border-collapse text-sm">
        <thead>
          <tr>
            <th rowspan="2" [class]="th + ' sticky left-0'">Día</th>
            <th rowspan="2" [class]="th">N</th>
            <th rowspan="2" [class]="th">R</th>
            @for (g of grupos(); track g.clave) {
              <th [attr.colspan]="rangos.length" [class]="th">{{ g.etiqueta }}</th>
            }
            <th rowspan="2" [class]="th">TOTAL M</th>
            <th rowspan="2" [class]="th">TOTAL F</th>
            <th rowspan="2" [class]="th">TOTAL CONSULTAS</th>
          </tr>
          <tr>
            @for (g of grupos(); track g.clave) {
              @for (r of rangos; track r) {
                <th [class]="th">{{ r }}</th>
              }
            }
          </tr>
        </thead>

        <tbody>
          @for (f of filas(); track f.d.dia) {
            <tr class="hover:bg-slate-50">
              <td [class]="base + ' sticky left-0 bg-white text-center font-medium text-slate-700'">
                {{ f.d.dia }}
              </td>
              <td [class]="td"><span [class]="num(f.d.N)">{{ f.d.N }}</span></td>
              <td [class]="td"><span [class]="num(f.d.R)">{{ f.d.R }}</span></td>
              @for (g of grupos(); track g.clave) {
                @for (r of rangos; track r) {
                  @let v = f.d[g.clave][r];
                  <td [class]="td"><span [class]="num(v)">{{ v }}</span></td>
                }
              }
              <td [class]="tdTotal">{{ f.totalM }}</td>
              <td [class]="tdTotal">{{ f.totalF }}</td>
              <td [class]="tdTotal">{{ f.consultas }}</td>
            </tr>
          }
        </tbody>

        <tfoot>
          <tr class="border-t-2 border-slate-400 bg-slate-100 font-bold">
            <td [class]="base + ' sticky left-0 bg-slate-100 text-center'">T</td>
            <td [class]="tdTotal">{{ totales().N }}</td>
            <td [class]="tdTotal">{{ totales().R }}</td>
            @for (g of totales().porGrupo; track g.clave) {
              @for (v of g.valores; track $index) {
                <td [class]="tdTotal">{{ v }}</td>
              }
            }
            <td [class]="tdTotal">{{ totales().totalM }}</td>
            <td [class]="tdTotal">{{ totales().totalF }}</td>
            <td [class]="tdTotal">{{ totales().consultas }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `,
})
export class Planilla {
  readonly matriz = input.required<MatrizMensual>();

  protected readonly rangos = RANGOS;

  protected readonly base = 'border border-slate-300 px-2 py-1';
  protected readonly th = `${this.base} bg-slate-50 text-center font-semibold whitespace-nowrap text-slate-700`;
  protected readonly td = `${this.base} text-right tabular-nums`;
  protected readonly tdTotal = `${this.td} bg-slate-50 font-semibold text-slate-900`;

  protected num(n: number): string {
    return n === 0 ? 'text-slate-300' : 'text-slate-900';
  }

  /** 'Sin especificar' solo aparece si hay pacientes sin género cis informado */
  protected readonly grupos = computed(() => {
    const hay = this.matriz().some((d) => sumaRangos(d, 'Sin Especificar') > 0);
    return GRUPOS.filter((g) => g.clave !== 'Sin Especificar' || hay);
  });

  protected readonly filas = computed(() =>
    this.matriz().map((d) => ({
      d,
      totalM: sumaRangos(d, 'M'),
      totalF: sumaRangos(d, 'F'),
      consultas: d.N + d.R,
    }))
  );

  protected readonly totales = computed(() => {
    const filas = this.filas();
    const matriz = this.matriz();
    return {
      N: filas.reduce((a, f) => a + f.d.N, 0),
      R: filas.reduce((a, f) => a + f.d.R, 0),
      totalM: filas.reduce((a, f) => a + f.totalM, 0),
      totalF: filas.reduce((a, f) => a + f.totalF, 0),
      consultas: filas.reduce((a, f) => a + f.consultas, 0),
      porGrupo: this.grupos().map((g) => ({
        clave: g.clave,
        valores: RANGOS.map((r) => matriz.reduce((a, d) => a + d[g.clave][r], 0)),
      })),
    };
  });
}
