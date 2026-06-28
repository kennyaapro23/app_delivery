# Chikenhot Mobile — Contrato de APIs internas (para construir pantallas)

Package name: `chikenhot`. Importa con `package:chikenhot/...`. UI en **español**.
Moneda con `Fmt.money(x)` → "S/ 12.50". Maneja errores con `getErrorMessage(e)`.
Usa Riverpod (`ConsumerWidget` / `ConsumerStatefulWidget` + `ref`). go_router para navegar
(`context.go(...)` para tabs/raíz, `context.push(...)` para detalle, `context.pop()`).

Cada pantalla DEBE conservar su nombre de clase y constructor exactos (ver router).
Reutiliza los widgets compartidos. No reimplementes mapas: usa `LiveOrderMap`, `LocationPicker`, `StaticMap`.

## Helpers / core
- `package:chikenhot/core/format.dart` → `Fmt.money(num)`, `Fmt.dateTime(DateTime)`, `Fmt.date(DateTime)`, `Fmt.time(DateTime)`, `Fmt.timeAgo(DateTime)`, `Fmt.tryParse(String?)`.
- `package:chikenhot/core/api_client.dart` → `getErrorMessage(Object)`, `ApiException`.
- `package:chikenhot/core/config.dart` → `AppConfig.restaurantLat/restaurantLng/taxRate/currencySymbol/trackingPollSeconds`.
- `package:chikenhot/core/theme.dart` → `BrandColors.c50..c900` (c500=#FF7E0F naranja marca), `Neutral.n50..n900`.

## Providers (`package:chikenhot/providers/...`)
- `authProvider` → `AuthState { bool hydrated; bool authenticated; int? userId; UserRole? role; String? fullName; User? user; }`.
  Notifier: `ref.read(authProvider.notifier)` con `login(email,pass)→Future<UserRole>`, `register({email,password,fullName,phone})→Future<UserRole>`, `registerDriver(Map payload)→Future<UserRole>`, `loadProfile()→Future<void>`, `logout()→Future<void>`.
- `cartProvider` → `List<CartItem>`. Notifier: `add(Product,[qty])`, `remove(int productId)`, `updateQuantity(int productId,int qty)`, `replaceProducts(List<Product>)`, `clear()`.
  Derivados: `cartSubtotalProvider`→`double`, `cartCountProvider`→`int`.
- `favoritesProvider` → `List<Product>`. Notifier: `isFavorite(int id)`, `toggle(Product)`, `remove(int id)`, `clear()`.
- `tileStyleProvider` → `TileStyleId`. Notifier: `select(TileStyleId)`.

## Modelos (`package:chikenhot/models/...`) — campos
- user.dart: `User { int id; String email; String fullName; String? phone; UserRole role; bool isActive; int points; MembershipLevel membershipLevel; DateTime? createdAt; }`.
  `UserRole { admin, customer, deliveryDriver }` con `.api` ("admin"/"customer"/"delivery_driver"), `.label`, `UserRole.fromApi(s)`.
  `MembershipLevel { bronce, plata, oro, platino }` con `.api`, `.label`, `.fromApi(s)`.
- product.dart: `Category { int id; String name; String? description; String icon; bool isActive; int displayOrder; }`.
  `Product { int id; String name; String? description; double price; int categoryId; String icon; String? imageUrl; bool isFeatured; bool isAvailable; DateTime? createdAt; Category? category; }` con `.toJson()`.
- order.dart: `Order { int id; String orderNumber; int customerId; int? deliveryDriverId; OrderStatus status; double subtotal; double deliveryFee; double tax; double total; PaymentMethod paymentMethod; String deliveryAddress; String? notes; DateTime? createdAt; DateTime? updatedAt; List<OrderItem> items; List<OrderTimelineEvent> timeline; String? customerName; String? customerPhone; String? driverName; String? driverPhone; }`.
  `OrderItem { int id; int productId; String productName; int quantity; double unitPrice; double subtotal; }`.
  `OrderTimelineEvent { int id; String status; String title; String? description; DateTime? timestamp; }`.
  `OrderStatus { pending, accepted, preparing, ready, onTheWay, delivered, canceled }` con `.api`, `.label` (Pendiente/Aceptado/En Preparación/Listo para Entrega/En Ruta/Entregado/Cancelado), `.color`, `.bg`, `.icon`, `.isActive`, `OrderStatus.fromApi(s)`.
  `PaymentMethod { efectivo, yape, tarjeta }` con `.api`, `.label`, `.icon`, `.fromApi(s)`.
- address.dart: `Address { int id; int userId; String label; String fullAddress; String? reference; String? district; String? city; double? latitude; double? longitude; bool isDefault; DateTime? createdAt; bool get hasCoords; }`.
- cart.dart: `CartItem { Product product; int quantity; double get lineTotal; copyWith(...); }`.
- coupon.dart: `Coupon { int id; String code; String? description; double? discountPercent; double? discountAmount; double minOrderAmount; int maxUses; int currentUses; bool isActive; DateTime? expiresAt; DateTime? createdAt; }`. `CouponApplyResult { bool valid; double discount; String message; }`.
- review.dart: `Review { int id; int orderId; int customerId; int? driverId; double rating; String? comment; DateTime? createdAt; String? customerName; }`.
- tracking.dart: `OrderTracking {...}` (sólo lo usa LiveOrderMap; no lo necesitas directo).
- dashboard.dart: `AdminDashboard { int ordersToday; int ordersChangePercent; double revenueToday; int revenueChangePercent; int activeUsers; int totalDrivers; int availableDrivers; int pendingOrders; }`. `CustomerDashboard { int totalOrders; int activeOrders; int points; MembershipLevel membershipLevel; double lastOrderTotal; DateTime? lastOrderDate; }`. `UserStats { int totalUsers; int activeUsers; int customers; int drivers; int admins; int newThisWeek; }`.
- delivery.dart: `EarningsSummary { double today; double thisWeek; double thisMonth; double total; int deliveriesToday; int deliveriesTotal; }`. `DriverStats { int deliveriesToday; int deliveriesCompleted; double earningsToday; double averageRating; double punctuality; double satisfaction; double efficiency; }`. `NearbyOrder { int id; String orderNumber; OrderStatus status; String deliveryAddress; double total; double deliveryFee; PaymentMethod paymentMethod; DateTime? createdAt; }`. `CalculateFeeResult { double fee; double? distanceKm; double base; double perKm; double min; double max; double? rawFee; String? note; }`. `DriverProfile {...getters...}` (id, userId, fullName, email, phone, documentId, birthDate, gender, homeAddress, homeDistrict, emergencyContact*, vehicle* incl. `vehicleEmoji`, license*, insurance*, bank*, isAvailable, latitude, longitude, currentZone, totalDeliveries, averageRating, totalEarnings, `hasLocation`).

## Servicios (`package:chikenhot/services/...`) — métodos estáticos async
- `ProductsService.categories({bool includeInactive=false})→List<Category>`; `.products({int? categoryId,String? search,bool featured=false,bool includeInactive=false,int limit=100})→List<Product>`; `.product(int id)→Product`; `.create(Map)→Product`; `.update(int,Map)→Product`; `.delete(int)`; `.createCategory(Map)→Category`; `.updateCategory(int,Map)→Category`; `.deleteCategory(int)`.
- `OrdersService.calculateFee({double? latitude,double? longitude,String? address})→CalculateFeeResult`; `.create({required List<Map> items, required String deliveryAddress, required String paymentMethod, String? notes, String? couponCode})→Order` (items = `[{'product_id':id,'quantity':q}]`); `.list({String? status,int limit=50})→List<Order>`; `.get(int)→Order`; `.updateStatus(int, OrderStatus)→Order`; `.cancel(int)→Order`; `.invoicePdf(int)→List<int>` (bytes PDF).
- `AddressesService.list()→List<Address>`; `.create(Map)→Address`; `.update(int,Map)→Address`; `.delete(int)`. (payload create: `{label, full_address, reference?, district?, city?, latitude?, longitude?, is_default}`)
- `ReviewsService.create({required int orderId, required double rating, String? comment})→Review`; `.mine()→List<Review>`; `.forDriver(int driverId)→List<Review>`.
- `CouponsService.list()→List<Coupon>`; `.create(Map)→Coupon`; `.apply(String code, double subtotal)→CouponApplyResult` (siempre 200; valida con `.valid`).
- `DashboardService.admin()→AdminDashboard`; `.customer()→CustomerDashboard`; `.driver()→DriverStats`.
- `DeliveryService.toggleAvailability()→bool`; `.updateLocation({lat,lon,zone?})`; `.nearbyOrders({int limit=20})→List<NearbyOrder>`; `.accept(int orderId)`; `.complete(int orderId)`; `.earnings()→EarningsSummary`; `.stats()→DriverStats`; `.allDrivers()→List<DriverProfile>`.
- `UsersService.list({String? role,String? search,int limit=100})→UsersListResult{users:List<User>, total:int}`; `.stats()→UserStats`; `.update(int,Map)→User`.
- `GeocodingService.search(String q)→List<GeocodeResult>`; `.reverse(double lat,double lon)→GeocodeResult?`. `GeocodeResult { double lat; double lon; String displayName; String get shortAddress; }`.

## Widgets compartidos (`package:chikenhot/widgets/common.dart`)
- `StatusBadge(OrderStatus, {bool small})`.
- `StarRating({required double value, double size=20, ValueChanged<int>? onChanged, Color color})` (interactivo si onChanged != null).
- `StatCard({required String label, required String value, IconData? icon, String? hint, Color color, int? trend})`.
- `MembershipBadge(MembershipLevel)`.
- `QtyStepper({required int value, required ValueChanged<int> onChanged, int min=1})`.
- `LoadingView({String? message})`, `ErrorView({required String message, VoidCallback? onRetry})`, `EmptyView({required String message, IconData icon, Widget? action})`, `SectionCard({required Widget child, EdgeInsets padding})`.

## Mapas (`package:chikenhot/widgets/map/...`)
- `LiveOrderMap({required int orderId, int refreshSeconds=5, double height=320})` — tracking en vivo completo (polling, marcadores, polyline, ETA, badge En vivo). Úsalo en detalle de pedido (pasa `refreshSeconds: 10`).
- `LocationPicker({PickedLocation? initial, required ValueChanged<PickedLocation> onChanged, double height=280})`. `PickedLocation { double lat; double lon; String address; }`.
- `StaticMap({required List<MapPin> pins, double height=320})`. `MapPin({required LatLng point, Color color, VoidCallback? onTap})` (import `package:latlong2/latlong.dart`).

## ⚠ Contrato de coordenadas embebidas (checkout) — REPLICAR EXACTO
Al crear pedido, arma `delivery_address` uniendo partes con `' — '` (espacio, em-dash U+2014, espacio)
y agrega como ÚLTIMA parte el token de coords: `'(${lat.toStringAsFixed(6)}, ${lon.toStringAsFixed(6)})'`.
- Dirección guardada: partes opcionales `'[label]'`, `full_address`, `reference`, `'(lat, lon)'`.
- Ubicación nueva del mapa: `location.address`, detalle/referencia, `'(lat, lon)'`.
- Ej: `'Av Larco 123 — Depto 5 — (-12.046400, -77.042800)'`. Si falta el sufijo, la tarifa cae a S/5 y el mapa no ubica el destino.

## Credenciales seed (quick-login)
admin@chikenhot.pe / admin123 · cliente@chikenhot.pe / cliente123 · delivery@chikenhot.pe / delivery123.

## Rutas (go_router)
`/` catálogo, `/products/:id`, `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/addresses`, `/reviews`, `/favorites`, `/profile`,
`/login`, `/register`, `/register-driver`,
`/delivery`, `/delivery/available`, `/delivery/map`, `/delivery/my-orders`, `/delivery/my-orders/:id`, `/delivery/earnings`, `/delivery/ratings`,
`/admin`, `/admin/orders`, `/admin/orders/:id`, `/admin/products`, `/admin/users`, `/admin/drivers`, `/admin/coupons`.
