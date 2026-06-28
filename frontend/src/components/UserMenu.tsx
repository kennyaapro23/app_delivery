import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import type { UserRole } from "@/types/api";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  customer: "Cliente",
  delivery_driver: "Repartidor",
};

interface UserMenuProps {
  /** Rol activo; controla qué opciones aparecen y la etiqueta del rol. */
  role: UserRole | null;
  /**
   * Limpia carrito + favoritos además del logout (solo cliente).
   * Por defecto `false`: replica el logout simple de admin/repartidor.
   */
  clearShopState?: boolean;
  /** Muestra el enlace "Mi perfil" → /profile (solo cliente). */
  showProfileLink?: boolean;
  /** Clases extra para el botón disparador (alineación, etc.). */
  className?: string;
  /**
   * Alineación del dropdown respecto al botón. Por defecto a la derecha
   * (el menú vive en la esquina superior derecha en los tres layouts).
   */
  align?: "left" | "right";
}

/**
 * Menú de cuenta unificado para los tres roles. Botón con avatar (inicial del
 * nombre) + nombre; al abrir, dropdown con nombre/rol, enlace opcional
 * "Mi perfil" y botón "Cerrar sesión". Cierra al hacer click fuera o Escape.
 */
export function UserMenu({
  role,
  clearShopState = false,
  showProfileLink = false,
  className,
  align = "right",
}: UserMenuProps) {
  const fullName = useAuthStore((s) => s.fullName);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const name = fullName ?? "Mi cuenta";
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  const roleLabel = role ? ROLE_LABEL[role] : null;

  // Cierra al hacer click fuera o al pulsar Escape mientras está abierto.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    if (clearShopState) {
      useCartStore.getState().clear();
      useFavoritesStore.getState().clear();
    }
    setOpen(false);
    navigate("/login");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 sm:pr-3"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700"
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">{name}</span>
        <ChevronDown
          className={cn("hidden h-4 w-4 text-ink-400 transition sm:block", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Menú de cuenta"
          className={cn(
            "absolute z-50 mt-2 w-56 origin-top overflow-hidden rounded-xl border border-ink-200 bg-white p-1.5 shadow-pop animate-fade-in",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="flex items-center gap-3 px-2.5 py-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700"
              aria-hidden="true"
            >
              {initial}
            </span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-ink-900">{name}</div>
              {roleLabel && <div className="text-xs text-ink-500">{roleLabel}</div>}
            </div>
          </div>

          <div className="my-1 h-px bg-ink-100" />

          {showProfileLink && (
            <Link
              to="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <User className="h-4 w-4 shrink-0 text-ink-500" />
              Mi perfil
            </Link>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-danger-700 transition hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-300"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
