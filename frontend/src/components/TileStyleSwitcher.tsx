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
        className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold shadow hover:bg-neutral-50"
        title="Cambiar estilo de mapa"
      >
        <Layers className="h-3.5 w-3.5" />
        {TILE_STYLES[current].emoji} {TILE_STYLES[current].label}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          {Object.values(TILE_STYLES).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s.id)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-neutral-50",
                current === s.id && "bg-brand-50 font-semibold text-brand-700",
              )}
            >
              <span className="text-base">{s.emoji}</span>
              <div className="flex-1">
                <div>{s.label}</div>
                <div className="text-[10px] text-neutral-500">{s.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
