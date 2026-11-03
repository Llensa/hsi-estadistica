import { Injectable, computed, signal } from '@angular/core';
import { extraerPacientesConObraSocial } from './anexo';
import { calcularConsolidado } from './calculos';
import type { ReporteProfesional, Vista } from './types';

export interface ResultadoAgregar {
  /** Planillas agregadas */
  agregados: ReporteProfesional[];
  /** Planillas que ya estaban cargadas y no se agregaron */
  repetidos: ReporteProfesional[];
}

/** Clave de una planilla: mismo archivo y mismo profesional = misma planilla */
const claveCarga = (r: ReporteProfesional) => `${r.nombreArchivo}|${r.claveProfesional}`;

/** Estado global de la app (signals). Todo vive en el navegador: no se sube nada. */
@Injectable({ providedIn: 'root' })
export class Estado {
  readonly reportesProfesionales = signal<ReporteProfesional[]>([]);
  readonly vista = signal<Vista>({ tipo: 'general' });

  /** Matriz de 31 días con la suma de todos los profesionales */
  readonly reporteConsolidado = computed(() => calcularConsolidado(this.reportesProfesionales()));

  /** Pacientes con 'Obra social/Prepaga' informada */
  readonly pacientesAnexo = computed(() =>
    extraerPacientesConObraSocial(this.reportesProfesionales())
  );

  /** Meses presentes en todos los archivos ('AAAA-MM') */
  readonly periodos = computed(() =>
    [...new Set(this.reportesProfesionales().flatMap((r) => r.periodos))].sort()
  );

  /** Establecimientos distintos de los archivos cargados */
  readonly establecimientos = computed(() => [
    ...new Set(
      this.reportesProfesionales()
        .map((r) => r.establecimiento)
        .filter(Boolean)
    ),
  ]);

  /**
   * Profesionales cargados desde más de un archivo con algún mes en común.
   * Sus atenciones podrían estar sumándose dos veces en el consolidado.
   * Clave: id de la planilla. Valor: los otros archivos donde aparece.
   */
  readonly duplicados = computed(() => {
    const porProfesional = new Map<string, ReporteProfesional[]>();
    for (const r of this.reportesProfesionales()) {
      const lista = porProfesional.get(r.claveProfesional) ?? [];
      lista.push(r);
      porProfesional.set(r.claveProfesional, lista);
    }
    const resultado = new Map<string, string[]>();
    for (const lista of porProfesional.values()) {
      for (const r of lista) {
        const otros = lista
          .filter(
            (o) =>
              o.archivoId !== r.archivoId && o.periodos.some((p) => r.periodos.includes(p))
          )
          .map((o) => o.nombreArchivo);
        if (otros.length) resultado.set(r.id, [...new Set(otros)]);
      }
    }
    return resultado;
  });

  readonly profesionalActual = computed(() => {
    const v = this.vista();
    return v.tipo === 'profesional'
      ? this.reportesProfesionales().find((r) => r.id === v.id)
      : undefined;
  });

  /** Agrega planillas nuevas. No vuelve a agregar la misma planilla del mismo archivo. */
  agregarReportes(nuevos: ReporteProfesional[]): ResultadoAgregar {
    const existentes = new Set(this.reportesProfesionales().map(claveCarga));
    const agregados: ReporteProfesional[] = [];
    const repetidos: ReporteProfesional[] = [];
    for (const n of nuevos) {
      const clave = claveCarga(n);
      if (existentes.has(clave)) {
        repetidos.push(n);
      } else {
        existentes.add(clave);
        agregados.push(n);
      }
    }
    if (agregados.length) this.reportesProfesionales.update((a) => [...a, ...agregados]);
    return { agregados, repetidos };
  }

  /** Planillas que salieron del mismo archivo */
  delMismoArchivo(archivoId: string): ReporteProfesional[] {
    return this.reportesProfesionales().filter((r) => r.archivoId === archivoId);
  }

  quitarReporte(id: string): void {
    this.quitarDonde((r) => r.id === id);
  }

  quitarArchivo(archivoId: string): void {
    this.quitarDonde((r) => r.archivoId === archivoId);
  }

  limpiar(): void {
    this.reportesProfesionales.set([]);
    this.vista.set({ tipo: 'general' });
  }

  setVista(vista: Vista): void {
    this.vista.set(vista);
  }

  private quitarDonde(condicion: (r: ReporteProfesional) => boolean): void {
    this.reportesProfesionales.update((lista) => lista.filter((r) => !condicion(r)));
    const v = this.vista();
    if (v.tipo === 'profesional' && !this.reportesProfesionales().some((r) => r.id === v.id)) {
      this.vista.set({ tipo: 'general' });
    }
  }
}
