import L from "leaflet";

/**
 * Icono distintivo del restaurante (tienda) para los mapas.
 * Pin naranja de marca con una tienda 🍗, diferenciado del resto de marcadores.
 */
export const restaurantIcon = L.divIcon({
  html: `
    <div style="position:relative;width:40px;height:48px">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 30 42" style="position:absolute;inset:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
        <path fill="#ff7e0f" stroke="white" stroke-width="2" d="M15 0 C7 0 0 7 0 15 c0 11 15 27 15 27 s15-16 15-27 C30 7 23 0 15 0 z"/>
      </svg>
      <div style="position:absolute;top:4px;left:0;width:40px;height:24px;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1">🍗</div>
    </div>`,
  className: "",
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -44],
});
