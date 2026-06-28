import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { Loader2, ShoppingCart, User, LogOut, Package, Home, Heart, MapPin, Star } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import { defaultHomeForRole } from "@/components/RoleGuard";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", end: true, label: "Inicio", icon: Home },
  { to: "/orders", label: "Mis pedidos", icon: Package },
  { to: "/favorites", label: "Favoritos", icon: Heart },
  { to: "/addresses", label: "Direcciones", icon: MapPin },
  { to: "/reviews", label: "Reseñas", icon: Star },
];

export function Layout() {
  const hydrated = useAuthHydrated();
  const fullName = useAuthStore((s) => s.fullName);
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);
  const cartCount = useCartStore((s) => s.count());
  const navigate = useNavigate();

  // Esperar la rehidratación para no decidir con role=null transitorio.
  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-50">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  // Si un admin o repartidor cae aquí (por click en el logo, redirect "*", etc.)
  // lo mandamos a su panel. El Layout cliente solo debe verlo público o customer.
  if (role && role !== "customer") {
    return <Navigate to={defaultHomeForRole(role)} replace />;
  }

  const handleLogout = () => {
    logout();
    useCartStore.getState().clear();
    useFavoritesStore.getState().clear();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl font-bold text-brand-600 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 rounded-lg"
          >
            <span>🍗</span>
            <span>Chikenhot</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <NavItem key={item.to} to={item.to} end={item.end} icon={<item.icon className="h-4 w-4" />}>
                {item.label}
              </NavItem>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition hover:bg-ink-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
              aria-label="Carrito"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white shadow-card">
                  {cartCount}
                </span>
              )}
            </Link>

            {token ? (
              <>
                <Link
                  to="/profile"
                  className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-ink-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 sm:inline-flex"
                >
                  <User className="h-4 w-4" />
                  <span className="max-w-[120px] truncate">{fullName ?? "Mi cuenta"}</span>
                </Link>
                <button onClick={handleLogout} className="btn-ghost !px-2.5 sm:!px-4" title="Cerrar sesión">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary">
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>

      <footer className="hidden border-t border-ink-200 bg-white py-6 text-center text-sm text-ink-500 md:block">
        🍗 Chikenhot &copy; {new Date().getFullYear()} — Delivery de comida
      </footer>

      {/* Navegación inferior (solo móvil) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-200 bg-white/90 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-stretch">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300",
                  isActive ? "text-brand-600" : "text-ink-500 hover:text-ink-800",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  children,
  icon,
  end,
}: {
  to: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
          isActive ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50",
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}
