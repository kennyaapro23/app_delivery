The scaffold already pins the exact package set (dio, flutter_riverpod, go_router, flutter_map 8.x, latlong2, geolocator, flutter_secure_storage, shared_preferences, intl, cached_network_image). I'll align the spec's package list and structure to this existing scaffold. I have everything needed.

# Chikenhot — Flutter Mobile Build Spec (Single Source of Truth)

> Target: Flutter app for **Android + iOS** replicating 100% of the Chikenhot food-delivery system (FastAPI backend + React web frontend). This spec preserves **exact endpoint paths, field names, enum values, and map behavior**. Scaffold already exists at `C:/Users/kenny/Documents/app_delivery/mobile` with packages pinned (see §7).

---

## 1. App Overview + 3 Roles

**Chikenhot** is a chicken-restaurant food-delivery platform (Lima, Peru). Single Flutter app, **role-based home** after login. All money in **PEN (S/)**, IGV (VAT) **18%**. Spanish UI. "Real-time" = HTTP polling (no WebSockets/push in backend).

| Role | Enum value | Home route | Capability summary |
|---|---|---|---|
| **Customer** | `customer` (default on register) | `/` (catalog) | Browse menu, cart, favorites, addresses (map picker), checkout (fee/coupon), orders, live tracking, invoice, reviews, profile/loyalty |
| **Driver** | `delivery_driver` | `/delivery` | Dashboard/earnings/ratings, availability toggle, background GPS reporting, nearby orders, accept, navigate map, pick-up + deliver |
| **Admin** | `admin` | `/admin` | Dashboard KPIs, all-orders supervision + status transitions, product/category CRUD, user management, driver roster, coupon create |

**Global config constants** (hardcode as `AppConfig`):
- API prefix: `/api/v1`. Base URL via `--dart-define=API_BASE_URL` (default to backend host, e.g. `http://10.0.2.2:8000/api/v1` for Android emulator).
- `TAX_RATE = 0.18`. Restaurant origin `(-12.0464, -77.0428)` ("Chikenhot Lima Centro").
- `DELIVERY_FEE_BASE=3.00`, `PER_KM=1.50`, `MIN=5.00`, `MAX=25.00`, `DEFAULT=5.00`.
- Access token 60 min; refresh token 7 days. Auth rate limit 10/60s on login+register (NOT refresh).
- Lima fallback center `LatLng(-12.0464, -77.0428)`.

---

## 2. Complete API Endpoint Reference

Base = `/api/v1`. Auth column: **public** / **any** (any authenticated active user) / **customer** / **driver** / **admin** / **admin+driver**. All bodies JSON unless noted. Errors: `{"detail": "..."}`; 401/403/404/409/400/422/429.

### 2.1 Auth (`/auth`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/auth/login` | public | **form-urlencoded**: `username`(=email), `password` | `TokenResponse` |
| POST | `/auth/login/json` | public | `{email, password}` | `TokenResponse` |
| POST | `/auth/register` | public | `{email, password, full_name, phone?, role?='customer'}` | `TokenResponse` (auto-login) |
| POST | `/auth/register-driver` | public | `DriverRegisterRequest` (account + personal + emergency + vehicle + bank, see §3) | `TokenResponse` (role=`delivery_driver`, auto-login) |
| POST | `/auth/refresh` | public (refresh token in body) | `{refresh_token}` | `TokenResponse` (full rotation) |
| GET | `/auth/me` | any | — | `UserResponse` |

> Login errors: 401 `"Email o contraseña incorrectos"` / `"Cuenta desactivada"`. Register dup: 409 `"Ya existe una cuenta con este email"`. Invalid role: 400. Refresh invalid: 401 `"Refresh token inválido"` / `"Usuario no encontrado o inactivo"`. Use the **JSON login** (`/auth/login/json`) in the app.

### 2.2 Users (`/users`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/users/stats` | admin | — | `UserStatsResponse` |
| GET | `/users` | admin | query `skip=0, limit=50(1-100), role?, search?` | `UserListResponse {users[], total}` |
| GET | `/users/{user_id}` | admin | path | `UserResponse` |
| PUT | `/users/{user_id}` | any (owner-or-admin) | `UserUpdate {full_name?, phone?, email?, is_active?}` | `UserResponse` |
| DELETE | `/users/{user_id}` | admin | path | `UserResponse` (soft delete, `is_active=false`) |

> `PUT /users/{id}`: non-admin may edit ONLY own profile (403 `"Solo puedes editar tu propio perfil"` otherwise). `role`/`points`/`membership_level` NOT editable.

### 2.3 Products & Categories (`/products`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/products/categories` | public | query `include_inactive=false` | `CategoryResponse[]` |
| POST | `/products/categories` | admin | `CategoryCreate {name, description?, icon='🍗', display_order=0}` | `CategoryResponse` |
| PUT | `/products/categories/{id}` | admin | `CategoryUpdate` (all optional) | `CategoryResponse` |
| DELETE | `/products/categories/{id}` | admin | path | `CategoryResponse` (deactivated; cascades to products) |
| GET | `/products` | public | query `skip=0, limit=100(1-500), category_id?, search?, featured=false, include_inactive=false` | `ProductListResponse {products[], total}` |
| GET | `/products/{id}` | public | path | `ProductResponse` |
| POST | `/products` | admin | `ProductCreate {name, description?, price, category_id, icon='🍗', image_url?, is_featured=false}` | `ProductResponse` |
| PUT | `/products/{id}` | admin | `ProductUpdate` (adds `is_available?`) | `ProductResponse` |
| DELETE | `/products/{id}` | admin | path | `ProductResponse` (soft delete) |

### 2.4 Orders (`/orders`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/orders/calculate-fee` | public | `{latitude?, longitude?, address?}` | **raw dict** `{fee, distance_km, base, per_km, min, max, raw_fee, restaurant{name,latitude,longitude}, note}` |
| POST | `/orders` | any | `OrderCreate {items[], delivery_address, payment_method='efectivo', notes?, coupon_code?}` | `OrderResponse` |
| GET | `/orders` | any (role-scoped) | query `status?, skip=0, limit=50(1-100)` | `OrderListResponse {orders[], total}` |
| GET | `/orders/{id}` | any (ownership) | path | `OrderResponse` |
| PATCH | `/orders/{id}/status` | admin+driver | `{status}` | `OrderResponse` |
| PATCH | `/orders/{id}/cancel` | any (customer-own / admin) | — | `OrderResponse` (canceled) |
| GET | `/orders/{id}/tracking` | any (ownership) | path | **raw dict** (tracking, see §6) |
| GET | `/orders/{id}/invoice` | any (own/admin) | path | **PDF binary** `application/pdf`, `filename="factura-{num}.pdf"` |

> `GET /orders` role scoping: customer→own, driver→assigned, admin→all.
> `PATCH /status`: admin may set `{accepted, preparing, ready, canceled}`; driver may set `{on_the_way, delivered}` (must be assigned). Must also satisfy transition graph (§5/order lifecycle).
> `PATCH /cancel`: only `{pending, accepted, preparing}` cancelable; customer must own.

### 2.5 Delivery (`/delivery`) — driver/admin

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/delivery/toggle-availability` | driver | — | `{is_available, message}` |
| PATCH | `/delivery/location` | driver | `{latitude, longitude, zone?}` | `{message, latitude, longitude}` |
| GET | `/delivery/nearby-orders` | driver | query `skip=0, limit=20(1-50)` | `{orders:[{id, order_number, status, delivery_address, total, delivery_fee, payment_method, created_at}]}` |
| POST | `/delivery/accept/{order_id}` | driver | path | `{message, order_id}` |
| PATCH | `/delivery/complete/{order_id}` | driver | path | `{message, order_id}` |
| GET | `/delivery/earnings` | driver | — | `EarningsSummary` |
| GET | `/delivery/stats` | driver | — | `DriverStatsResponse` |
| GET | `/delivery/drivers` | admin | — | `DriverProfile[]` (full PII roster) |

> Accept errors: 404; 400 `"Este pedido ya tiene un repartidor asignado"`; 400 `"Este pedido no puede ser aceptado"` (status not in pending/accepted/preparing/ready). Complete errors: 404; 403 `"No eres el repartidor de este pedido"`; 400 `"El pedido debe estar 'en ruta' para completar"`.

### 2.6 Addresses (`/addresses`) — any auth (owner-scoped)

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/addresses` | — | `AddressResponse[]` (own only) |
| POST | `/addresses` | `AddressCreate {label='Casa', full_address, reference?, district?, city?, latitude?, longitude?, is_default=false}` | `AddressResponse` |
| PUT | `/addresses/{id}` | `AddressUpdate` (all optional) | `AddressResponse` |
| DELETE | `/addresses/{id}` | — | `{message:"Dirección eliminada"}` |

> Owner-only; 403 if not owner, 404 if missing. `is_default=true` clears default on other addresses.

### 2.7 Reviews (`/reviews`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/reviews` | any (customer owns order) | `{order_id, rating(1-5), comment?}` | `ReviewResponse` |
| GET | `/reviews/my` | any | — | `ReviewResponse[]` (own) |
| GET | `/reviews/driver/{driver_id}` | public | path | `ReviewResponse[]` (`customer_name` omitted) |

> Create errors: 404; 400 `"Solo puedes reseñar tus propios pedidos"`; 400 `"Solo puedes reseñar pedidos entregados"`; 400 `"Ya existe una reseña para este pedido"`. One review per order.

### 2.8 Coupons (`/coupons`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/coupons` | public | — | `CouponResponse[]` (active only) |
| POST | `/coupons` | admin | `CouponCreate {code, description?, discount_percent?, discount_amount?, min_order_amount=0, max_uses=1, expires_at?}` | `CouponResponse` |
| POST | `/coupons/apply` | any | `{code, order_subtotal}` | `{valid, discount, message}` (**always HTTP 200**) |

> `/apply` is preview only — never records usage, never errors on invalid (validity in `valid` flag).

### 2.9 Dashboards (`/dashboard`)

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/dashboard/admin` | admin | `{orders_today, orders_change_percent, revenue_today, revenue_change_percent, active_users, total_drivers, available_drivers, pending_orders}` |
| GET | `/dashboard/customer` | customer | `{total_orders, active_orders, points, membership_level, last_order_total, last_order_date}` |
| GET | `/dashboard/driver` | driver | `DriverStatsResponse` (identical to `/delivery/stats`) |

---

## 3. Dart Data Models / DTOs

All models: `fromJson` / `toJson`, `==`/`hashCode` where useful (cart/favorites). Money fields are **double** (backend uses Float — round at display boundary). Enums serialize/deserialize by exact string value.

**Enums** (Dart enums with `.value` string mapping):
- `UserRole`: `admin`, `customer`, `delivery_driver`
- `MembershipLevel`: `BRONCE`, `PLATA`, `ORO`, `PLATINO`
- `OrderStatus`: `pending, accepted, preparing, ready, on_the_way, delivered, canceled`
- `PaymentMethod`: `efectivo, yape, tarjeta`
- `VehicleType`: `moto, bicicleta, auto`
- `TileStyleId`: `voyager, positron, satellite, dark`

> Spanish status labels: `pending=Pendiente, accepted=Aceptado, preparing=En Preparación, ready=Listo para Entrega, on_the_way=En Ruta, delivered=Entregado, canceled=Cancelado`.

**Auth/User**
- `TokenResponse { String accessToken; String refreshToken; String tokenType; int userId; String role; String fullName; }`
- `UserResponse { int id; String email; String fullName; String? phone; String role; bool isActive; int points; String membershipLevel; DateTime createdAt; }`
- `UserUpdate { String? fullName; String? phone; String? email; bool? isActive; }` (omit unset in toJson)
- `UserStatsResponse { int totalUsers, activeUsers, customers, drivers, admins, newThisWeek; }`
- `DriverRegisterRequest`: account `{email, password, fullName, phone?}` + personal `{documentId?, birthDate?, gender?, homeAddress?, homeDistrict?}` + emergency `{emergencyContactName?, emergencyContactPhone?, emergencyContactRelation?}` + vehicle `{vehicleType?, vehicleBrand?, vehicleModel?, vehicleYear?, vehicleColor?, vehiclePlate?, licenseNumber?, licenseExpiry?, insuranceNumber?, insuranceExpiry?}` + bank `{bankName?, bankAccountType?, bankAccount?, bankCci?, bankAccountHolder?}` (omit empty optionals in toJson)

**Catalog**
- `CategoryResponse { int id; String name; String? description; String icon; bool isActive; int displayOrder; }`
- `ProductResponse { int id; String name; String? description; double price; int categoryId; String icon; String? imageUrl; bool isFeatured; bool isAvailable; DateTime createdAt; CategoryResponse? category; }`
- `CategoryCreate/Update`, `ProductCreate/Update` (admin write DTOs, optional fields omit-unset)

**Cart (local)**
- `CartItem { ProductResponse product; int quantity; }`
- `OrderItemCreate { int productId; int quantity; }`

**Orders**
- `OrderCreate { List<OrderItemCreate> items; String deliveryAddress; String paymentMethod='efectivo'; String? notes; String? couponCode; }`
- `OrderItemResponse { int id; int productId; String productName; int quantity; double unitPrice; double subtotal; }`
- `OrderTimelineResponse { int id; String status; String title; String? description; DateTime timestamp; }`
- `OrderResponse { int id; String orderNumber; int customerId; int? deliveryDriverId; String status; double subtotal; double deliveryFee; double tax; double total; String paymentMethod; String deliveryAddress; String? notes; DateTime createdAt; DateTime updatedAt; List<OrderItemResponse> items; List<OrderTimelineResponse> timeline; String? customerName; String? customerPhone; String? driverName; String? driverPhone; }`
- `CalculateFeeResponse { double fee; double? distanceKm; double base; double perKm; double min; double max; double? rawFee; RestaurantInfo restaurant; String? note; }`
- `OrderTracking { int orderId; String orderNumber; String status; int? driverId; String? driverName; String? driverPhone; double? driverLatitude; double? driverLongitude; String? driverZone; String? driverVehicleType; DateTime? driverUpdatedAt; String deliveryAddress; bool isActive; }`

**Delivery / driver**
- `NearbyOrder { int id; String orderNumber; String status; String deliveryAddress; double total; double deliveryFee; String paymentMethod; DateTime createdAt; }`
- `EarningsSummary { double today, thisWeek, thisMonth, total; int deliveriesToday, deliveriesTotal; }`
- `DriverStatsResponse { int deliveriesToday, deliveriesCompleted; double earningsToday, averageRating, punctuality, satisfaction, efficiency; }`
- `DriverProfile` (admin roster): all `/delivery/drivers` fields — `id, userId, fullName, email, phone, documentId, birthDate, gender, homeAddress, homeDistrict, emergencyContact{name,phone,relation}, vehicle{type,brand,model,year,color,plate}, license{number,expiry}, insurance{number,expiry}, bank{name,accountType,account,cci,accountHolder}, isAvailable, latitude?, longitude?, currentZone, totalDeliveries, averageRating, totalEarnings`

**Address / Review / Coupon / Dashboards**
- `AddressResponse { int id; int userId; String label; String fullAddress; String? reference; String? district; String? city; double? latitude; double? longitude; bool isDefault; DateTime createdAt; }` + `AddressCreate/Update`
- `ReviewCreate { int orderId; double rating; String? comment; }`; `ReviewResponse { int id; int orderId; int customerId; int? driverId; double rating; String? comment; DateTime createdAt; String? customerName; }`
- `CouponResponse { int id; String code; String? description; double? discountPercent; double? discountAmount; double minOrderAmount; int maxUses; int currentUses; bool isActive; DateTime? expiresAt; DateTime createdAt; }`; `CouponApplyResponse { bool valid; double discount; String message; }`
- `AdminDashboard`, `CustomerDashboard` (per §2.9 fields)

**Map**
- `LatLng` (latlong2). `GeocodeResult { double lat, lon; String displayName; Map address; }`. `MapPinModel { LatLng point; String? label; Color? color; }`. `TileStyle { TileStyleId id; String label, description, emoji, url, attribution; int maxZoom; String? subdomains; }`.

---

## 4. Auth Flow (JWT + refresh, role-based home)

**Token model.** HS256 JWT. Access (60 min) and refresh (7 days). Claims: `sub`(user id), `role`, `exp`, `type`(`access`|`refresh`). No server revocation — logout is client-only.

**Storage.** Use `flutter_secure_storage` (Keychain/Keystore) — do NOT replicate web `localStorage`. Persist: `accessToken`, `refreshToken`, `userId`, `role`, `fullName`. Selected tile style → `shared_preferences` key `chikenhot-map-style`.

**Login sequence.**
1. Clear prior session + cart + favorites (mirror web: avoid leaking previous-user state).
2. `POST /auth/login/json {email, password}` → `TokenResponse`.
3. Persist tokens to secure storage; set Riverpod `authProvider`.
4. **Role-based navigation** via `defaultHomeForRole(role)`: `admin → /admin`, `delivery_driver → /delivery`, else `/`. If `ProtectedRoute` captured a `from` redirect (customer kicked to login), return there.

**Registration.** `/auth/register` (customer, role injected) or `/auth/register-driver` (4-step wizard) → both return tokens → auto-login → role home.

**Dio interceptor — auto-refresh (replicate exactly):**
- Attach `Authorization: Bearer <accessToken>` to every request.
- On **401**: refresh **once per request** (`_retry` flag), **dedupe concurrent refreshes via a single shared `Future`** (one in-flight refresh shared by all 401s). Use a **raw Dio instance (no interceptor)** for the refresh call to avoid recursion. `POST /auth/refresh {refresh_token}` → store new pair → retry original. If refresh fails → logout + redirect `/login`.
- Quick-login demo buttons (login screen): Admin/Cliente/Repartidor (see §8).

**Route guards (go_router redirect):**
- Wait for secure-storage **hydration** before any redirect (avoid logging out valid sessions on cold start) — show splash/spinner.
- `ProtectedRoute` group (token-only): `/checkout, /orders, /orders/:id, /profile, /addresses, /reviews`. No token → `/login` carrying `from`.
- `RoleGuard(allow:[...])`: `/admin/**` (admin), `/delivery/**` (driver). No token → `/login`; wrong role → `defaultHomeForRole(role)` (bounce to OWN home, not `/login`).
- Catch-all unknown → `/`.

> Known backend behaviors to be aware of (do not "fix", just handle UI): any authenticated role can `POST /orders`; `get_current_user` doesn't check token `type` (a refresh token would authenticate at protected endpoints).

---

## 5. Full Screen Inventory + Feature Checklist (verify nothing missing)

> Total **26 screens**. Each box must be implemented and verified. Use go_router with three shells: `CustomerShell`, `DriverShell` (bottom nav + GPS reporter + availability toggle), `AdminShell` (drawer/sidebar).

### 5.1 Auth (3 screens, no shell)

**LoginPage** `/login`
- [ ] Email + password fields (disabled while loading), submit `Iniciar sesión` w/ spinner
- [ ] Quick-login 3 demo accounts (pre-fill + immediate login): Admin / Cliente / Repartidor
- [ ] Active-session banner if already logged in (full_name + role, "Ir a mi panel", "Cerrar sesión")
- [ ] Clears auth+cart+favorites before each attempt
- [ ] Inline error box; links to `/register`, `/register-driver`
- API: `POST /auth/login/json`

**RegisterPage** `/register`
- [ ] full_name, email, phone(optional), password(min 6); submit `Crear cuenta`
- [ ] On success → `/` (catalog); role `customer` injected
- API: `POST /auth/register`

**DriverRegisterPage** `/register-driver` (4-step wizard)
- [ ] Stepper: **Cuenta / Personal / Vehículo / Banco** + progress + per-step validation
- [ ] Step1: full_name≥3, valid email, password≥6 + confirm match, phone≥6
- [ ] Step2: document_id≥6, birth_date required, gender radios, home address/district, emergency contact
- [ ] Step3: vehicle_type required; vehicle_plate≥3 required unless `bicicleta`; brand/model/year/color; optional license + insurance
- [ ] Step4: bank name, account type (ahorros/corriente), account, CCI, holder
- [ ] Builds payload omitting empty optionals; on success → `/delivery`
- API: `POST /auth/register-driver`

### 5.2 Customer (11 screens, `CustomerShell`)

**CatalogPage** `/` (home)
- [ ] Hero banner; search box (trimmed, live filter); category chips ("Todos ✨" + per-category icon+name, active highlight)
- [ ] Featured section "⭐ Destacados" (first 3 `is_featured`) — only when no search & no category
- [ ] Product grid; ProductCard (image/emoji, name→detail, desc line-clamp-2, price, "Añadir", favorite heart toggle)
- [ ] Loading spinner; empty "No se encontraron productos"; error box
- API: `GET /products/categories` (once), `GET /products?category_id&search&limit=100` (on filter change)

**ProductDetailPage** `/products/:id`
- [ ] Back "Volver al menú"; image/emoji; category badge; name/desc/price
- [ ] Quantity stepper (min 1); "Añadir al carrito · {price×qty}" → add then go `/cart`; disabled "No disponible" when unavailable
- [ ] Loading + error/not-found state
- API: `GET /products/:id`

**CartPage** `/cart` (local)
- [ ] Line items (icon, name, unit price c/u, stepper, line total, remove); qty≤0 removes
- [ ] Sticky summary: Subtotal (bold) + note "delivery/IGV calculated at checkout"
- [ ] "Continuar al pago" → `/login`(from=`/checkout`) if no token, else `/checkout`; "Seguir comprando"
- [ ] Empty state "Tu carrito está vacío"
- Local store only (persist cart)

**CheckoutPage** `/checkout` (protected)
- [ ] On mount refresh each item price (`GET /products/:id`), replace stale; amber warning if any changed
- [ ] Saved-address radio list (label, "Predet." badge, full_address, reference); default auto-selected
- [ ] "Usar ubicación nueva (mapa)" → LocationPicker + "Referencia/detalle" input
- [ ] Payment selector: efectivo💵 / yape📱 / tarjeta💳 (default efectivo)
- [ ] Notes textarea; coupon input (uppercased) + "Aplicar" (spinner) → applied chip/-discount/remove, or error
- [ ] Sticky summary: per-item lines, Subtotal, Delivery (spinner + distance note + min/max annotation), IGV 18%, Discount(green), Total
- [ ] Fee recalculated on location change; fallback S/5; tax=subtotal×0.18; total=max(0, subtotal+fee+tax-discount)
- [ ] "Gestionar direcciones"→`/addresses`; "Confirmar pedido"→build `delivery_address` (see §6 coords), place, clear cart, go `/orders/:id`
- [ ] Validation "Selecciona una dirección o ubica tu entrega en el mapa"; empty-cart guard
- API: `GET /products/:id`(per item), `GET /addresses`, `POST /orders/calculate-fee`, `POST /coupons/apply`, `POST /orders`

**OrdersPage** `/orders` (protected)
- [ ] Order cards (→detail): order_number, status badge, date, item count, total, payment_method
- [ ] Loading; empty "Aún no tienes pedidos"; error
- API: `GET /orders`

**OrderDetailPage** `/orders/:id` (protected)
- [ ] Header (order_number, date, status badge); **LiveOrderMap** (refresh 10s) only when active
- [ ] Items list; timeline "Seguimiento"; summary (Subtotal/Delivery/IGV/Total); delivery info (address, payment, driver name+phone)
- [ ] "Descargar factura" (PDF) — see §10 mobile handling
- [ ] "Calificar pedido" (only delivered & not reviewed) → review modal (StarRating 1-5 + label, comment, submit) → success banner
- [ ] "Cancelar pedido" (only pending/accepted/preparing) → confirm dialog → cancel in place
- API: `GET /orders/:id`, `PATCH /orders/:id/cancel`, `GET /orders/:id/invoice`, `POST /reviews`, (tracking via map)

**AddressesPage** `/addresses` (protected)
- [ ] "Nueva dirección" → create modal (empty: label Casa, city Lima)
- [ ] Address cards: label-icon, label, "Predeterminada" badge, full_address, reference, district/city
- [ ] Per-card Edit (prefilled modal), Delete (confirm), "Marcar como predeterminada"
- [ ] Modal: type selector (Casa/Trabajo/Familia/Otro), LocationPicker (fills full_address+lat+lon via reverse geocode), Distrito, Ciudad, Referencia, default checkbox; submit disabled until full_address
- [ ] Loading; empty "Aún no has guardado direcciones"; error
- API: `GET/POST/PUT/DELETE /addresses`

**FavoritesPage** `/favorites` (local)
- [ ] Grid (image/emoji, name→detail, desc, price); add-to-cart (+), remove (trash); header "❤️ Mis favoritos (N)"; empty state
- Local store only (persist favorites)

**ReviewsPage** `/reviews` (protected)
- [ ] Review cards: "Pedido #order_id"→detail, date, StarRating readonly, comment; loading; empty; error
- API: `GET /reviews/my`

**ProfilePage** `/profile` (protected)
- [ ] Avatar (initial), full_name, "Cliente desde {date}"; info grid Email/Teléfono/Rol
- [ ] Loyalty card: membership_level badge (color by tier), points (large); read-only
- API: `GET /auth/me`

### 5.3 Driver (8 screens, `DriverShell`)

> **DriverShell** provides: sticky header (brand, **availability toggle** Power button, logout, "Hola, {fullName}"), bottom nav (Inicio/Mapa/Pedidos/Ganancias/Rating), and the **background GPS reporter** (§6). Availability optimistically `true` on mount.

**DriverDashboardPage** `/delivery` (index)
- [ ] 4 StatCards: Ganancias hoy, Entregas hoy, Rating(toFixed1 or "—"), Eficiencia%
- [ ] Earnings card: Hoy/Semana/Mes/Total; 2 shortcut cards → available & my-orders
- [ ] Read-only (no actions); loading; error
- API: `GET /dashboard/driver` + `GET /delivery/earnings` (parallel)

**DriverAvailablePage** `/delivery/available` (reachable via links, not bottom nav)
- [ ] Order cards (order_number, date, delivery_fee="Ganancia", address, payment, total)
- [ ] "Aceptar pedido" → accept → go `/delivery/my-orders/:id`; per-row spinner; manual refresh; count header; empty "🕑 No hay pedidos disponibles"
- API: `GET /delivery/nearby-orders`, `POST /delivery/accept/{id}`

**DriverMapPage** `/delivery/map`
- [ ] Leaflet/flutter_map of nearby orders w/ coords; "Mi ubicación" (one-shot getCurrentPosition, centering only — NOT GPS report)
- [ ] Haversine distance from myPos; radius slider 1-20km (default 10) filters+sorts; marker color <2km green/<5km orange/else red; driver blue "me" marker
- [ ] FlyToOnce (recenter only when moved >~50m); only orders with embedded coords placed; manual refresh
- [ ] Accept from popup or bottom shortlist (top 5) → go detail
- API: `GET /delivery/nearby-orders`, `POST /delivery/accept/{id}`, device GPS

**DriverMyOrdersPage** `/delivery/my-orders`
- [ ] Split Active (not delivered/canceled) + History (≤20); rows: order_number, status badge, date, delivery_fee="delivery", chevron → detail
- [ ] Active empty state → link to available
- API: `GET /orders` (driver-scoped)

**DriverOrderDetailPage** `/delivery/my-orders/:id`
- [ ] **Auto-poll `GET /orders/:id` every 10s while active** (stops on delivered/canceled); mounted guard
- [ ] LiveOrderMap (refresh 10s) when address has coords; deep links "Abrir en Google Maps" (`maps/dir?destination=lat,lng&travelmode=driving`) + "Abrir en Waze" (`waze.com/ul?ll=lat,lon&navigate=yes`)
- [ ] Customer card: name, tap-to-call (`tel:`), address, payment (orange "Cobrar {total}" if efectivo), notes
- [ ] Items + Total a cobrar; timeline checklist
- [ ] **pickUp()** when `ready` → `PATCH /orders/:id/status {status:'on_the_way'}` ("Recoger y salir en ruta"); **complete()** when `on_the_way` → `PATCH /delivery/complete/:id` ("Marcar como entregado") then refetch
- API: `GET /orders/:id`, `PATCH /orders/:id/status`, `PATCH /delivery/complete/:id`, tracking via map

**DriverEarningsPage** `/delivery/earnings`
- [ ] Hero "Total acumulado" + "{deliveries_total} entregas"; StatCards Hoy/Semana/Mes/Total entregas; read-only
- API: `GET /delivery/earnings`

**DriverRatingsPage** `/delivery/ratings`
- [ ] Compute avg/total/5→1 star distribution client-side; summary (big avg, readonly stars, distribution bars); recent reviews (sorted desc, stars, date, comment, "Pedido #id"); empty state
- API: `GET /reviews/driver/{authUserId}`

### 5.4 Admin (7 screens, `AdminShell`)

> **AdminShell**: sidebar/drawer nav (Dashboard/Pedidos/Productos/Usuarios/Repartidores/Cupones) + fullName + logout. `/admin/orders/:id` reached by drill-in only.

**AdminDashboardPage** `/admin`
- [ ] StatCards: Pedidos hoy(+trend%), Ingresos hoy(+trend%, success), Pedidos pendientes(warning), Usuarios activos, Repartidores(hint "N disponibles"), Disponibles ahora(success); read-only; no poll
- API: `GET /dashboard/admin`

**AdminOrdersPage** `/admin/orders`
- [ ] Status filter pills (Todos + 7 statuses) re-fetch; manual refresh; table (Pedido mono, Cliente name+phone, Estado badge, Total, Fecha); "Ver →"→detail; empty/loading/error
- API: `GET /orders?status=<s>` (omit when all)

**AdminOrderDetailPage** `/admin/orders/:id`
- [ ] Admin transitions `NEXT_STATUSES_ADMIN`: pending→accepted/canceled, accepted→preparing/canceled, preparing→ready/canceled (ready+ → no admin action, blue info "driver owns flow"); canceled btn danger
- [ ] No driver-assignment UI (drivers self-accept); display driver_name if set
- [ ] LiveOrderMap (10s) when active; items; timeline; Cliente card; Resumen; manual refresh + **auto-poll 15s while active**
- API: `GET /orders/:id`, `PATCH /orders/:id/status`

**AdminProductsPage** `/admin/products` (2 tabs)
- [ ] Tab "Productos (N)": table (icon, name+Destacado badge, category, price, Activo/Inactivo, actions); create/edit modal (name, price, icon, category select [active only], description, image_url, is_featured, is_available); inline Power toggle `is_available`
- [ ] Tab "Categorías (N)": card grid (icon, name, product count, display_order, description, Inactiva badge); create/edit modal (name, icon, display_order, description, is_active); trash → confirm warning "N products will deactivate" (disabled if inactive)
- API: `GET /products?include_inactive=true&limit=500`, `GET /products/categories?include_inactive=true`, `POST/PUT /products`, `POST/PUT/DELETE /products/categories`

**AdminUsersPage** `/admin/users`
- [ ] 6 stat cards (Total/Activos/Clientes/Repartidores/Admins/Nuevos semana); search (name/email); role select (Todos/Clientes/Repartidores/Admins); both re-fetch (limit 100)
- [ ] Table (Usuario name+email, Rol badge, Estado badge, Registro date, action); activate/deactivate via confirm → `PUT`; inactive rows opacity-60
- API: `GET /users?role&search&limit=100`, `GET /users/stats`, `PUT /users/:id {is_active}`

**AdminDriversPage** `/admin/drivers` (2 tabs)
- [ ] Tab "Lista": cards (vehicle emoji, name, phone/email, Disponible/Offline badge, mini-stats total_deliveries/rating/earnings, vehicle brand/model/plate) → detail modal
- [ ] Tab "Mapa": flutter_map markers green=available/gray=offline (only located drivers), popup name/phone + "Ver detalle"; empty state
- [ ] Detail modal (read-only): header, 3 KPIs, sections Datos personales / Emergencia / Vehículo / Bancaria / Última ubicación; em-dash for empty
- API: `GET /delivery/drivers`

**AdminCouponsPage** `/admin/coupons`
- [ ] Card grid: code mono, Activo/Inactivo badge, description, big discount (% or S/), min_order, "current/max" usage, expiry
- [ ] "Nuevo cupón" → modal (code uppercased, description, % OR S/ [mutually exclusive — entering one clears other], min order, max uses); create only; empty "No hay cupones activos"
- API: `GET /coupons`, `POST /coupons`

---

## 6. Map & Live-Tracking Spec (concrete, flutter_map 8.x)

**Packages:** `flutter_map: ^8.3.0`, `latlong2: ^0.9.1`, `geolocator: ^14.0.2`, `dio` (tracking + Nominatim), `shared_preferences` (tile style), `url_launcher` (tap-to-call + Google Maps/Waze deep links). Optional `flutter_map_cancellable_tile_provider` (tile cancellation), `flutter_map_marker_popup` (popups), `flutter_map_animations` (0.6s fly). No routed polylines — keep straight dashed line.

### 6.1 Tile layer (BaseTileLayer equivalent)
Const map of 4 styles, persisted to `shared_preferences` key `chikenhot-map-style` (default `voyager`). Hold selected style in a Riverpod provider so all maps rebuild on change (web "map-style-changed" event equivalent).

```
voyager  (default 🗺️): https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png  subdomains:'abcd' maxZoom:20  (OSM © + CARTO ©)
positron (🤍):        https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png            subdomains:'abcd' maxZoom:20
dark     (🌙):        https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png             subdomains:'abcd' maxZoom:20
satellite(🛰️):       https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}  NO {s} NO {r}, order z/y/x, maxZoom:19  (Esri ©)
```
`TileLayer(urlTemplate: cfg.url, subdomains: cfg.subdomains?.split('') ?? const [], maxZoom: cfg.maxZoom.toDouble(), userAgentPackageName: 'com.chikenhot.app', retinaMode: RetinaMode.isHighDensity(context))`. flutter_map resolves `{r}` only when `retinaMode` set; satellite passes **empty subdomains** and z/y/x order works as-is. Add `RichAttributionWidget` showing `cfg.attribution`. Provide a `TileStyleSwitcher` floating button (current emoji+label, dropdown of all 4, persists + rebuilds).

### 6.2 LiveOrderMap (customer + admin + driver-detail)
Props: `{int orderId, int refreshSeconds=5 (10 in detail screens), double height=320}`.

**Polling:** immediate `fetchOnce()` in initState, then `Timer.periodic(Duration(seconds: refreshSeconds), …)`. On any response with `is_active==false` → `timer.cancel()` (stop burning network). Cancel timer in dispose; guard `setState` with `mounted`.

**Destination resolution (two ways):**
1. Regex `RegExp(r'\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)')` on `delivery_address` → `dest = LatLng(double.parse(m[1]), double.parse(m[2]))`.
2. If no embedded coords → `cleanAddress()` (strip coords token, strip `[label] —/-` prefixes, convert ` — ` → `, `) then `searchAddress(cleaned)` → take `results.first`. Re-run only when the address string actually changes.

**Driver point:** `LatLng(driver_latitude, driver_longitude)` only when both non-null.

**Center precedence:** driver → dest → `LatLng(-12.0464, -77.0428)`. Initial zoom 14, scroll-wheel zoom disabled: `InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.scrollWheelZoom)`.

**Markers (`MarkerLayer`):**
- **Destination:** width 36 / height 42, `alignment: Alignment.topCenter` (anchor bottom-center). Orange teardrop `#f25f05` stroke white, white center circle r6. SVG path `M15 0 C7 0 0 7 0 15 c0 11 15 27 15 27 s15-16 15-27 C30 7 23 0 15 0 z` (use `flutter_svg` or `CustomPaint`). Popup "📍 Destino de entrega".
- **Driver:** width 46 / height 46, `alignment: Alignment.center`. Stack: pulsing outer circle `#3b82f6` opacity .25 scaling 1→1.8 over 2s (`AnimationController`/`TweenAnimationBuilder` repeat), inner 36px circle `#3b82f6` 3px white border + scooter glyph 🛵. Popup `driver_name` + optional `driver_phone`.

**Polyline (`PolylineLayer`):** `Polyline(points:[driver, dest], color: Color(0xFF3B82F6).withOpacity(0.7), strokeWidth: 3, pattern: StrokePattern.dashed(segments: const [8, 6]))`. Only when both points exist. Straight 2-point line (NOT routed).

**AutoFit** (after each fetch; needs map laid out — call inside `addPostFrameCallback` or after `onMapReady`, wrapped in try/catch; validate `lat.isFinite && lon.isFinite`):
- both valid & ~equal (abs diff < 1e-6) → `mapController.move(driver, 16)`
- both valid & different → `mapController.fitCamera(CameraFit.bounds(bounds: LatLngBounds(dest, driver), padding: EdgeInsets.all(50), maxZoom: 16))`
- only driver → `move(driver, 15)`; only dest → `move(dest, 15)`

**ETA banner:** `const speeds = {'moto':30.0,'bicicleta':15.0,'auto':25.0}`, default 25. `km = haversineKm(driver,dest)` (R=6371, or `latlong2 Distance().as(LengthUnit.Kilometer, …)`). `minutes = km/speed*60`. `formatEta`: `<1 → 'Llegando'`, `<60 → '${round} min'`, else `'${h} h'` or `'${h} h ${m} min'`. Distance label `km.toStringAsFixed(2)+' km'`. Tone: on_the_way=green, delivered=neutral ("—"), else blue. If active but no driver point → amber "Esperando ubicación del repartidor…". No ETA field comes from backend — computed client-side.

**"En vivo" badge:** `Positioned` top-right `Stack` overlay, pulsing green dot + "En vivo", only when `is_active`.

**Refresh footer (separate small widget, own 1s `Timer.periodic` so it doesn't rebuild FlutterMap):** `age = now - DateTime.parse(driver_updated_at)` → `timeAgoSec`: `<5 'ahora'`, `<60 'hace Ns'`, else `'hace M min'` → "GPS del repartidor: {…}". `countdown = max(0, refreshSeconds - elapsed)` → "Actualiza en Ns".

**Loading → spinner box; error/no-data → dashed placeholder.**

### 6.3 LocationPicker (checkout + addresses)
`FlutterMap` zoom 16, interactions enabled, draggable marker + `MapOptions.onTap(point)` to set position. On every position change: debounce **500ms** → `reverseGeocode(lat,lon)` → emit `Location{lat, lon, address: formatShortAddress(r)}`. Search box: debounce **400ms**, min 3 chars → `searchAddress` dropdown (formatShortAddress + display_name) → pick sets position + clears search. "Mi ubicación": `Geolocator.getCurrentPosition(accuracy high, timeLimit 10s)` → `mapController.move(pos, zoom)`. Footer: resolved address + `lat/lon.toStringAsFixed(6)`. Sync position from parent `value` (delta>1e-6 guard).

### 6.4 StaticMap (admin drivers map)
Non-interactive (`InteractiveFlag.none`). Colored teardrop markers green `#10b981`/orange `#f97316`/red `#ef4444`/blue `#3b82f6` (default orange), optional popup label. Fit: 0 pins noop; 1 pin `move(pin,15)`; >1 `fitCamera(CameraFit.bounds(LatLngBounds.fromPoints(pins), padding: EdgeInsets.all(40)))`.

### 6.5 Driver background GPS reporter (replaces `useDriverLocationReporter`)
Wired in DriverShell, active only while availability == "Disponible". `intervalSeconds = 15`. **Recursive scheduler (NOT periodic timer):**
```
Future<void> tick() async {
  if (_cancelled) return;
  await reportReal();                    // drop fallback on mobile
  _timer = Timer(Duration(seconds: 15), tick);
}
```
- **Permissions:** `Geolocator.isLocationServiceEnabled()`, `checkPermission()`/`requestPermission()`. Configure background location: Android foreground service + `ACCESS_FINE_LOCATION` + `ACCESS_BACKGROUND_LOCATION`; iOS `NSLocationWhenInUseUsageDescription` + `NSLocationAlwaysAndWhenInUseUsageDescription` + Background Modes (location).
- **reportReal:** `pos = await Geolocator.getCurrentPosition(locationSettings: LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 8)))` → `PATCH /delivery/location {latitude: pos.latitude, longitude: pos.longitude}` (no zone). Returns false on error.
- **DROP the web random-jitter fallback** (`zone:'Lima Centro (demo)'`) entirely — real devices have GPS.
- **Lifecycle:** start when toggled available; set `_cancelled=true` + cancel timer when unavailable / on dispose. Pause when app backgrounded (battery) via `WidgetsBindingObserver`. The reported location surfaces back to customers via `driver_updated_at` in tracking — closing the loop.

### 6.6 Geocoding (Nominatim — replaces geocoding.ts)
Provider: `https://nominatim.openstreetmap.org`, no key, 1 req/sec policy. **MUST set headers** `User-Agent: 'Chikenhot/1.0 (contact@chikenhot.pe)'` (Nominatim blocks non-browser clients without a real UA) and `Accept-Language: es`.
- **searchAddress(q):** trim; return `[]` if <3 chars. `GET /search?q={q}&format=json&addressdetails=1&limit=5&countrycodes=pe`. Map → `{lat, lon, display_name, address}`.
- **reverseGeocode(lat,lon):** `GET /reverse?lat=&lon=&format=json&addressdetails=1`. Return null if no `display_name`.
- **formatShortAddress(r):** `[road+' '+house_number, suburb||neighbourhood, city||town].where(nonEmpty).join(', ')` ?? `display_name`.
- **Debounce + cancellation:** 400ms search / 500ms reverse, with a `Timer` cancelled on each new input + ignore stale responses via request-sequence id (or dio `CancelToken`).

### 6.7 ⚠ Coordinate-embedding contract (LOAD-BEARING — replicate exactly)
When creating an order, build `delivery_address` by joining parts with `' — '` (space, em-dash **U+2014**, space) and append coords token as the **last** part: `'(${lat.toStringAsFixed(6)}, ${lon.toStringAsFixed(6)})'`.
- **Saved address parts:** optional `'[label]'`, `full_address`, `reference`, `'(lat, lon)'`.
- **New picked location parts:** `location.address`, `addressDetail`, `'(lat, lon)'`.
- Example literal: `'Av Larco 123 — Depto 5 — (-12.046400, -77.042800)'`.
- **If the app omits this suffix, the delivery fee silently falls back to S/5.00** and the tracking map can't place the destination without geocoding. Exactly 6 decimals, comma+space between lat/lon, wrapped in parentheses.

---

## 7. Flutter Project Structure + Packages + State Management

**State management: Riverpod** (`flutter_riverpod: ^3.3.2` — already pinned). Routing: **go_router** (`^17.2.3`). HTTP: **dio** (`^5.9.2`). These match the existing scaffold `pubspec.yaml`.

**Package list (from existing `mobile/pubspec.yaml`, confirmed):**
`dio ^5.9.2` · `flutter_riverpod ^3.3.2` · `go_router ^17.2.3` · `flutter_map ^8.3.0` · `latlong2 ^0.9.1` · `geolocator ^14.0.2` · `flutter_secure_storage ^10.3.1` · `shared_preferences ^2.5.5` · `intl ^0.20.3` · `cached_network_image ^3.4.1` · `cupertino_icons ^1.0.8`.

**Add to pubspec:** `url_launcher` (tel:/Google Maps/Waze), `flutter_svg` (teardrop marker), and choose one of: in-app PDF (`open_filex` + temp file, or `printing`/`pdfx`) for the invoice (§10). Optional: `flutter_map_marker_popup`, `flutter_map_cancellable_tile_provider`, `flutter_map_animations`.

**Suggested structure** (`lib/`):
```
lib/
  main.dart
  core/
    config.dart            (AppConfig: base url, tax, fee constants, restaurant origin)
    constants.dart         (enum value maps, Spanish status labels, membership colors)
    theme.dart             (brand colors, status badge styling)
  data/
    api/
      dio_client.dart      (dio + auth interceptor + dedup refresh)
      endpoints.dart
    models/                (all DTOs from §3, one file per domain group)
    repositories/
      auth_repository.dart
      product_repository.dart
      order_repository.dart
      delivery_repository.dart
      address_repository.dart
      review_repository.dart
      coupon_repository.dart
      dashboard_repository.dart
      tracking_repository.dart
      geocoding_repository.dart
  features/
    auth/        (login, register, driver_register wizard + providers)
    customer/    (catalog, product_detail, cart, checkout, orders, order_detail, addresses, favorites, reviews, profile)
    driver/      (shell, dashboard, available, map, my_orders, order_detail, earnings, ratings)
    admin/       (shell, dashboard, orders, order_detail, products, users, drivers, coupons)
  shared/
    providers/
      auth_provider.dart       (StateNotifier<AuthState>, secure-storage hydration)
      cart_provider.dart       (persisted cart)
      favorites_provider.dart  (persisted favorites)
      tile_style_provider.dart (shared_preferences)
    widgets/
      live_order_map.dart
      location_picker.dart
      static_map.dart
      base_tile_layer.dart
      tile_style_switcher.dart
      order_status_badge.dart
      star_rating.dart
      stat_card.dart
    services/
      driver_location_reporter.dart
      money.dart               (formatCurrency S/)
  router/
    app_router.dart        (go_router, ProtectedRoute redirect, RoleGuard redirect, defaultHomeForRole)
    shells/                (customer_shell, driver_shell, admin_shell)
```

**Cross-cutting:** `formatCurrency` → `S/ ` + 2 decimals (intl `NumberFormat`). Cart/favorites persisted via `shared_preferences` (JSON). All money rounded at display boundary (backend uses double).

---

## 8. Seed Test Credentials

Domain `@chikenhot.pe`. Seed is idempotent (skipped if users table non-empty).

| Role | Email | Password |
|---|---|---|
| Admin | `admin@chikenhot.pe` | `admin123` |
| Customer | `cliente@chikenhot.pe` | `cliente123` (points=450, level=PLATA) |
| Driver | `delivery@chikenhot.pe` | `delivery123` |
| Driver | `luis@chikenhot.pe` | `delivery123` |
| Driver | `juan.p@chikenhot.pe` | `delivery123` |
| Driver | `carlos@chikenhot.pe` | `delivery123` |

**Quick-login buttons** (LoginPage): Admin / Cliente / Repartidor → use `admin@`, `cliente@`, `delivery@`.
**Seed data:** 5 categories (Pollos, Combos, Alitas, Bebidas, Extras), 16 products, 4 driver profiles, 2 customer addresses, 3 coupons: `BIENVENIDO` (10%, min 30, max 100), `POLLO5` (S/5, min 25, max 50), `DELIVERY0` (S/5 flat, min 50, max 30).

---

## 9. Build Order / Milestones

The `mobile/` scaffold + package pins already exist — start at M0 wiring, not project init.

- **M0 — Foundation:** `AppConfig` + `--dart-define` base URL; dio client + auth interceptor (Bearer + dedup refresh + 401 retry); secure-storage auth provider with hydration splash; all DTO models (§3) + enums; `formatCurrency`. Verify against running backend with `/auth/login/json`.
- **M1 — Auth & routing:** Login (+quick-login), Register, DriverRegister 4-step wizard; go_router with ProtectedRoute + RoleGuard + role-based home; logout. Verify all 3 seed roles land on correct home.
- **M2 — Customer catalog + cart:** Catalog (categories/products/search/featured/favorites), ProductDetail, Cart (persisted), Favorites (persisted), Profile. No map yet.
- **M3 — Map infrastructure:** TileStyle provider + BaseTileLayer + TileStyleSwitcher; LocationPicker; geocoding repo (Nominatim + UA + debounce); StaticMap. This unblocks checkout + addresses + tracking.
- **M4 — Addresses + Checkout + Orders:** Addresses CRUD (map picker), Checkout (price-refresh, fee calc, coupon, **coords-embedding contract §6.7**, place order), Orders list, OrderDetail (timeline, summary, cancel, review modal, invoice download).
- **M5 — Live tracking:** LiveOrderMap (polling, dest resolution, markers, polyline, autofit, ETA, en-vivo badge, refresh footer). Wire into customer OrderDetail.
- **M6 — Driver app:** DriverShell (bottom nav, availability toggle, **background GPS reporter §6.5** + permissions), Dashboard, Available, MyOrders, OrderDetail (pickUp/complete, 10s poll, deep links, tap-to-call), DriverMap (radius filter), Earnings, Ratings.
- **M7 — Admin app:** AdminShell, Dashboard, Orders + OrderDetail (transitions, 15s poll), Products (2 tabs CRUD), Users (stats, search, activate toggle), Drivers (list + map + detail modal), Coupons (list + create).
- **M8 — Hardening:** lifecycle-aware polling (pause when backgrounded), permission denied states, error/empty states everywhere, PDF invoice handling, iOS/Android permission strings, build flavors (dev/prod base URL), end-to-end role walkthroughs against seed data.

---

## 10. Risks & Web-Only Features to Adapt

| Concern | Web behavior | Flutter adaptation |
|---|---|---|
| **Token storage** | `localStorage` (`chikenhot-auth`, XSS risk) | `flutter_secure_storage` (Keychain/Keystore) — strictly better; do NOT replicate localStorage |
| **"Real-time" = polling** | `setInterval` tracking ~5s, driver detail 10s, admin detail 15s | Use `Timer.periodic`/recursive timers; **pause when app backgrounded** (battery/metered data); no WebSocket/SSE in backend — can't switch to push without backend work |
| **Driver GPS reporting** | Browser `setTimeout` while page open | **Background location** permission + Android foreground service + iOS background modes; page-open assumption breaks. Drop random-jitter demo fallback |
| **PDF invoice** | Browser download of `application/pdf` | No browser download. Fetch blob (dio `responseType: bytes`) → write temp file → open via `open_filex`/`printing` viewer or share-sheet. ⚠ Backend `reportlab` may not be in requirements — `GET /orders/:id/invoice` can 500 if not installed; handle gracefully |
| **Maps stack** | Leaflet + react-leaflet + Nominatim + OSM tiles | `flutter_map`. Reimplement Nominatim debounce + cancellation; **set real User-Agent** (required on non-browser clients); respect 1 req/s |
| **`(lat, lon)` suffix** | Frontend appends; backend regex-parses | MUST replicate exactly (§6.7) or fee silently → S/5.00 and tracking dest fails. Load-bearing implicit contract |
| **Hard reload after login** | `window.location.assign` to re-render with role | No equivalent — handle via go_router redirect + provider rebuild |
| **Geolocation permission** | `Permissions-Policy` header | Native runtime prompts; handle denied/service-disabled states; add iOS Info.plist + Android manifest strings |
| **Push notifications** | None (only a future suggestion) | NET-NEW feature, no backend support — **out of scope** unless backend extended |
| **CORS / `/api` proxy** | Vite proxies `/api`→:8000 | Hit absolute API base URL via `--dart-define`; CORS irrelevant to native. Android emulator → `10.0.2.2`, iOS sim → `localhost`, device → LAN/host IP |
| **Map/geocoding rate limits** | OSM/Nominatim free | At scale may need self-hosted/paid tiles + geocoder; respect attribution + usage policy |
| **Coupon `/apply` always 200** | Validity in body `valid` flag | Don't treat as HTTP error — read `valid`/`message` |
| **Driver stats hardcoded** | `punctuality=95, satisfaction=92, efficiency=88`, `deliveries_today = real+4`, `average_rating` fallback 4.8 | Display as-is (synthetic demo values; do not compute) |
| **Points/membership static** | No accrual/upgrade logic anywhere | Read-only display in dashboard/profile; never expect mutation |
| **Cancel endpoint not role-gated** | Driver not blocked from `/orders/:id/cancel` | Only expose cancel UI to customer (own, pending/accepted/preparing) + admin, matching web |
| **Two acceptance systems** | Legacy static HTML proximity-radius prototype exists (`SISTEMA_ACEPTACION_PEDIDOS.md`) | **Ignore it.** Real backend uses round-robin auto-assignment + `/delivery/nearby-orders` + `/delivery/accept`. The 5km radius/urgency/3-5s localStorage polling are legacy-only and NOT backed by the API (DriverMapPage's radius slider is purely client-side UX over real nearby-orders) |

**Key load-bearing invariants to never break:** (1) coords suffix `(lat, lon)` with `toStringAsFixed(6)` + ` — ` separators; (2) exact endpoint paths/enum string values; (3) tracking polling stops on `is_active==false`; (4) GPS reporter uses recursive (non-overlapping) 15s scheduler; (5) admin vs driver status-transition target sets; (6) fee formula `clamp(3.00 + 1.50×km, 5, 25)` with S/5 fallback; (7) tax = subtotal×0.18 (not on delivery_fee); (8) JSON login (`/auth/login/json`) for the app, not the form endpoint.

**Relevant paths:** existing Flutter scaffold at `C:/Users/kenny/Documents/app_delivery/mobile` (pubspec already pins the package set in §7); authoritative backend at `C:/Users/kenny/Documents/app_delivery/backend`, web frontend at `C:/Users/kenny/Documents/app_delivery/frontend`. The legacy non-authoritative prototype lives at `C:/Users/kenny/Documents/app_delivery/delivery` — do not port it.