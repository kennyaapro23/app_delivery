import { useEffect, useState } from "react";
import { Award, Mail, Phone, User as UserIcon, AlertCircle } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
        Mi cuenta
      </h1>

      <div className="card mb-6 overflow-hidden">
        <div className="flex items-center gap-4 bg-gradient-to-br from-brand-50 to-brand-100 p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-500 text-2xl font-bold text-white shadow-card">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold text-ink-900">
              {user.full_name}
            </h2>
            <p className="text-sm text-ink-500">
              {MEMBER_SINCE_LABEL[user.role]} {formatDate(user.created_at)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 text-sm sm:grid-cols-2">
          <Info icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
          <Info icon={<Phone className="h-4 w-4" />} label="Teléfono" value={user.phone ?? "—"} />
          <Info
            icon={<UserIcon className="h-4 w-4" />}
            label="Rol"
            value={ROLE_LABEL[user.role]}
          />
        </div>
      </div>

      <div className="card p-6">
        <h3 className="section-title mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-brand-500" />
          Programa de fidelización
        </h3>
        <div className="flex items-center justify-between gap-6 rounded-xl bg-surface-muted p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-400">
              Nivel actual
            </p>
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
