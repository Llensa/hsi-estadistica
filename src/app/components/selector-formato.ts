import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Estado, type Formato } from '../core/estado';

/** Elige qué se ve, se imprime y se exporta: planilla diaria, resumen mensual o ambas */
@Component({
  selector: 'app-selector-formato',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-print block' },
  template: `
    <div role="group" aria-label="Formato de la estadística" class="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-sm">
      @for (o of opciones; track o.id) {
        <button
          type="button"
          (click)="estado.formato.set(o.id)"
          [attr.aria-pressed]="estado.formato() === o.id"
          [class]="
            'rounded px-3 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ' +
            (estado.formato() === o.id ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100')
          "
        >
          {{ o.etiqueta }}
        </button>
      }
    </div>
  `,
})
export class SelectorFormato {
  protected readonly estado = inject(Estado);

  protected readonly opciones: { id: Formato; etiqueta: string }[] = [
    { id: 'completa', etiqueta: 'Planilla diaria' },
    { id: 'resumida', etiqueta: 'Resumen mensual' },
    { id: 'ambas', etiqueta: 'Ambas' },
  ];
}
