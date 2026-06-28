import { useEffect, useState } from "react";
import {
  Award,
  Mail,
  Phone,
  User as UserIcon,
  AlertCircle,
  Crown,
  Star,
  CalendarDays,
} from "lucide-react";
import { getMe } from "@/services/auth";
import { useAuthStore } from "@/store/auth";
import { getErrorMessage } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { User, UserRole, MembershipLevel } from "@/types/api";

const MEMBERSHIP_STYLES: Record<MembershipLevel, string> = {
  BRONCE: "bg-warn-100 text-warn-800",
  PLATA: "bg-ink-200 text-ink-700",
  ORO: "bg-warn-50 text-warn-700",
  PLATINO: "bg-info-100 text-info-800",
};

// Orden de niveles y umbral de puntos del SIGUIENTE nivel (solo visual).
const MEMBERSHIP_ORDER: MembershipLevel[] = ["BRONCE", "PLATA", "ORO", "PLATINO"];
const NEXT_LEVEL_THRESHOLD: Record<MembershipLevel, number | null> = {
  BRONCE: 500,
  PLATA: 1500,
  ORO: 3000,
  PLATINO: null, // nivel máximo
};

// Bug fix: ProfilePage es accesible por cualquier rol autenticado, por lo que el
// copy de la cabecera no debe etiquetar siempre como "Cliente". Mapeamos por rol.
const MEMBER_SINCE_LABEL: Record<UserRole, string> = {
  admin: "Administrador desde",
  delivery_driver: "Repartidor desde",
  customer: "Cliente desde",
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  delivery_driver: "Repartidor",
  customer: "Cliente",
};

export function ProfilePage() {
  const setUser = useAuthStore((s) => s.setUser);
  const cachedUser = useAuthStore((s) => s.user);
  const [user, setLocalUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getMe()
      .then((u) => {
        setLocalUser(u);
        setUser(u);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [setUser]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 skeleton h-8 w-40 rounded" />
        <div className="card mb-6 p-6">
          <div className="flex items-center gap-4">
            <div className="skeleton h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-5 w-44 rounded" />
              <div className="skeleton h-3 w-32 rounded" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="card p-6">
          <div className="skeleton h-5 w-48 rounded" />
          <div className="mt-4 skeleton h-12 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-danger-200 bg-danger-50 px-6 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-danger-500" />
          <p className="mt-4 text-sm font-medium text-danger-700">
            {error ?? "No se pudo cargar el perfil"}
          </p>
        </div>
      </div>
    );
  }

  const nextThreshold = NEXT_LEVEL_THRESHOLD[user.membership_level];
  const currentIndex = MEMBERSHIP_ORDER.indexOf(user.membership_level);
  const nextLevel =
    nextThreshold !== null ? MEMBERSHIP_ORDER[currentIndex + 1] : null;
  const progress =
    nextThreshold !== null
      ? Math.min(100, Math.round((user.points / nextThreshold) * 100))
      : 100;
  const pointsToNext =
    nextThreshold !== null ? Math.max(0, nextThreshold - user.points) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
        Mi cuenta
      </h1>

      {/* ===== CABECERA CON AVATAR ===== */}
      <div className="card mb-6 overflow-hidden">
        <div className="relative flex flex-col gap-4 bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white sm:flex-row sm:items-center">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl font-bold text-white shadow-card ring-2 ring-white/40 backdrop-blur">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="relative min-w-0">
            <h2 className="truncate font-display text-2xl font-bold">
              {user.full_name}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-brand-50">
              <CalendarDays className="h-3.5 w-3.5" />
              {MEMBER_SINCE_LABEL[user.role]} {formatDate(user.created_at)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold ring-1 ring-white/25 backdrop-blur">
                <UserIcon className="h-3 w-3" />
                {ROLE_LABEL[user.role]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-brand-700 shadow-card">
                <Crown className="h-3 w-3" />
                {user.membership_level}
              </span>
            </div>
          </div>
        </div>

        {/* ===== TARJETAS DE DATOS ===== */}
        <div className="grid grid-cols-1 gap-4 p-6 text-sm sm:grid-cols-2">
          <Info icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
          <Info icon={<Phone className="h-4 w-4" />} label="Teléfono" value={user.phone ?? "—"} />
          <Info
            icon={<UserIcon className="h-4 w-4" />}
            label="Rol"
            value={ROLE_LABEL[user.role]}
          />
          <Info
            icon={<Star className="h-4 w-4" />}
            label="Puntos"
            value={`${user.points} pts`}
          />
        </div>
      </div>

      {/* ===== ESTADÍSTICAS RÁPIDAS ===== */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Puntos acumulados"
          value={String(user.points)}
        />
        <StatCard
          icon={<Crown className="h-5 w-5" />}
          label="Nivel de membresía"
          value={user.membership_level}
        />
      </div>

      {/* ===== PROGRAMA DE FIDELIZACIÓN ===== */}
      <div className="card p-6">
        <h3 className="section-title mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-brand-500" />
          Programa de fidelización
        </h3>

        <div className="rounded-xl bg-surface-muted p-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-400">Nivel actual</p>
              <span
                className={cn("badge mt-1", MEMBERSHIP_STYLES[user.membership_level])}
              >
                {user.membership_level}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-ink-400">
                Puntos acumulados
              </p>
              <p className="font-display text-2xl font-bold text-brand-600">
                {user.points}
              </p>
            </div>
          </div>

          {/* Progreso hacia el siguiente nivel */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-ink-700">
                {nextLevel ? `Próximo nivel: ${nextLevel}` : "¡Nivel máximo alcanzado!"}
              </span>
              {nextLevel && (
                <span className="text-ink-500">{progress}%</span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {nextLevel ? (
              <p className="mt-2 text-xs text-ink-500">
                Te faltan{" "}
                <span className="font-semibold text-brand-600">{pointsToNext} pts</span>{" "}
                para alcanzar {nextLevel}.
              </p>
            ) : (
              <p className="mt-2 text-xs text-ink-500">
                Disfrutas de todos los beneficios premium de Chikenhot.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-5">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-500">{label}</p>
        <p className="font-display text-2xl font-bold text-ink-900">{value}</p>
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-ink-100 bg-surface-muted p-3">
      <span className="mt-0.5 text-brand-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-ink-400">{label}</p>
        <p className="truncate font-medium text-ink-900">{value}</p>
      </div>
    </div>
  );
}
