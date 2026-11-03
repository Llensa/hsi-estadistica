import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Estado } from '../core/estado';
import { parseArchivo } from '../core/parse-reporte';
import type { ReporteProfesional } from '../core/types';

const EXTENSIONES = /\.(xls|xlsx)$/i;

@Component({
  selector: 'app-dropzone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block no-print' },
  template: `
    <div
      role="button"
      tabindex="0"
      [attr.aria-busy]="cargando()"
      (click)="entrada.click()"
      (keydown.enter)="entrada.click()"
      (keydown.space)="entrada.click(); $event.preventDefault()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      [class]="clases()"
    >
      <p [class]="compact() ? 'text-sm font-medium text-slate-800' : 'text-base font-medium text-slate-800'">
        {{ titulo() }}
      </p>
      <p class="mt-1 text-xs text-slate-500 sm:text-sm">
        {{ compact() ? 'arrastrá o hacé clic' : 'o hacé clic para elegirlos (.xls o .xlsx exportados de HSI)' }}
      </p>
      <input
        #entrada
        type="file"
        accept=".xls,.xlsx"
        multiple
        hidden
        (click)="$event.stopPropagation()"
        (change)="onSeleccion($event)"
      />
    </div>

    @if (mensajes().length > 0) {
      <ul class="mt-3 space-y-1 rounded-lg bg-teal-50 p-3 text-sm text-teal-900" role="status">
        @for (m of mensajes(); track $index) {
          <li>{{ m }}</li>
        }
      </ul>
    }

    @if (advertencias().length > 0) {
      <ul class="mt-3 space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">
        @for (a of advertencias(); track $index) {
          <li>{{ a }}</li>
        }
      </ul>
    }

    @if (errores().length > 0) {
      <ul class="mt-3 space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
        @for (e of errores(); track $index) {
          <li>{{ e }}</li>
        }
      </ul>
    }
  `,
})
export class Dropzone {
  private readonly estado = inject(Estado);

  readonly compact = input(false);

  protected readonly arrastrando = signal(false);
  protected readonly cargando = signal(false);
  protected readonly errores = signal<string[]>([]);
  protected readonly advertencias = signal<string[]>([]);
  protected readonly mensajes = signal<string[]>([]);

  protected readonly titulo = computed(() => {
    if (this.cargando()) return 'Leyendo archivos…';
    return this.compact() ? 'Agregar archivos' : 'Arrastrá los archivos de HSI acá';
  });

  protected readonly clases = computed(() => {
    const base =
      'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';
    const tamano = this.compact() ? 'px-3 py-5' : 'px-6 py-14';
    const estado = this.arrastrando()
      ? 'border-teal-600 bg-teal-50'
      : 'border-slate-300 bg-white hover:border-slate-400';
    return `${base} ${tamano} ${estado}`;
  });

  protected onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.arrastrando.set(true);
  }

  protected onDragLeave(ev: DragEvent): void {
    // Ignora el dragleave que se dispara al pasar sobre los textos internos
    const destino = ev.relatedTarget as Node | null;
    const zona = ev.currentTarget as HTMLElement;
    if (!destino || !zona.contains(destino)) this.arrastrando.set(false);
  }

  protected onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.arrastrando.set(false);
    if (ev.dataTransfer?.files?.length) void this.procesar(ev.dataTransfer.files);
  }

  protected onSeleccion(ev: Event): void {
    const entrada = ev.target as HTMLInputElement;
    if (entrada.files?.length) void this.procesar(entrada.files);
    entrada.value = '';
  }

  private async procesar(archivos: FileList | File[]): Promise<void> {
    if (this.cargando()) return;
    const lista = Array.from(archivos);
    const errs: string[] = [];
    const validos = lista.filter((f) => {
      const ok = EXTENSIONES.test(f.name);
      if (!ok) errs.push(`${f.name}: solo se admiten archivos .xls o .xlsx`);
      return ok;
    });

    this.cargando.set(true);
    const msgs: string[] = [];
    const advs: string[] = [];
    try {
      const resultados = await Promise.allSettled(validos.map((f) => parseArchivo(f)));
      const ok: ReporteProfesional[] = [];
      resultados.forEach((r, i) => {
        const nombre = validos[i].name;
        if (r.status === 'rejected') {
          errs.push(`${nombre}: ${(r.reason as Error)?.message ?? 'error al leer'}`);
          return;
        }
        ok.push(...r.value);
        if (r.value.length > 1) {
          msgs.push(
            `${nombre} tiene ${r.value.length} profesionales (${r.value.map((x) => x.profesional).join(', ')}). Se separó en una planilla por profesional.`
          );
        }
      });

      const { agregados, repetidos } = ok.length
        ? this.estado.agregarReportes(ok)
        : { agregados: [], repetidos: [] };
      const porArchivo = new Map<string, ReporteProfesional[]>();
      for (const r of repetidos) porArchivo.set(r.archivoId, [...(porArchivo.get(r.archivoId) ?? []), r]);
      for (const lista of porArchivo.values()) {
        const r = lista[0];
        advs.push(
          lista.length === r.profesionalesEnArchivo
            ? `${r.nombreArchivo} ya estaba cargado, no se agregó de nuevo.`
            : `${r.nombreArchivo}: ${lista.map((x) => x.profesional).join(', ')} ya estaba cargado, no se agregó de nuevo.`
        );
      }

      // Mismo profesional y mismo mes desde otro archivo: posible doble conteo
      const duplicados = this.estado.duplicados();
      for (const r of agregados) {
        const otros = duplicados.get(r.id);
        if (otros) {
          advs.push(
            `${r.profesional} ya estaba cargado desde ${otros.join(', ')} con el mismo mes. Si es el mismo período, sus atenciones se suman dos veces en el consolidado.`
          );
        }
      }

      const archivos = new Set(agregados.map((r) => r.archivoId)).size;
      if (archivos > 0) {
        msgs.unshift(archivos === 1 ? 'Se cargó 1 archivo.' : `Se cargaron ${archivos} archivos.`);
      }
    } finally {
      this.mensajes.set(msgs);
      this.advertencias.set(advs);
      this.errores.set(errs);
      this.cargando.set(false);
    }
  }
}
