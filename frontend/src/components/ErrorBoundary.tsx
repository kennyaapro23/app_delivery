import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Mensaje a mostrar cuando hay error. Default: genérico. */
  fallback?: ReactNode;
  /** Si true, recarga la página al click del botón. */
  onResetReload?: boolean;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Atrapa errores de render de los hijos para que un crash en un sub-tree
 * (ej. Leaflet/MapContainer) NO deje toda la app en blanco.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("ErrorBoundary capturó:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          No se pudo cargar este bloque
        </div>
        <p className="mt-1 text-xs">{this.state.message}</p>
        <button
          onClick={() => {
            if (this.props.onResetReload) window.location.reload();
            else this.setState({ hasError: false, message: "" });
          }}
          className="mt-3 rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
        >
          Reintentar
        </button>
      </div>
    );
  }
}
