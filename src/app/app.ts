import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { AccionesMes } from './components/acciones-mes';
import { AvisoResponsabilidad } from './components/aviso-responsabilidad';
import { AvisosReporte } from './components/avisos-reporte';
import { BotonImprimir } from './components/boton-imprimir';
import { DialogoConfirmar } from './components/dialogo-confirmar';
import { Dropzone } from './components/dropzone';
import { ImpresionMes } from './components/impresion-mes';
import { ListaProfesionales } from './components/lista-profesionales';
import { ModuloAnexo } from './components/modulo-anexo';
import { Planilla } from './components/planilla';
import { ResumenMensual } from './components/resumen-mensual';
import { SelectorFormato } from './components/selector-formato';
import { Sidebar } from './components/sidebar';
import { avisosDeReporte } from './core/avisos';
import { formatearPeriodo } from './core/calculos';
import { Estado } from './core/estado';
import { QuitarReportes } from './core/quitar';

@Component({
  selector: 'app-root',
  imports: [
    AccionesMes,
    AvisoResponsabilidad,
    AvisosReporte,
    BotonImprimir,
    DialogoConfirmar,
    Dropzone,
    ImpresionMes,
    ListaProfesionales,
    ModuloAnexo,
    Planilla,
    ResumenMensual,
    SelectorFormato,
    Sidebar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  protected readonly estado = inject(Estado);
  protected readonly quitar = inject(QuitarReportes);
  protected readonly esAnexo = computed(() => this.estado.vista().tipo === 'anexo');

  /** Subtítulo de la planilla del profesional que se está viendo */
  protected readonly detalleProfesional = computed(() => {
    const r = this.estado.profesionalActual();
    if (!r) return '';
    const origen =
      r.profesionalesEnArchivo > 1
        ? `${r.nombreArchivo} (1 de ${r.profesionalesEnArchivo} profesionales)`
        : r.nombreArchivo;
    return [r.especialidad, r.establecimiento, r.periodos.map(formatearPeriodo).join(', '), origen]
      .filter(Boolean)
      .join(' · ');
  });

  /** Otros archivos donde aparece el profesional actual con el mismo mes */
  protected readonly duplicadoActual = computed(() => {
    const r = this.estado.profesionalActual();
    return r ? (this.estado.duplicados().get(r.id) ?? []) : [];
  });

  /** Subtítulo del consolidado */
  protected readonly detalleGeneral = computed(() => {
    const n = this.estado.reportesProfesionales().length;
    return [
      this.estado.establecimientos().join(', '),
      this.estado.periodos().map(formatearPeriodo).join(', '),
      `${n} ${n === 1 ? 'profesional' : 'profesionales'}`,
    ]
      .filter(Boolean)
      .join(' · ');
  });

  /** Cantidad de archivos con avisos (para el aviso general) */
  protected readonly archivosConAvisos = computed(
    () => this.estado.reportesProfesionales().filter((r) => avisosDeReporte(r).length > 0).length
  );

  /** Nombres de profesionales cargados desde más de un archivo con el mismo mes */
  protected readonly profesionalesDuplicados = computed(() => {
    const ids = this.estado.duplicados();
    const nombres = new Map<string, string>();
    for (const r of this.estado.reportesProfesionales()) {
      if (ids.has(r.id) && !nombres.has(r.claveProfesional)) {
        nombres.set(r.claveProfesional, r.profesional);
      }
    }
    return [...nombres.values()];
  });

  constructor() {
    // Con datos cargados, cerrar pide confirmación (se pierden: no se guardan en disco)
    window.addEventListener('beforeunload', (ev) => {
      if (this.estado.reportesProfesionales().length > 0) ev.preventDefault();
    });

    // Al cambiar de vista, volver al principio de la página
    effect(() => {
      this.estado.vista();
      window.scrollTo({ top: 0 });
    });
  }
}
