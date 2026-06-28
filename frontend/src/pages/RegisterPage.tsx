import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "@/services/auth";
import { useAuthStore } from "@/store/auth";
import { getErrorMessage } from "@/lib/api";
import { Loader2, AlertCircle, User, Mail, Phone, Lock, Bike } from "lucide-react";

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await register({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      setSession(data);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="card overflow-hidden">
        {/* Cabecera con gradiente de marca */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-8 text-center text-white">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-4xl shadow-pop backdrop-blur">
            🍗
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight">
            Crear cuenta
          </h1>
          <p className="mt-1 text-sm text-brand-50">
            Únete y disfruta de Chikenhot
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-ink-400" />
                Nombre completo
              </label>
              <input
                required
                className="input-base"
                placeholder="Juan Pérez"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-ink-400" />
                Email
              </label>
              <input
                type="email"
                required
                className="input-base"
                placeholder="tu@email.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-ink-400" />
                Teléfono <span className="font-normal text-ink-400">(opcional)</span>
              </label>
              <input
                className="input-base"
                placeholder="999 999 999"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-ink-400" />
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input-base"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-ink-600">
              ¿Ya tienes cuenta?{" "}
              <Link
                to="/login"
                className="font-semibold text-brand-600 transition hover:text-brand-700 hover:underline"
              >
                Inicia sesión
              </Link>
            </p>
            <p className="flex items-center justify-center gap-1 text-xs text-ink-500">
              <Bike className="h-3.5 w-3.5" />
              ¿Eres repartidor?{" "}
              <Link
                to="/register-driver"
                className="font-semibold text-brand-600 transition hover:text-brand-700 hover:underline"
              >
                Únete aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
