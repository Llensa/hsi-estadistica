import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-boton-imprimir',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-print' },
  template: `
    <button
      type="button"
      (click)="imprimir()"
      [disabled]="disabled()"
      class="no-print shrink-0 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {{ etiqueta() }}
    </button>
  `,
})
export class BotonImprimir {
  readonly etiqueta = input('Imprimir');
  readonly disabled = input(false);

  protected imprimir(): void {
    window.print();
  }
}
