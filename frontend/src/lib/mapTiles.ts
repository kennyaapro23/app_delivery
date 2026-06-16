/**
 * Configuración centralizada de tiles para Leaflet.
 * Todas las fuentes son GRATIS y SIN API key.
 */

export type TileStyleId = "voyager" | "positron" | "satellite" | "dark";

export interface TileStyleConfig {
  id: TileStyleId;
  label: string;
  description: string;
  emoji: string;
  url: string;
  attribution: string;
  maxZoom: number;
  /** Subdomains que rota Leaflet en `{s}` */
  subdomains?: string;
}

export const TILE_STYLES: Record<TileStyleId, TileStyleConfig> = {
  voyager: {
    id: "voyager",
    label: "Voyager",
    emoji: "🗺️",
    description: "Moderno y limpio (default)",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: "abcd",
  },
  positron: {
    id: "positron",
    label: "Positron",
    emoji: "🤍",
    description: "Minimal, tonos grises",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: "abcd",
  },
  satellite: {
    id: "satellite",
    label: "Satélite",
    emoji: "🛰️",
    description: "Imagen aérea real",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN, and the GIS User Community",
    maxZoom: 19,
  },
  dark: {
    id: "dark",
    label: "Dark",
    emoji: "🌙",
    description: "Tema oscuro",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: "abcd",
  },
};

export const DEFAULT_TILE_STYLE: TileStyleId = "voyager";

const STORAGE_KEY = "chikenhot-map-style";

export function loadTileStyle(): TileStyleId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && v in TILE_STYLES) return v as TileStyleId;
  } catch {
    // SSR / privacy mode
  }
  return DEFAULT_TILE_STYLE;
}

export function saveTileStyle(id: TileStyleId) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}
