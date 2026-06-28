import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Bike,
  User as UserIcon,
  CreditCard,
  Mail,
  Lock,
  Phone,
  FileText,
  Car,
  MapPin,
  Heart,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { registerDriver, type DriverRegisterPayload } from "@/services/auth";
import { useAuthStore } from "@/store/auth";
import { defaultHomeForRole } from "@/components/RoleGuard";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

type Form = DriverRegisterPayload & { confirm_password: string };

const VEHICLES: { value: "moto" | "bicicleta" | "auto"; label: string; icon: string }[] = [
  { value: "moto", label: "Moto", icon: "🏍️" },
  { value: "bicicleta", label: "Bicicleta", icon: "🚲" },
  { value: "auto", label: "Auto", icon: "🚗" },
];

const GENDERS: { value: "masculino" | "femenino" | "otro"; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "otro", label: "Otro" },
];

const BANK_TYPES: { value: "ahorros" | "corriente"; label: string }[] = [
  { value: "ahorros", label: "Ahorros" },
  { value: "corriente", label: "Corriente" },
];

const EMPTY: Form = {
  email: "", password: "", confirm_password: "",
  full_name: "", phone: "",
  document_id: "", birth_date: "", gender: undefined,
  home_address: "", home_district: "",
  emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: "",
  vehicle_type: "moto", vehicle_brand: "", vehicle_model: "", vehicle_year: undefined,
  vehicle_color: "", vehicle_plate: "",
  license_number: "", license_expiry: "",
  insurance_number: "", insurance_expiry: "",
  bank_name: "", bank_account_type: "ahorros",
  bank_account: "", bank_cci: "", bank_account_holder: "",
};

const STEPS = [
  { n: 1, title: "Cuenta", icon: UserIcon },
  { n: 2, title: "Personal", icon: FileText },
  { n: 3, title: "Vehículo", icon: Car },
  { n: 4, title: "Banco", icon: CreditCard },
];

export function DriverRegisterPage() {
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep1(): string | null {
    if (form.full_name.trim().length < 3) return "El nombre debe tener al menos 3 caracteres";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Email inválido";
    if (form.password.length < 6) return "La contraseña debe tener al menos 6 caracteres";
    if (form.password !== form.confirm_password) return "Las contraseñas no coinciden";
    if (!form.phone || form.phone.trim().length < 6) return "El teléfono es obligatorio";
    return null;
  }

  function validateStep2(): string | null {
    if (!form.document_id || form.document_id.trim().length < 6)
      return "El DNI/Documento es obligatorio";
    if (!form.birth_date) return "La fecha de nacimiento es obligatoria";
    return null;
  }

  function validateStep3(): string | null {
    if (!form.vehicle_type) return "Selecciona un tipo de vehículo";
    if (form.vehicle_type !== "bicicleta" && (!form.vehicle_plate || form.vehicle_plate.trim().length < 3))
      return "La placa del vehículo es obligatoria";
    return null;
  }

  function goNext(currentStep: number) {
    const validator =
      currentStep === 1 ? validateStep1 :
      currentStep === 2 ? validateStep2 :
      currentStep === 3 ? validateStep3 : null;
    const err = validator?.() ?? null;
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(currentStep + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: DriverRegisterPayload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone || undefined,
        document_id: form.document_id || undefined,
        birth_date: form.birth_date || undefined,
        gender: form.gender,
        home_address: form.home_address || undefined,
        home_district: form.home_district || undefined,
        emergency_contact_name: form.emergency_contact_name || undefined,
        emergency_contact_phone: form.emergency_contact_phone || undefined,
        emergency_contact_relation: form.emergency_contact_relation || undefined,
        vehicle_type: form.vehicle_type,
        vehicle_brand: form.vehicle_brand || undefined,
        vehicle_model: form.vehicle_model || undefined,
        vehicle_year: form.vehicle_year || undefined,
        vehicle_color: form.vehicle_color || undefined,
        vehicle_plate: form.vehicle_plate || undefined,
        license_number: form.license_number || undefined,
        license_expiry: form.license_expiry || undefined,
        insurance_number: form.insurance_number || undefined,
        insurance_expiry: form.insurance_expiry || undefined,
        bank_name: form.bank_name || undefined,
        bank_account_type: form.bank_account_type,
        bank_account: form.bank_account || undefined,
        bank_cci: form.bank_cci || undefined,
        bank_account_holder: form.bank_account_holder || undefined,
      };
      const data = await registerDriver(payload);
      setSession(data);
      window.location.assign(defaultHomeForRole(data.role));
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-3xl flex-col justify-center px-4 py-8">
      <div className="card overflow-hidden">
        {/* Cabecera con gradiente de marca */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-8 text-center text-white sm:px-8">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl shadow-pop backdrop-blur">
            🛵
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight">
            Únete como repartidor
          </h1>
          <p className="mt-1 text-sm text-brand-50">
            Completa los 4 pasos para activar tu cuenta
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {/* Stepper */}
          <div className="mb-8 flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition",
                      step > s.n
                        ? "bg-success-500 text-white"
                        : step === s.n
                        ? "bg-brand-500 text-white ring-4 ring-brand-100"
                        : "bg-ink-100 text-ink-400",
                    )}
                  >
                    {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                  </div>
                  <span
                    className={cn(
                      "hidden text-xs sm:block",
                      step === s.n
                        ? "font-semibold text-brand-600"
                        : step > s.n
                        ? "font-medium text-success-600"
                        : "text-ink-400",
                    )}
                  >
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-1 h-0.5 flex-1 rounded-full transition",
                      step > s.n ? "bg-success-500" : "bg-ink-200",
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── PASO 1: CUENTA ──────────────────────────── */}
            {step === 1 && (
              <Section title="Datos de la cuenta" icon={<UserIcon className="h-4 w-4" />}>
                <Field label="Nombre completo" required>
                  <input required className="input-base" placeholder="Juan Pérez"
                         value={form.full_name}
                         onChange={(e) => update("full_name", e.target.value)} />
                </Field>

                <Grid2>
                  <Field label="Email" required icon={<Mail className="h-3.5 w-3.5" />}>
                    <input type="email" required className="input-base" placeholder="tu@email.com"
                           value={form.email}
                           onChange={(e) => update("email", e.target.value)} />
                  </Field>
                  <Field label="Teléfono" required icon={<Phone className="h-3.5 w-3.5" />}>
                    <input required className="input-base" placeholder="+51 999 999 999"
                           value={form.phone ?? ""}
                           onChange={(e) => update("phone", e.target.value)} />
                  </Field>
                </Grid2>

                <Grid2>
                  <Field label="Contraseña" required icon={<Lock className="h-3.5 w-3.5" />}>
                    <input type="password" required minLength={6} className="input-base"
                           placeholder="Mínimo 6 caracteres" value={form.password}
                           onChange={(e) => update("password", e.target.value)} />
                  </Field>
                  <Field label="Confirmar contraseña" required icon={<Lock className="h-3.5 w-3.5" />}>
                    <input type="password" required className="input-base" placeholder="Repítela"
                           value={form.confirm_password}
                           onChange={(e) => update("confirm_password", e.target.value)} />
                  </Field>
                </Grid2>
              </Section>
            )}

            {/* ── PASO 2: PERSONAL + EMERGENCIA + DIRECCIÓN ─ */}
            {step === 2 && (
              <div className="space-y-6">
                <Section title="Información personal" icon={<FileText className="h-4 w-4" />}>
                  <Grid2>
                    <Field label="DNI / Documento" required>
                      <input required className="input-base" placeholder="12345678"
                             value={form.document_id ?? ""}
                             onChange={(e) => update("document_id", e.target.value)} />
                    </Field>
                    <Field label="Fecha de nacimiento" required>
                      <input type="date" required className="input-base"
                             value={form.birth_date ?? ""}
                             onChange={(e) => update("birth_date", e.target.value)} />
                    </Field>
                  </Grid2>
                  <Field label="Género">
                    <div className="flex gap-2">
                      {GENDERS.map((g) => (
                        <label key={g.value} className={cn(
                          "flex flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition focus-within:ring-2 focus-within:ring-brand-300",
                          form.gender === g.value
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-ink-200 text-ink-700 hover:border-ink-300 hover:bg-ink-50",
                        )}>
                          <input type="radio" className="sr-only" checked={form.gender === g.value}
                                 onChange={() => update("gender", g.value)} />
                          {g.label}
                        </label>
                      ))}
                    </div>
                  </Field>
                </Section>

                <Section title="Dirección domiciliaria" icon={<MapPin className="h-4 w-4" />}>
                  <Field label="Dirección">
                    <input className="input-base" placeholder="Av. Larco 1234"
                           value={form.home_address ?? ""}
                           onChange={(e) => update("home_address", e.target.value)} />
                  </Field>
                  <Field label="Distrito">
                    <input className="input-base" placeholder="Miraflores"
                           value={form.home_district ?? ""}
                           onChange={(e) => update("home_district", e.target.value)} />
                  </Field>
                </Section>

                <Section title="Contacto de emergencia" icon={<Heart className="h-4 w-4" />}>
                  <Grid2>
                    <Field label="Nombre completo">
                      <input className="input-base" placeholder="María Pérez"
                             value={form.emergency_contact_name ?? ""}
                             onChange={(e) => update("emergency_contact_name", e.target.value)} />
                    </Field>
                    <Field label="Teléfono">
                      <input className="input-base" placeholder="+51 999 888 777"
                             value={form.emergency_contact_phone ?? ""}
                             onChange={(e) => update("emergency_contact_phone", e.target.value)} />
                    </Field>
                  </Grid2>
                  <Field label="Relación">
                    <input className="input-base" placeholder="Madre, pareja, hermano…"
                           value={form.emergency_contact_relation ?? ""}
                           onChange={(e) => update("emergency_contact_relation", e.target.value)} />
                  </Field>
                </Section>
              </div>
            )}

            {/* ── PASO 3: VEHÍCULO ─────────────────────────── */}
            {step === 3 && (
              <Section title="Vehículo" icon={<Car className="h-4 w-4" />}>
                <Field label="Tipo de vehículo" required>
                  <div className="grid grid-cols-3 gap-3">
                    {VEHICLES.map((v) => (
                      <label key={v.value} className={cn(
                        "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-brand-300",
                        form.vehicle_type === v.value
                          ? "border-brand-500 bg-brand-50 shadow-card"
                          : "border-ink-200 hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-card-hover",
                      )}>
                        <input type="radio" name="vehicle" className="sr-only"
                               checked={form.vehicle_type === v.value}
                               onChange={() => update("vehicle_type", v.value)} />
                        <span className="text-3xl">{v.icon}</span>
                        <span className={cn(
                          "text-sm font-semibold",
                          form.vehicle_type === v.value ? "text-brand-700" : "text-ink-700",
                        )}>{v.label}</span>
                      </label>
                    ))}
                  </div>
                </Field>

                <Grid2>
                  <Field label="Marca">
                    <input className="input-base" placeholder="Honda, Yamaha…"
                           value={form.vehicle_brand ?? ""}
                           onChange={(e) => update("vehicle_brand", e.target.value)} />
                  </Field>
                  <Field label="Modelo">
                    <input className="input-base" placeholder="CG 150, FZ16…"
                           value={form.vehicle_model ?? ""}
                           onChange={(e) => update("vehicle_model", e.target.value)} />
                  </Field>
                </Grid2>

                <Grid2>
                  <Field label="Año">
                    <input type="number" min="1990" max="2030" className="input-base"
                           placeholder="2022"
                           value={form.vehicle_year ?? ""}
                           onChange={(e) => update("vehicle_year",
                             e.target.value ? parseInt(e.target.value, 10) : undefined)} />
                  </Field>
                  <Field label="Color">
                    <input className="input-base" placeholder="Rojo, Negro…"
                           value={form.vehicle_color ?? ""}
                           onChange={(e) => update("vehicle_color", e.target.value)} />
                  </Field>
                </Grid2>

                <Field
                  label="Placa"
                  required={form.vehicle_type !== "bicicleta"}
                >
                  <input
                    className="input-base uppercase"
                    placeholder="ABC-123"
                    required={form.vehicle_type !== "bicicleta"}
                    value={form.vehicle_plate ?? ""}
                    onChange={(e) =>
                      update("vehicle_plate", e.target.value.toUpperCase().trim())
                    }
                  />
                </Field>

                <div className="rounded-xl border border-ink-200 bg-surface-muted p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
                    Documentación (opcional)
                  </p>
                  <Grid2>
                    <Field label="N° de licencia">
                      <input className="input-base" value={form.license_number ?? ""}
                             onChange={(e) => update("license_number", e.target.value)} />
                    </Field>
                    <Field label="Vencimiento licencia">
                      <input type="date" className="input-base" value={form.license_expiry ?? ""}
                             onChange={(e) => update("license_expiry", e.target.value)} />
                    </Field>
                    <Field label="N° de seguro / SOAT">
                      <input className="input-base" value={form.insurance_number ?? ""}
                             onChange={(e) => update("insurance_number", e.target.value)} />
                    </Field>
                    <Field label="Vencimiento seguro">
                      <input type="date" className="input-base" value={form.insurance_expiry ?? ""}
                             onChange={(e) => update("insurance_expiry", e.target.value)} />
                    </Field>
                  </Grid2>
                </div>
              </Section>
            )}

            {/* ── PASO 4: BANCO ────────────────────────────── */}
            {step === 4 && (
              <Section title="Datos bancarios (para tus pagos)" icon={<CreditCard className="h-4 w-4" />}>
                <Grid2>
                  <Field label="Banco">
                    <input className="input-base" placeholder="BCP, Interbank, BBVA, Scotiabank…"
                           value={form.bank_name ?? ""}
                           onChange={(e) => update("bank_name", e.target.value)} />
                  </Field>
                  <Field label="Tipo de cuenta">
                    <div className="flex gap-2">
                      {BANK_TYPES.map((b) => (
                        <label key={b.value} className={cn(
                          "flex flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition focus-within:ring-2 focus-within:ring-brand-300",
                          form.bank_account_type === b.value
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-ink-200 text-ink-700 hover:border-ink-300 hover:bg-ink-50",
                        )}>
                          <input type="radio" className="sr-only"
                                 checked={form.bank_account_type === b.value}
                                 onChange={() => update("bank_account_type", b.value)} />
                          {b.label}
                        </label>
                      ))}
                    </div>
                  </Field>
                </Grid2>

                <Field label="Número de cuenta">
                  <input className="input-base" placeholder="194-12345678-0-01"
                         value={form.bank_account ?? ""}
                         onChange={(e) => update("bank_account", e.target.value)} />
                </Field>

                <Field label="CCI (Código de Cuenta Interbancario)">
                  <input className="input-base" placeholder="002-194-001234567890-01"
                         value={form.bank_cci ?? ""}
                         onChange={(e) => update("bank_cci", e.target.value)} />
                </Field>

                <Field label="Titular de la cuenta">
                  <input className="input-base" placeholder="Como aparece en el banco"
                         value={form.bank_account_holder ?? ""}
                         onChange={(e) => update("bank_account_holder", e.target.value)} />
                </Field>

                <div className="flex items-start gap-2 rounded-lg border border-info-200 bg-info-50 px-4 py-3 text-xs text-info-700">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Tus datos bancarios son seguros y solo se usan para depositar
                    tus ganancias.
                  </span>
                </div>
              </Section>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Navegación */}
            <div className="flex gap-2 pt-2">
              {step > 1 && (
                <button type="button" onClick={() => { setError(null); setStep(step - 1); }}
                        disabled={loading} className="btn-ghost flex-1">
                  <ArrowLeft className="h-4 w-4" /> Volver
                </button>
              )}
              {step < 4 ? (
                <button type="button" onClick={() => goNext(step)} className="btn-primary flex-1">
                  Continuar <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bike className="h-4 w-4" />
                  )}
                  {loading ? "Creando cuenta..." : "Crear cuenta de repartidor"}
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-ink-600">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="font-semibold text-brand-600 transition hover:text-brand-700 hover:underline">
                Inicia sesión
              </Link>
            </p>
            <p className="text-xs text-ink-500">
              ¿Eres cliente?{" "}
              <Link to="/register" className="font-semibold text-brand-600 transition hover:text-brand-700 hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-600">
        <span className="text-brand-500">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label flex items-center gap-1">
        {icon && <span className="text-ink-400">{icon}</span>}
        {label}
        {required && <span className="text-danger-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}
