import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, CreditCard, RefreshCw } from "lucide-react";
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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pedidos disponibles</h1>
          <p className="text-sm text-neutral-500">{orders.length} esperando un repartidor</p>
        </div>
        <button onClick={load} className="btn-ghost">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-neutral-500">
          🕑 No hay pedidos disponibles ahora mismo
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <article key={o.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold">Pedido {o.order_number}</h2>
                  <p className="text-xs text-neutral-500">{formatDate(o.created_at)}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-brand-600">{formatCurrency(o.delivery_fee)}</div>
                  <div className="text-xs text-neutral-500">Ganancia</div>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <span>{o.delivery_address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-neutral-400" />
                  <span className="capitalize">{o.payment_method}</span>
                  <span className="text-neutral-300">·</span>
                  <span>Total: {formatCurrency(o.total)}</span>
                </div>
              </div>

              <button
                disabled={accepting === o.id}
                onClick={() => handleAccept(o.id)}
                className="btn-primary mt-4 w-full"
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
