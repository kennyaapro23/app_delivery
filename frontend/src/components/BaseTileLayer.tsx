import { useEffect, useState } from "react";
import { TileLayer, type TileLayerProps } from "react-leaflet";
import { TILE_STYLES, type TileStyleId, loadTileStyle } from "@/lib/mapTiles";

interface Props {
  styleOverride?: TileStyleId;
}

/**
 * TileLayer que toma su estilo del localStorage (global a la app).
 * Si se pasa `styleOverride`, ignora el localStorage y usa ese estilo.
 *
 * Escucha el evento `map-style-changed` para actualizarse sin recargar
 * cuando el usuario cambia el estilo desde el switcher.
 *
 * IMPORTANTE: Leaflet rompe si recibe `subdomains: undefined` (intenta
 * `.split('')` o `.length` sobre undefined). Sólo pasamos esa prop cuando
 * tiene valor real.
 */
export function BaseTileLayer({ styleOverride }: Props) {
  const [styleId, setStyleId] = useState<TileStyleId>(
    () => styleOverride ?? loadTileStyle(),
  );

  useEffect(() => {
    if (styleOverride) return;
    function handler(e: Event) {
      const detail = (e as CustomEvent<TileStyleId>).detail;
      if (detail && detail in TILE_STYLES) setStyleId(detail);
    }
    window.addEventListener("map-style-changed", handler);
    return () => window.removeEventListener("map-style-changed", handler);
  }, [styleOverride]);

  const cfg = TILE_STYLES[styleId];

  // Construimos las opciones omitiendo las undefined — pasar `subdomains:
  // undefined` provoca el crash "Cannot read properties of undefined".
  const tileProps: TileLayerProps = {
    url: cfg.url,
    attribution: cfg.attribution,
    maxZoom: cfg.maxZoom,
    ...(cfg.subdomains ? { subdomains: cfg.subdomains } : {}),
  };

  // `key` fuerza a Leaflet a remontar el tile layer cuando cambia el estilo
  // — evita ghost tiles del proveedor anterior y resetea opciones inválidas.
  return <TileLayer key={cfg.id} {...tileProps} />;
}
