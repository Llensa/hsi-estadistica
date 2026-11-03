import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { formatearPeriodo } from '../core/calculos';
import { normClave } from '../core/columnas';
import { Estado } from '../core/estado';
import { faltantesAnexo, mesDeAnexo, totalesPorObraSocial } from '../core/resumen';
import { AnexoII } from './anexo-ii';
import { BotonImprimir } from './boton-imprimir';

const CAMPO =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

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

    @if (estado.pacientesAnexo().length > 0) {
      <div class="no-print flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        @if (estado.reportesProfesionales().length > 1) {
          <div class="flex items-center gap-2">
            <label for="filtro-profesional" class="font-medium text-slate-700">Profesional</label>
            <select
              id="filtro-profesional"
              [value]="filtro()"
              (change)="filtro.set($any($event.target).value)"
              [class]="campo"
            >
              <option value="">Todos</option>
              @for (r of estado.reportesProfesionales(); track r.id) {
                <option [value]="r.id">{{ r.profesional }}</option>
              }
            </select>
          </div>
        }
        <div class="flex items-center gap-2">
          <label for="filtro-obra-social" class="font-medium text-slate-700">Obra social</label>
          <select
            id="filtro-obra-social"
            [value]="filtroObraSocial()"
            (change)="filtroObraSocial.set($any($event.target).value)"
            [class]="campo"
          >
            <option value="">Todas</option>
            @for (t of opcionesObraSocial(); track t.clave) {
              <option [value]="t.clave">{{ t.obraSocial }}</option>
            }
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label for="filtro-mes" class="font-medium text-slate-700">Mes</label>
          <select
            id="filtro-mes"
            [value]="filtroMes()"
            (change)="filtroMes.set($any($event.target).value)"
            [class]="campo"
          >
            <option value="">Todos</option>
            @for (m of opcionesMes(); track m) {
              <option [value]="m">{{ etiquetaMes(m) }}</option>
            }
          </select>
        </div>
        <label class="flex items-center gap-2 font-medium text-slate-700">
          <input
            type="checkbox"
            [checked]="soloIncompletos()"
            (change)="soloIncompletos.set($any($event.target).checked)"
          />
          Solo incompletos
        </label>
      </div>

      <div class="no-print grid gap-4 lg:grid-cols-2">
        <section class="rounded-xl border border-slate-200 bg-white p-4">
          <h3 class="font-semibold text-slate-900">Control antes de presentar</h3>
          @if (incompletos().length === 0) {
            <p class="mt-1 text-sm text-teal-800">Todos los Anexos tienen los datos completos.</p>
          } @else {
            <p class="mt-1 text-sm text-amber-900">
              {{ n - incompletos().length }} completos, {{ incompletos().length }} incompletos.
            </p>
            <ul class="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
              @for (i of incompletos(); track i.p.id) {
                <li>
                  <button
                    type="button"
                    (click)="irA(i.p.id)"
                    class="text-left text-teal-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    {{ i.p.apellidos || i.p.nombres || 'Sin nombre' }} {{ i.p.fechaAtencion }}
                  </button>
                  <span class="text-slate-600"> · falta: {{ i.faltan.join(', ') }}</span>
                </li>
              }
            </ul>
          }
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-4">
          <h3 class="font-semibold text-slate-900">Totales por obra social</h3>
          <table class="mt-2 w-full text-left text-sm">
            <thead class="text-slate-600">
              <tr>
                <th class="py-1 font-medium">Obra social</th>
                <th class="py-1 text-right font-medium">Atenciones</th>
                <th class="py-1 text-right font-medium">Profesionales</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (t of totales(); track t.clave) {
                <tr>
                  <td class="py-1 text-slate-800">{{ t.obraSocial }}</td>
                  <td class="py-1 text-right tabular-nums">{{ t.atenciones }}</td>
                  <td class="py-1 text-right tabular-nums">{{ t.profesionales }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      </div>
    }

    @if (estado.reportesProfesionales().length === 0) {
      <p class="no-print rounded-lg bg-slate-100 p-4 text-sm text-slate-600">
        Primero cargá los archivos de HSI desde Ver General.
      </p>
    } @else if (estado.pacientesAnexo().length === 0) {
      <p class="no-print rounded-lg bg-slate-100 p-4 text-sm text-slate-600">
        No hay pacientes con la columna 'Obra social/Prepaga' completa.
      </p>
    } @else if (visibles().length === 0) {
      <p class="no-print rounded-lg bg-slate-100 p-4 text-sm text-slate-600">
        No hay Anexos con estos filtros.
      </p>
    } @else {
      <div class="anexos-lista space-y-6">
        @for (p of visibles(); track p.id) {
          <app-anexo-ii [paciente]="p" [attr.id]="'anexo-' + p.id" />
        }
      </div>
    }
  `,
})
export class ModuloAnexo {
  protected readonly estado = inject(Estado);
  protected readonly campo = CAMPO;

  /** '' = todos los profesionales */
  protected readonly filtro = signal('');
  protected readonly filtroObraSocial = signal('');
  protected readonly filtroMes = signal('');
  protected readonly soloIncompletos = signal(false);

  protected readonly opcionesObraSocial = computed(() =>
    totalesPorObraSocial(this.estado.pacientesAnexo()).sort((a, b) =>
      a.obraSocial.localeCompare(b.obraSocial)
    )
  );

  protected readonly opcionesMes = computed(() =>
    [...new Set(this.estado.pacientesAnexo().map(mesDeAnexo).filter(Boolean))].sort()
  );

  /** Los filtros que dejaron de existir (por quitar planillas) se ignoran */
  protected readonly pacientes = computed(() => {
    const prof = this.filtro();
    const os = this.filtroObraSocial();
    const mes = this.filtroMes();
    const hayProf = this.estado.reportesProfesionales().some((r) => r.id === prof);
    const hayOs = this.opcionesObraSocial().some((t) => t.clave === os);
    const hayMes = this.opcionesMes().includes(mes);
    return this.estado
      .pacientesAnexo()
      .filter(
        (p) =>
          (!hayProf || p.reporteId === prof) &&
          (!hayOs || normClave(p.obraSocial) === os) &&
          (!hayMes || mesDeAnexo(p) === mes)
      );
  });

  protected readonly incompletos = computed(() =>
    this.pacientes()
      .map((p) => ({ p, faltan: faltantesAnexo(p) }))
      .filter((i) => i.faltan.length > 0)
  );

  protected readonly totales = computed(() => totalesPorObraSocial(this.pacientes()));

  /** Lo que se ve y se imprime */
  protected readonly visibles = computed(() =>
    this.soloIncompletos() ? this.incompletos().map((i) => i.p) : this.pacientes()
  );

  protected etiquetaMes(mes: string): string {
    return formatearPeriodo(mes);
  }

  protected irA(id: string): void {
    document.getElementById(`anexo-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  }
}
