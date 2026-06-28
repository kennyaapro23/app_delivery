import { Link, NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bike, ListTodo, Wallet, Power, Map as MapIcon, Star, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { toggleAvailability } from "@/services/delivery";
import { useDriverLocationReporter } from "@/hooks/useDriverLocationReporter";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

const NAV = [
  { to: "/delivery", end: true, label: "Inicio", icon: Bike },
  { to: "/delivery/map", label: "Mapa", icon: MapIcon },
  { to: "/delivery/my-orders", label: "Pedidos", icon: ListTodo },
  { to: "/delivery/earnings", label: "Ganancias", icon: Wallet },
  { to: "/delivery/ratings", label: "Rating", icon: Star },
];

export function DriverLayout() {
  const fullName = useAuthStore((s) => s.fullName);
  const role = useAuthStore((s) => s.role);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    // Optimistic: parsea desde localStorage si lo guardamos algún día.
    setAvailable(true);
  }, []);

  // Reporta ubicación GPS cada 15s mientras esté disponible.
  useDriverLocationReporter(available === true, 15);

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await toggleAvailability();
      setAvailable(res.is_available);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/delivery"
            className="flex min-w-0 items-center gap-2 font-display font-bold text-ink-900 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 rounded-lg"
          >
            <span className="text-xl">🍗</span>
            <span className="truncate">
              Chikenhot <span className="text-brand-600">· Repartidor</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-card transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                available
                  ? "bg-success-50 text-success-700 hover:bg-success-100 focus-visible:ring-success-400"
                  : "bg-ink-100 text-ink-700 hover:bg-ink-200 focus-visible:ring-ink-400",
              )}
              title="Cambiar disponibilidad"
            >
              {toggling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span
                  className={cn(
                    "relative flex h-2 w-2 items-center justify-center rounded-full",
                    available ? "bg-success-500" : "bg-ink-400",
                  )}
                >
                  {available && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-75" />
                  )}
                </span>
              )}
              <Power className="h-3.5 w-3.5" />
              {available ? "Disponible" : "Offline"}
            </button>
            <UserMenu role={role} />
          </div>
        </div>
        <div className="border-t border-ink-100">
          <p className="mx-auto max-w-3xl px-4 py-1.5 text-xs text-ink-500">
            Hola, <span className="font-medium text-ink-700">{fullName}</span>
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-200 bg-white/90 backdrop-blur shadow-pop">
        <div className="mx-auto flex max-w-3xl">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300",
                  isActive ? "text-brand-600" : "text-ink-500 hover:text-ink-800",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
