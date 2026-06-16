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

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  preparing: "bg-indigo-100 text-indigo-800",
  ready: "bg-purple-100 text-purple-800",
  on_the_way: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  canceled: "bg-red-100 text-red-800",
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
