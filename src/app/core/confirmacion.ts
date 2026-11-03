import { Injectable, signal } from '@angular/core';

export interface OpcionConfirmar {
  id: string;
  etiqueta: string;
  /** Acción que borra datos: se muestra en rojo */
  peligro?: boolean;
}

export interface PedidoConfirmar {
  titulo: string;
  mensaje: string;
  /** Botones además de 'Cancelar' */
  opciones: OpcionConfirmar[];
}

interface PedidoActivo extends PedidoConfirmar {
  resolver: (id: string | null) => void;
}

/** Pide confirmación con un diálogo propio (no usa window.confirm) */
@Injectable({ providedIn: 'root' })
export class Confirmacion {
  readonly pedido = signal<PedidoActivo | null>(null);

  /** Devuelve el id de la opción elegida, o null si se canceló */
  pedir(p: PedidoConfirmar): Promise<string | null> {
    this.pedido()?.resolver(null);
    return new Promise((resolver) => this.pedido.set({ ...p, resolver }));
  }

  responder(id: string | null): void {
    const p = this.pedido();
    if (!p) return;
    this.pedido.set(null);
    p.resolver(id);
  }
}
