import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  signal,
  viewChild,
} from '@angular/core';

/** Aviso que hay que aceptar cada vez que se abre la app. Va una sola vez, en app.html. */
@Component({
  selector: 'app-aviso-responsabilidad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-print' },
  template: `
    <dialog
      #dialogo
      aria-labelledby="aviso-titulo"
      (cancel)="$event.preventDefault()"
      class="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/70"
    >
      <div class="p-6">
        <h2 id="aviso-titulo" class="text-lg font-semibold">Aviso de responsabilidad</h2>
        <div class="mt-3 space-y-2 text-sm text-slate-700">
          <p>
            Este programa se entrega "tal como está", sin garantías. Controlá los resultados antes de
            presentarlos.
          </p>
          <p>
            Los archivos que cargues pueden tener datos personales y de salud, que la Ley 25.326
            considera sensibles. La persona o institución que usa el programa es la única responsable
            de:
          </p>
          <ul class="list-disc space-y-1 pl-5">
            <li>tener autorización para acceder a esos datos y tratarlos;</li>
            <li>guardar, imprimir, compartir y eliminar de forma segura archivos y planillas;</li>
            <li>cualquier filtración, pérdida, acceso indebido o mal uso de los datos;</li>
            <li>cumplir la normativa aplicable y las reglas de su institución.</li>
          </ul>
          <p>
            El creador del programa no accede a los datos, no los recibe ni los administra, y no se
            hace responsable por filtraciones, daños o usos indebidos, en la máxima medida que permita
            la ley.
          </p>
        </div>
        @if (rechazado()) {
          <p class="mt-4 text-sm font-medium text-red-700">
            Sin aceptar el aviso no podés usar el programa. Cerrá esta ventana.
          </p>
        }
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            (click)="rechazar()"
            class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            No acepto y salir
          </button>
          <button
            type="button"
            autofocus
            (click)="aceptar()"
            class="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Acepto
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class AvisoResponsabilidad {
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  protected readonly rechazado = signal(false);

  constructor() {
    afterNextRender(() => this.dialogo().nativeElement.showModal());
  }

  protected aceptar(): void {
    this.dialogo().nativeElement.close();
  }

  protected rechazar(): void {
    this.rechazado.set(true);
    window.close();
  }
}
