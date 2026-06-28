import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import {
  TILE_STYLES,
  loadTileStyle,
  saveTileStyle,
  type TileStyleId,
} from "@/lib/mapTiles";
import { cn } from "@/lib/utils";

/**
 * Switcher de estilos de mapa. Persiste en localStorage y emite un evento
 * `map-style-changed` para que todos los <BaseTileLayer /> se actualicen
 * sin recargar.
 *
 * Pensado para anclarse dentro de un mapa con `position: absolute`.
 */
export function TileStyleSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<TileStyleId>(() => loadTileStyle());

  // Si otro componente cambia el estilo, sincronizar
  useEffect(() => {
    function handler(e: Event) {
      const id = (e as CustomEvent<TileStyleId>).detail;
      if (id && id in TILE_STYLES) setCurrent(id);
    }
    window.addEventListener("map-style-changed", handler);
    return () => window.removeEventListener("map-style-changed", handler);
  }, []);

  function pick(id: TileStyleId) {
    saveTileStyle(id);
    setCurrent(id);
    window.dispatchEvent(new CustomEvent("map-style-changed", { detail: id }));
    setOpen(false);
  }

  return (
    <div className={cn("absolute z-[1000]", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-ink-700 shadow-pop backdrop-blur transition hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        title="Cambiar estilo de mapa"
      >
        <Layers className="h-3.5 w-3.5 text-brand-500" />
        <span aria-hidden>{TILE_STYLES[current].emoji}</span>
        {TILE_STYLES[current].label}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-10 w-48 overflow-hidden rounded-xl border border-ink-200 bg-white p-1 shadow-pop"
        >
          {Object.values(TILE_STYLES).map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitemradio"
              aria-checked={current === s.id}
              onClick={() => pick(s.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                current === s.id && "bg-brand-50 hover:bg-brand-50",
              )}
            >
              <span className="text-base leading-none" aria-hidden>{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className={cn("font-medium text-ink-800", current === s.id && "font-semibold text-brand-700")}>
                  {s.label}
                </div>
                <div className="truncate text-[10px] text-ink-500">{s.description}</div>
              </div>
              {current === s.id && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
