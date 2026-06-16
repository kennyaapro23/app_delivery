import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Bike,
  Ticket,
  LogOut,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/products", label: "Productos", icon: Package },
  { to: "/admin/users", label: "Usuarios", icon: Users },
  { to: "/admin/drivers", label: "Repartidores", icon: Bike },
  { to: "/admin/coupons", label: "Cupones", icon: Ticket },
];

export function AdminLayout() {
  const fullName = useAuthStore((s) => s.fullName);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-neutral-100">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-neutral-200 bg-white transition-transform md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-neutral-200 px-6">
          <span className="text-2xl">🍗</span>
          <div>
            <div className="font-bold">Chikenhot</div>
            <div className="-mt-1 text-xs text-neutral-500">Admin</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-neutral-600 hover:bg-neutral-100",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 p-4">
          <div className="mb-2 text-sm font-medium">{fullName}</div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="btn-ghost w-full"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Abrir menú">
            <Menu className="h-6 w-6" />
          </button>
          <Link to="/admin" className="font-bold">
            🍗 Admin
          </Link>
          <span />
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
