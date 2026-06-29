import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingBag,
  Users,
  Bike,
  Ticket,
  Store,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/reports", label: "Reportes", icon: BarChart3 },
  { to: "/admin/orders", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/products", label: "Productos", icon: Package },
  { to: "/admin/users", label: "Usuarios", icon: Users },
  { to: "/admin/drivers", label: "Repartidores", icon: Bike },
  { to: "/admin/coupons", label: "Cupones", icon: Ticket },
  { to: "/admin/store", label: "Restaurante", icon: Store },
];

export function AdminLayout() {
  const role = useAuthStore((s) => s.role);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 transform flex-col border-r border-ink-200 bg-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0 shadow-pop" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-ink-200 px-5">
          <Link to="/admin" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <span className="text-2xl">🍗</span>
            <div className="leading-tight">
              <div className="font-display text-base font-bold text-ink-900">Chikenhot</div>
              <div className="-mt-0.5 text-xs text-ink-500">Panel admin</div>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 md:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
            General
          </p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-ink-200 bg-white/80 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 transition hover:bg-ink-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 md:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link
              to="/admin"
              className="flex items-center gap-2 font-display font-bold text-ink-900 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 rounded-lg md:hidden"
            >
              <span className="text-xl">🍗</span>
              <span>Admin</span>
            </Link>
            <span className="hidden text-sm font-medium text-ink-500 md:block">Panel admin</span>
          </div>
          <UserMenu role={role} />
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
