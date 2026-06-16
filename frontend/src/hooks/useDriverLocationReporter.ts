import { useEffect, useRef } from "react";
import { updateDriverLocation } from "@/services/tracking";

/**
 * Hook que reporta periódicamente la ubicación GPS del repartidor al backend.
 *
 * - Solicita permisos de geolocation
 * - Reporta cada N segundos cuando hay cambios
 * - Si el navegador no soporta geolocation, simula un pequeño desplazamiento
 *   sobre una ubicación base para que el demo siga funcionando
 *
 * Implementación: usa `setTimeout` recursivo (en lugar de `setInterval`) para
 * que el siguiente tick se programe SOLO cuando el anterior termina. Así
 * evitamos solapar dos `getCurrentPosition` (timeout 8s) cuando el intervalo
 * es corto y el GPS está lento.
 */
export function useDriverLocationReporter(enabled: boolean, intervalSeconds = 15) {
  const fallbackRef = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timerId: number | null = null;

    async function reportReal(): Promise<boolean> {
      if (!navigator.geolocation) return false;
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (cancelled) return resolve(false);
            try {
              await updateDriverLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
              resolve(true);
            } catch {
              resolve(false);
            }
          },
          () => resolve(false),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
        );
      });
    }

    async function reportFallback() {
      if (!fallbackRef.current) {
        fallbackRef.current = {
          lat: -12.0464 + (Math.random() - 0.5) * 0.02,
          lon: -77.0428 + (Math.random() - 0.5) * 0.02,
        };
      }
      fallbackRef.current.lat += (Math.random() - 0.5) * 0.0008;
      fallbackRef.current.lon += (Math.random() - 0.5) * 0.0008;
      try {
        await updateDriverLocation({
          latitude: fallbackRef.current.lat,
          longitude: fallbackRef.current.lon,
          zone: "Lima Centro (demo)",
        });
      } catch {
        // ignore
      }
    }

    async function tick() {
      if (cancelled) return;
      const ok = await reportReal();
      if (cancelled) return;
      if (!ok) await reportFallback();
      if (cancelled) return;
      timerId = window.setTimeout(tick, intervalSeconds * 1000);
    }

    tick();

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    };
  }, [enabled, intervalSeconds]);
}
