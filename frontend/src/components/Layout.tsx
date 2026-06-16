import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { Loader2, ShoppingCart, User, LogOut, Package, Home, Heart, MapPin, Star } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import { defaultHomeForRole } from "@/components/RoleGuard";
import { cn } from "@/lib/utils";

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
      <div className="flex h-screen items-center justify-center">
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
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-brand-600">
            <span>🍗</span>
            <span>Chikenhot</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavItem to="/" icon={<Home className="h-4 w-4" />}>
              Inicio
            </NavItem>
            <NavItem to="/orders" icon={<Package className="h-4 w-4" />}>
              Mis pedidos
            </NavItem>
            <NavItem to="/favorites" icon={<Heart className="h-4 w-4" />}>
              Favoritos
            </NavItem>
            <NavItem to="/addresses" icon={<MapPin className="h-4 w-4" />}>
              Direcciones
            </NavItem>
            <NavItem to="/reviews" icon={<Star className="h-4 w-4" />}>
              Reseñas
            </NavItem>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100"
              aria-label="Carrito"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {token ? (
              <>
                <Link
                  to="/profile"
                  className="hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
                >
                  <User className="h-4 w-4" />
                  <span className="max-w-[120px] truncate">{fullName ?? "Mi cuenta"}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn-ghost"
                  title="Cerrar sesión"
                >
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

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-sm text-neutral-500">
        🍗 Chikenhot &copy; {new Date().getFullYear()} — Delivery de comida
      </footer>
    </div>
  );
}

function NavItem({
  to,
  children,
  icon,
}: {
  to: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
          isActive
            ? "bg-brand-50 text-brand-700"
            : "text-neutral-600 hover:bg-neutral-100",
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}
