import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  MapPin,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNearbyOrders, acceptOrder, type NearbyOrder } from "@/services/delivery";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

export function DriverAvailablePage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<NearbyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getNearbyOrders()
      .then(setOrders)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleAccept(id: number) {
    setAccepting(id);
    try {
      await acceptOrder(id);
      navigate(`/delivery/my-orders/${id}`);
    } catch (e) {
      setError(getErrorMessage(e));
      load();
    } finally {
      setAccepting(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Pedidos disponibles
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {orders.length} esperando un repartidor
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Actualizar pedidos"
          className="btn-ghost"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="skeleton h-5 w-40 rounded" />
                  <div className="skeleton h-3 w-28 rounded" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="skeleton ml-auto h-6 w-16 rounded" />
                  <div className="skeleton ml-auto h-3 w-12 rounded" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-4 w-1/2 rounded" />
              </div>
              <div className="skeleton mt-4 h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <Clock className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink-800">
            No hay pedidos disponibles
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            Vuelve a intentar en unos minutos o actualiza la lista.
          </p>
          <button onClick={load} className="btn-secondary mt-5">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <article key={o.id} className="card-hover p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold leading-tight text-ink-900">
                    Pedido {o.order_number}
                  </h2>
                  <p className="mt-1 text-xs text-ink-500">{formatDate(o.created_at)}</p>
                </div>
                <div className="rounded-xl bg-success-50 px-3 py-1.5 text-right">
                  <div className="font-display text-lg font-bold text-success-700">
                    {formatCurrency(o.delivery_fee)}
                  </div>
                  <div className="text-xs font-medium text-success-600">Ganancia</div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-ink-700">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                  <span>{o.delivery_address}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <CreditCard className="h-4 w-4 shrink-0 text-ink-400" />
                  <span className="capitalize">{o.payment_method}</span>
                  <span className="text-ink-300">·</span>
                  <span className="text-ink-500">
                    Total: <span className="font-medium text-ink-700">{formatCurrency(o.total)}</span>
                  </span>
                </div>
              </div>

              <button
                disabled={accepting === o.id}
                onClick={() => handleAccept(o.id)}
                className="btn-primary mt-5 w-full"
              >
                {accepting === o.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Aceptar pedido
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
