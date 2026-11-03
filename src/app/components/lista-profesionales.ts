import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { avisosDeReporte } from '../core/avisos';
import { formatearPeriodo } from '../core/calculos';
import { Estado } from '../core/estado';
import { QuitarReportes } from '../core/quitar';

@Component({
  selector: 'app-lista-profesionales',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block no-print' },
  template: `
    @if (filas().length > 0) {
      <section>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900">
            Planillas cargadas ({{ filas().length }})
          </h2>
          <button
            type="button"
            (click)="quitar.quitarTodos()"
            class="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            Quitar todos
          </button>
        </div>

        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="px-4 py-2 font-medium">Profesional</th>
                <th class="px-4 py-2 font-medium">Especialidad</th>
                <th class="px-4 py-2 font-medium">Período</th>
                <th class="px-4 py-2 text-right font-medium">Atenciones</th>
                <th class="px-4 py-2 text-right font-medium">N</th>
                <th class="px-4 py-2 text-right font-medium">R</th>
                <th class="px-4 py-2 font-medium">Avisos</th>
                <th class="px-4 py-2"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (f of filas(); track f.r.id) {
                <tr>
                  <td class="px-4 py-2">
                    <button
                      type="button"
                      (click)="ver(f.r.id)"
                      class="text-left font-medium text-teal-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      {{ f.r.profesional }}
                    </button>
                    <span class="block text-xs text-slate-500">
                      {{ f.r.nombreArchivo }}
                      @if (f.r.profesionalesEnArchivo > 1) {
                        · 1 de {{ f.r.profesionalesEnArchivo }} profesionales
                      }
                    </span>
                  </td>
                  <td class="px-4 py-2 text-slate-700">{{ f.r.especialidad || '—' }}</td>
                  <td class="px-4 py-2 text-slate-700">{{ f.periodo }}</td>
                  <td class="px-4 py-2 text-right tabular-nums text-slate-700">{{ f.r.totalAtenciones }}</td>
                  <td class="px-4 py-2 text-right tabular-nums text-slate-700">{{ f.nuevos }}</td>
                  <td class="px-4 py-2 text-right tabular-nums text-slate-700">{{ f.repetidos }}</td>
                  <td class="px-4 py-2">
                    @if (f.avisos > 0) {
                      <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                        {{ f.avisos }} {{ f.avisos === 1 ? 'aviso' : 'avisos' }}
                      </span>
                    } @else {
                      <span class="text-xs text-slate-500">Sin avisos</span>
                    }
                  </td>
                  <td class="px-4 py-2 text-right">
                    <button
                      type="button"
                      (click)="quitar.quitar(f.r)"
                      [attr.aria-label]="'Quitar a ' + f.r.profesional"
                      class="rounded px-2 py-1 text-slate-500 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
})
export class ListaProfesionales {
  protected readonly estado = inject(Estado);
  protected readonly quitar = inject(QuitarReportes);

  protected readonly filas = computed(() => {
    const duplicados = this.estado.duplicados();
    return this.estado.reportesProfesionales().map((r) => ({
      r,
      periodo: r.periodos.map(formatearPeriodo).join(', ') || '—',
      nuevos: r.matriz.reduce((a, d) => a + d.N, 0),
      repetidos: r.matriz.reduce((a, d) => a + d.R, 0),
      avisos: avisosDeReporte(r).length + (duplicados.has(r.id) ? 1 : 0),
    }));
  });

  protected ver(id: string): void {
    this.estado.setVista({ tipo: 'profesional', id });
  }
}
