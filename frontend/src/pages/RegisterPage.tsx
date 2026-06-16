import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "@/services/auth";
import { useAuthStore } from "@/store/auth";
import { getErrorMessage } from "@/lib/api";
import { Loader2 } from "lucide-react";

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
      <div className="card p-8">
        <div className="mb-6 text-center">
          <div className="text-4xl">🍗</div>
          <h1 className="mt-2 text-2xl font-bold">Crear cuenta</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Únete y disfruta de Chikenhot
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre completo</label>
            <input
              required
              className="input-base"
              placeholder="Juan Pérez"
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
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
            <label className="mb-1 block text-sm font-medium">
              Teléfono <span className="text-neutral-400">(opcional)</span>
            </label>
            <input
              className="input-base"
              placeholder="999 999 999"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Contraseña</label>
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
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
