import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { PacienteAnexo } from '../core/types';

/**
 * Una hoja del Anexo II. La clase 'anexo-hoja' va en el host para que
 * :last-child y page-break-after funcionen entre hojas hermanas.
 */
@Component({
  selector: 'app-anexo-ii',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'anexo-hoja mx-auto block w-full max-w-[210mm] bg-white p-10 text-black shadow ring-1 ring-slate-200',
  },
  template: `
    @let p = paciente();

    <header class="border-2 border-black text-center">
      <p class="border-b-2 border-black py-1 text-lg font-bold tracking-wide">ANEXO II</p>
      <p class="py-2 text-base font-semibold">COMPROBANTE DE ATENCIÓN</p>
      <p class="border-t border-black py-1 text-xs">
        Recupero financiero - Prestaciones a pacientes con obra social o prepaga
      </p>
    </header>

    <table class="mt-4 w-full border-collapse border-2 border-black">
      <tbody>
        <tr>
          <td colspan="2" [class]="celda">
            <p [class]="etiqueta">Establecimiento</p>
            <p [class]="valor">{{ p.establecimiento || '—' }}</p>
          </td>
        </tr>
        <tr>
          <td [class]="celda + ' w-1/2'">
            <p [class]="etiqueta">Apellidos</p>
            <p [class]="valor">{{ p.apellidos || '—' }}</p>
          </td>
          <td [class]="celda + ' w-1/2'">
            <p [class]="etiqueta">Nombres</p>
            <p [class]="valor">{{ p.nombres || '—' }}</p>
          </td>
        </tr>
        <tr>
          <td [class]="celda + ' w-1/2'">
            <p [class]="etiqueta">N° Documento</p>
            <p [class]="valor">{{ p.documento || '—' }}</p>
          </td>
          <td [class]="celda + ' w-1/2'">
            <p [class]="etiqueta">Fecha de atención</p>
            <p [class]="valor">{{ p.fechaAtencion || '—' }}</p>
          </td>
        </tr>
        <tr>
          <td [class]="celda + ' w-1/2'">
            <p [class]="etiqueta">Obra Social / Prepaga</p>
            <p [class]="valor">{{ p.obraSocial || '—' }}</p>
          </td>
          <td [class]="celda + ' w-1/2'">
            <p [class]="etiqueta">N° de afiliado</p>
            <p [class]="valor">{{ p.afiliado }}</p>
          </td>
        </tr>
        <tr>
          <td [class]="celda + ' w-1/2'">
            <p [class]="etiqueta">Especialidad</p>
            <p [class]="valor">{{ p.especialidad || '—' }}</p>
          </td>
          <td [class]="celda + ' w-1/2'">
            <p [class]="etiqueta">Profesional</p>
            <p [class]="valor">{{ p.profesional || '—' }}</p>
          </td>
        </tr>
        <tr>
          <td colspan="2" [class]="celda + ' h-28'">
            <p [class]="etiqueta">Problemas de Salud (Diagnóstico)</p>
            <p [class]="valor">{{ p.problemaSalud || '—' }}</p>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="mt-8 grid grid-cols-2 gap-10">
      <div class="flex h-28 items-end">
        <p class="w-full border-t border-black pt-1 text-center text-xs">
          Firma y aclaración del paciente
        </p>
      </div>
      <div class="flex h-28 items-end">
        <p class="w-full border-t border-black pt-1 text-center text-xs">
          Firma y sello del profesional
        </p>
      </div>
    </div>
  `,
})
export class AnexoII {
  readonly paciente = input.required<PacienteAnexo>();

  protected readonly celda = 'border border-black p-2 align-top';
  protected readonly etiqueta = 'text-[11px] font-semibold text-black';
  protected readonly valor = 'mt-1 min-h-5 text-sm font-medium text-black';
}
