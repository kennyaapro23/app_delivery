import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bike, ListTodo, Wallet, LogOut, Power, Map as MapIcon, Star } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { toggleAvailability } from "@/services/delivery";
import { useDriverLocationReporter } from "@/hooks/useDriverLocationReporter";
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
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
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
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/delivery" className="flex items-center gap-2 font-bold">
            <span className="text-xl">🍗</span>
            <span>Chikenhot · Repartidor</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition",
                available
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300",
              )}
              title="Toggle disponibilidad"
            >
              <Power className="h-3 w-3" />
              {available ? "Disponible" : "Offline"}
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="p-2 rounded-lg hover:bg-neutral-100"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="border-t border-neutral-100 px-2 py-1">
          <p className="px-2 text-xs text-neutral-500">Hola, {fullName}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-200 bg-white shadow-lg">
        <div className="mx-auto flex max-w-3xl">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition",
                  isActive ? "text-brand-600" : "text-neutral-500 hover:text-neutral-800",
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
