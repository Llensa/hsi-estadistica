import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Estado } from '../core/estado';
import { AnexoII } from './anexo-ii';
import { BotonImprimir } from './boton-imprimir';

@Component({
  selector: 'app-modulo-anexo',
  imports: [AnexoII, BotonImprimir],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-6' },
  template: `
    @let n = pacientes().length;

    <header class="no-print flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold text-slate-900">
          Generador de Anexo II (Recupero Financiero)
        </h2>
        <p class="mt-1 text-sm text-slate-600">
          {{ n }} {{ n === 1 ? 'atención' : 'atenciones' }} con obra social o prepaga. Se imprime un
          Anexo por hoja.
        </p>
      </div>
      <app-boton-imprimir etiqueta="Imprimir Anexos" [disabled]="n === 0" />
    </header>

    @if (estado.reportesProfesionales().length > 1) {
      <div class="no-print flex items-center gap-2 text-sm">
        <label for="filtro-profesional" class="font-medium text-slate-700">Profesional</label>
        <select
          id="filtro-profesional"
          [value]="filtro()"
          (change)="filtro.set($any($event.target).value)"
          class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <option value="">Todos</option>
          @for (r of estado.reportesProfesionales(); track r.id) {
            <option [value]="r.id">{{ r.profesional }}</option>
          }
        </select>
      </div>
    }

    @if (estado.reportesProfesionales().length === 0) {
      <p class="no-print rounded-lg bg-slate-100 p-4 text-sm text-slate-600">
        Primero cargá los archivos de HSI desde Ver General.
      </p>
    } @else if (n === 0) {
      <p class="no-print rounded-lg bg-slate-100 p-4 text-sm text-slate-600">
        No hay pacientes con la columna 'Obra social/Prepaga' completa.
      </p>
    } @else {
      <div class="anexos-lista space-y-6">
        @for (p of pacientes(); track p.id) {
          <app-anexo-ii [paciente]="p" />
        }
      </div>
    }
  `,
})
export class ModuloAnexo {
  protected readonly estado = inject(Estado);

  /** '' = todos los profesionales */
  protected readonly filtro = signal('');

  protected readonly pacientes = computed(() => {
    const f = this.filtro();
    const todos = this.estado.pacientesAnexo();
    const existe = this.estado.reportesProfesionales().some((r) => r.id === f);
    return f && existe ? todos.filter((p) => p.reporteId === f) : todos;
  });
}
