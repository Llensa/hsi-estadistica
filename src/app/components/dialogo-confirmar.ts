import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { Confirmacion } from '../core/confirmacion';

/** Diálogo modal de confirmación. Va una sola vez, en app.html. */
@Component({
  selector: 'app-dialogo-confirmar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-print' },
  template: `
    <dialog
      #dialogo
      aria-labelledby="dialogo-titulo"
      aria-describedby="dialogo-mensaje"
      (cancel)="$event.preventDefault(); responder(null)"
      (click)="clicFondo($event)"
      class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      @if (confirmacion.pedido(); as p) {
        <div class="p-6">
          <h2 id="dialogo-titulo" class="text-lg font-semibold">{{ p.titulo }}</h2>
          <p id="dialogo-mensaje" class="mt-2 text-sm text-slate-600">{{ p.mensaje }}</p>
          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              autofocus
              (click)="responder(null)"
              class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              Cancelar
            </button>
            @for (o of p.opciones; track o.id) {
              <button
                type="button"
                (click)="responder(o.id)"
                [class]="
                  'rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
                  (o.peligro
                    ? 'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-600'
                    : 'bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-600')
                "
              >
                {{ o.etiqueta }}
              </button>
            }
          </div>
        </div>
      }
    </dialog>
  `,
})
export class DialogoConfirmar {
  protected readonly confirmacion = inject(Confirmacion);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    effect(() => {
      const abierto = this.confirmacion.pedido() !== null;
      const el = this.dialogo().nativeElement;
      if (abierto && !el.open) el.showModal();
      if (!abierto && el.open) el.close();
    });
  }

  protected responder(id: string | null): void {
    this.confirmacion.responder(id);
  }

  /** Clic en el fondo oscuro = cancelar */
  protected clicFondo(ev: MouseEvent): void {
    if (ev.target === this.dialogo().nativeElement) this.responder(null);
  }
}
