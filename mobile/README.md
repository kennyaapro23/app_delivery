# Chikenhot — App móvil (Flutter)

App móvil (Android + iOS) del sistema de delivery **Chikenhot**, réplica completa del
frontend web React, consumiendo la misma API FastAPI. 3 roles: **cliente**, **repartidor**, **admin**.

## Backend / API

Por defecto la app apunta al backend desplegado en EC2:

```
http://52.70.207.124/api/v1
```

Para apuntar a otro host (p. ej. backend local), usa `--dart-define`:

```bash
flutter run --dart-define=API_URL=http://10.0.2.2:8000/api/v1    # emulador Android -> backend local
flutter run --dart-define=API_URL=http://192.168.1.50:8000/api/v1 # celular real -> PC en la LAN
```

## Ejecutar

```bash
cd mobile
flutter pub get
flutter run                 # dispositivo/emulador conectado
flutter run -d chrome       # vista rápida en web (útil para probar el mapa)
flutter build apk           # APK release para Android
```

## Credenciales de prueba (seed)

| Rol        | Email                  | Password     |
|------------|------------------------|--------------|
| Admin      | admin@chikenhot.pe     | admin123     |
| Cliente    | cliente@chikenhot.pe   | cliente123   |
| Repartidor | delivery@chikenhot.pe  | delivery123  |

La pantalla de login tiene botones de acceso rápido para los 3 roles.

## Mapas

Usa **flutter_map** (equivalente a Leaflet) con los mismos tiles gratuitos sin API key
que la web (CARTO Voyager/Positron/Dark y Esri Satélite). Incluye:
- Seguimiento en vivo del pedido (`LiveOrderMap`) con polling, marcador del repartidor,
  destino, línea punteada, ETA por distancia y badge "En vivo".
- Selector de ubicación con búsqueda y GPS (`LocationPicker`, geocoding Nominatim).
- Reporte de GPS del repartidor en segundo plano (`geolocator`).

## Estructura

```
lib/
  core/        config, theme, formato, almacenamiento seguro, cliente HTTP (dio + refresh JWT)
  models/      DTOs (user, product, order, address, coupon, review, tracking, dashboard, delivery)
  services/    repositorios por dominio (auth, products, orders, addresses, reviews, coupons,
               dashboard, delivery, tracking, users, geocoding, driver_location_reporter)
  providers/   estado Riverpod (auth, cart, favorites, tile_style)
  widgets/     comunes + map/ (live_order_map, location_picker, static_map, tiles, marcadores)
  router/      go_router con guards por rol + shells (cliente/repartidor/admin)
  features/    pantallas: auth/ customer/ driver/ admin/
```

> Las carpetas `backend/` y `frontend/` del repo son la fuente de verdad.
> Las carpetas `admin/`, `cliente/`, `delivery/` son prototipos HTML antiguos (ignorar).
