import type { OrderStatus } from "@/types/api";
import { cn } from "@/lib/utils";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptado",
  preparing: "En preparación",
  ready: "Listo",
  on_the_way: "En ruta",
  delivered: "Entregado",
  canceled: "Cancelado",
};

// Variante semántica de badge por estado (guía §5.9).
// Pendiente → warn · Aceptado/Preparación/Listo → info · En ruta → info ·
// Entregado → success · Cancelado → danger.
const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "badge-warn",
  accepted: "badge-info",
  preparing: "badge-warn",
  ready: "badge-info",
  on_the_way: "badge-info",
  delivered: "badge-success",
  canceled: "badge-danger",
};

// Próximas transiciones válidas (alineadas con backend/app/models/order.py)
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "canceled"],
  accepted: ["preparing", "canceled"],
  preparing: ["ready", "canceled"],
  ready: ["on_the_way"],
  on_the_way: ["delivered"],
  delivered: [],
  canceled: [],
};

// Transiciones que el ADMIN puede ejecutar: hasta 'ready' + cancelar.
// Desde 'ready' en adelante es responsabilidad del repartidor.
export const NEXT_STATUSES_ADMIN: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "canceled"],
  accepted: ["preparing", "canceled"],
  preparing: ["ready", "canceled"],
  ready: [],          // ← admin no avanza más; espera al driver
  on_the_way: [],
  delivered: [],
  canceled: [],
};

// Transiciones del DRIVER: una vez el pedido está 'ready'.
export const NEXT_STATUSES_DRIVER: Record<OrderStatus, OrderStatus[]> = {
  pending: [],
  accepted: [],
  preparing: [],
  ready: ["on_the_way"],
  on_the_way: ["delivered"],
  delivered: [],
  canceled: [],
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("badge", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
