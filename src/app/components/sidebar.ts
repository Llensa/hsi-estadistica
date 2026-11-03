import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { avisosDeReporte } from '../core/avisos';
import { filtrarProfesionales } from '../core/busqueda';
import { Estado } from '../core/estado';
import type { ReporteProfesional } from '../core/types';
import { Dropzone } from './dropzone';

const BASE =
  'w-full rounded-md px-3 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';
const ACTIVO = 'bg-teal-700 text-white';
const INACTIVO = 'text-slate-700 hover:bg-slate-100';

@Component({
  selector: 'app-sidebar',
  imports: [Dropzone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-print sticky top-0 block h-screen shrink-0 self-start' },
  template: `
    <aside
      class="flex h-full w-64 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-4"
    >
      <h1 class="px-3 text-lg font-semibold text-slate-900">Estadísticas médicas</h1>

      <nav aria-label="Vistas" class="flex-1 space-y-4">
        <div class="space-y-1">
          <button
            type="button"
            (click)="verGeneral()"
            [attr.aria-current]="esGeneral() ? 'page' : null"
            [class]="clase(esGeneral(), 'font-medium')"
          >
            Ver General
          </button>

          <button
            type="button"
            (click)="verAnexo()"
            [attr.aria-current]="esAnexo() ? 'page' : null"
            [class]="clase(esAnexo(), 'flex items-center justify-between font-medium')"
          >
            <span>Anexo II (Recupero)</span>
            @if (estado.pacientesAnexo().length > 0) {
              <span
                [class]="
                  'rounded-full px-2 text-xs ' +
                  (esAnexo() ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700')
                "
              >
                {{ estado.pacientesAnexo().length }}
              </span>
            }
          </button>
        </div>

        @if (estado.reportesProfesionales().length > 0) {
          <div>
            <p class="mb-1 px-3 text-sm font-medium text-slate-500">
              Profesionales ({{ estado.reportesProfesionales().length }})
            </p>
            <div class="relative mb-2">
              <input
                type="search"
                aria-label="Buscar profesional o especialidad"
                placeholder="Buscar profesional..."
                autocomplete="off"
                [value]="busqueda()"
                (input)="buscar($any($event.target).value)"
                (keydown.enter)="abrirPrimero()"
                (keydown.escape)="buscar('')"
                class="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              />
            </div>
            <p class="sr-only" aria-live="polite">
              @if (busqueda()) {
                {{ visibles().length }} resultados
              }
            </p>
            @if (visibles().length === 0) {
              <p class="px-3 py-2 text-sm text-slate-500">No hay resultados.</p>
            }
            <ul class="space-y-1">
              @for (r of visibles(); track r.id) {
                <li>
                  <button
                    type="button"
                    (click)="verProfesional(r.id)"
                    [attr.aria-current]="esProfesional(r.id) ? 'page' : null"
                    [class]="clase(esProfesional(r.id))"
                  >
                    <span class="flex items-center gap-2">
                      <span class="block truncate">{{ r.profesional || r.nombreArchivo }}</span>
                      @if (tieneAvisos(r)) {
                        <span
                          class="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                          title="Este archivo tiene avisos"
                        ></span>
                        <span class="sr-only">(tiene avisos)</span>
                      }
                    </span>
                    @if (r.especialidad) {
                      <span
                        [class]="
                          'block truncate text-xs ' +
                          (esProfesional(r.id) ? 'text-teal-100' : 'text-slate-500')
                        "
                      >
                        {{ r.especialidad }}
                      </span>
                    }
                  </button>
                </li>
              }
            </ul>
          </div>
        }
      </nav>

      @if (estado.reportesProfesionales().length > 0) {
        <app-dropzone [compact]="true" />
      }
    </aside>
  `,
})
export class Sidebar {
  protected readonly estado = inject(Estado);

  protected readonly esGeneral = computed(() => this.estado.vista().tipo === 'general');
  protected readonly esAnexo = computed(() => this.estado.vista().tipo === 'anexo');

  protected readonly busqueda = signal('');
  protected readonly visibles = computed(() =>
    filtrarProfesionales(this.estado.reportesProfesionales(), this.busqueda())
  );

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
  }

  /** Enter abre el primer resultado */
  protected abrirPrimero(): void {
    const primero = this.visibles()[0];
    if (primero) this.verProfesional(primero.id);
  }

  protected esProfesional(id: string): boolean {
    const v = this.estado.vista();
    return v.tipo === 'profesional' && v.id === id;
  }

  protected tieneAvisos(r: ReporteProfesional): boolean {
    return avisosDeReporte(r).length > 0 || this.estado.duplicados().has(r.id);
  }

  protected clase(activo: boolean, extra = ''): string {
    return `${BASE} ${extra} ${activo ? ACTIVO : INACTIVO}`;
  }

  protected verGeneral(): void {
    this.estado.setVista({ tipo: 'general' });
  }

  protected verAnexo(): void {
    this.estado.setVista({ tipo: 'anexo' });
  }

  protected verProfesional(id: string): void {
    this.estado.setVista({ tipo: 'profesional', id });
  }
}
