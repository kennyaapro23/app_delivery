import { useEffect, useState } from "react";
import { Loader2, Award, Mail, Phone, User as UserIcon } from "lucide-react";
import { getMe } from "@/services/auth";
import { useAuthStore } from "@/store/auth";
import { getErrorMessage } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { User, MembershipLevel } from "@/types/api";

const MEMBERSHIP_STYLES: Record<MembershipLevel, string> = {
  BRONCE: "bg-amber-100 text-amber-800",
  PLATA: "bg-neutral-200 text-neutral-700",
  ORO: "bg-yellow-100 text-yellow-800",
  PLATINO: "bg-indigo-100 text-indigo-800",
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-red-600">
        {error ?? "No se pudo cargar el perfil"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Mi cuenta</h1>

      <div className="card mb-6 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.full_name}</h2>
            <p className="text-sm text-neutral-500">Cliente desde {formatDate(user.created_at)}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <Info icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
          <Info icon={<Phone className="h-4 w-4" />} label="Teléfono" value={user.phone ?? "—"} />
          <Info icon={<UserIcon className="h-4 w-4" />} label="Rol" value={user.role} capitalize />
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 font-semibold flex items-center gap-2">
          <Award className="h-5 w-5 text-brand-500" />
          Programa de fidelización
        </h3>
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm text-neutral-500">Nivel actual</p>
            <span
              className={cn(
                "badge mt-1",
                MEMBERSHIP_STYLES[user.membership_level],
              )}
            >
              {user.membership_level}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-500">Puntos acumulados</p>
            <p className="text-2xl font-bold text-brand-600">{user.points}</p>
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
  capitalize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-neutral-400">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-400">{label}</p>
        <p className={cn("font-medium", capitalize && "capitalize")}>{value}</p>
      </div>
    </div>
  );
}
