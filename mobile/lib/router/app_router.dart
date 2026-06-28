import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/user.dart';
import '../providers/auth_provider.dart';

// Auth
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/auth/driver_register_screen.dart';
// Customer
import '../features/customer/catalog_screen.dart';
import '../features/customer/product_detail_screen.dart';
import '../features/customer/cart_screen.dart';
import '../features/customer/checkout_screen.dart';
import '../features/customer/orders_screen.dart';
import '../features/customer/order_detail_screen.dart';
import '../features/customer/addresses_screen.dart';
import '../features/customer/favorites_screen.dart';
import '../features/customer/reviews_screen.dart';
import '../features/customer/profile_screen.dart';
// Driver
import '../features/driver/driver_dashboard_screen.dart';
import '../features/driver/driver_available_screen.dart';
import '../features/driver/driver_map_screen.dart';
import '../features/driver/driver_my_orders_screen.dart';
import '../features/driver/driver_order_detail_screen.dart';
import '../features/driver/driver_earnings_screen.dart';
import '../features/driver/driver_ratings_screen.dart';
// Admin
import '../features/admin/admin_dashboard_screen.dart';
import '../features/admin/admin_orders_screen.dart';
import '../features/admin/admin_order_detail_screen.dart';
import '../features/admin/admin_products_screen.dart';
import '../features/admin/admin_users_screen.dart';
import '../features/admin/admin_drivers_screen.dart';
import '../features/admin/admin_coupons_screen.dart';
import '../features/admin/admin_store_config_screen.dart';
// Shells + splash
import 'shells/customer_shell.dart';
import 'shells/driver_shell.dart';
import 'shells/admin_shell.dart';
import 'splash_screen.dart';

String defaultHomeForRole(UserRole? role) => switch (role) {
      UserRole.admin => '/admin',
      UserRole.deliveryDriver => '/delivery',
      _ => '/',
    };

bool _guestCanAccess(String loc) {
  return loc == '/' ||
      loc.startsWith('/products') ||
      loc == '/cart' ||
      loc == '/favorites';
}

final routerProvider = Provider<GoRouter>((ref) {
  var bump = 0;
  final refresh = ValueNotifier<int>(0);
  ref.listen(authProvider, (_, __) => refresh.value = ++bump);
  ref.onDispose(refresh.dispose);

  Page<void> noShell(Widget child) => NoTransitionPage(child: child);

  // Defensa en profundidad a nivel de ruta: cada ruta sensible (fuera del
  // ShellRoute) verifica explicitamente el rol, sin depender solo del prefijo
  // (`startsWith`) del redirect global. Si el rol no coincide, redirige al
  // home del rol actual.
  // IMPORTANTE: TODA ruta nueva '/delivery*' debe usar el prefijo exacto
  // '/delivery' y TODA ruta '/admin*' el prefijo exacto '/admin' para que el
  // redirect global mantenga el aislamiento de rol.
  GoRouterRedirect requireRole(UserRole required) {
    return (context, state) {
      final role = ref.read(authProvider).role;
      return role == required ? null : defaultHomeForRole(role);
    };
  }

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final loc = state.matchedLocation;

      if (!auth.hydrated) return loc == '/splash' ? null : '/splash';

      final loggedIn = auth.authenticated;
      final role = auth.role;
      final atAuth = loc == '/login' || loc == '/register' || loc == '/register-driver';

      if (!loggedIn) {
        if (loc == '/splash') return '/login';
        if (atAuth || _guestCanAccess(loc)) return null;
        return '/login';
      }

      // Autenticado
      if (loc == '/splash' || atAuth) return defaultHomeForRole(role);
      if (loc.startsWith('/admin') && role != UserRole.admin) {
        return defaultHomeForRole(role);
      }
      if (loc.startsWith('/delivery') && role != UserRole.deliveryDriver) {
        return defaultHomeForRole(role);
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', pageBuilder: (_, __) => noShell(const SplashScreen())),
      GoRoute(path: '/login', pageBuilder: (_, __) => noShell(const LoginScreen())),
      GoRoute(path: '/register', pageBuilder: (_, __) => noShell(const RegisterScreen())),
      GoRoute(path: '/register-driver', pageBuilder: (_, __) => noShell(const DriverRegisterScreen())),

      // ── Secondary customer routes (full screen, no bottom nav) ──
      GoRoute(path: '/products/:id', builder: (_, s) => ProductDetailScreen(productId: int.parse(s.pathParameters['id']!))),
      GoRoute(path: '/cart', builder: (_, __) => const CartScreen()),
      GoRoute(path: '/checkout', builder: (_, __) => const CheckoutScreen()),
      GoRoute(path: '/addresses', builder: (_, __) => const AddressesScreen()),
      GoRoute(path: '/reviews', builder: (_, __) => const ReviewsScreen()),
      GoRoute(path: '/orders/:id', builder: (_, s) => OrderDetailScreen(orderId: int.parse(s.pathParameters['id']!))),

      // ── Customer shell (bottom nav tabs) ──
      ShellRoute(
        builder: (context, state, child) =>
            CustomerShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(path: '/', pageBuilder: (_, __) => noShell(const CatalogScreen())),
          GoRoute(path: '/favorites', pageBuilder: (_, __) => noShell(const FavoritesScreen())),
          GoRoute(path: '/orders', pageBuilder: (_, __) => noShell(const OrdersScreen())),
          GoRoute(path: '/profile', pageBuilder: (_, __) => noShell(const ProfileScreen())),
        ],
      ),

      // ── Driver secondary ──
      GoRoute(
        path: '/delivery/available',
        redirect: requireRole(UserRole.deliveryDriver),
        builder: (_, __) => const DriverAvailableScreen(),
      ),
      GoRoute(
        path: '/delivery/my-orders/:id',
        redirect: requireRole(UserRole.deliveryDriver),
        builder: (_, s) => DriverOrderDetailScreen(orderId: int.parse(s.pathParameters['id']!)),
      ),

      // ── Driver shell ──
      ShellRoute(
        builder: (context, state, child) =>
            DriverShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(path: '/delivery', pageBuilder: (_, __) => noShell(const DriverDashboardScreen())),
          GoRoute(path: '/delivery/map', pageBuilder: (_, __) => noShell(const DriverMapScreen())),
          GoRoute(path: '/delivery/my-orders', pageBuilder: (_, __) => noShell(const DriverMyOrdersScreen())),
          GoRoute(path: '/delivery/earnings', pageBuilder: (_, __) => noShell(const DriverEarningsScreen())),
          GoRoute(path: '/delivery/ratings', pageBuilder: (_, __) => noShell(const DriverRatingsScreen())),
        ],
      ),

      // ── Admin secondary ──
      GoRoute(
        path: '/admin/orders/:id',
        redirect: requireRole(UserRole.admin),
        builder: (_, s) => AdminOrderDetailScreen(orderId: int.parse(s.pathParameters['id']!)),
      ),

      // ── Admin shell ──
      ShellRoute(
        builder: (context, state, child) =>
            AdminShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(path: '/admin', pageBuilder: (_, __) => noShell(const AdminDashboardScreen())),
          GoRoute(path: '/admin/orders', pageBuilder: (_, __) => noShell(const AdminOrdersScreen())),
          GoRoute(path: '/admin/products', pageBuilder: (_, __) => noShell(const AdminProductsScreen())),
          GoRoute(path: '/admin/users', pageBuilder: (_, __) => noShell(const AdminUsersScreen())),
          GoRoute(path: '/admin/drivers', pageBuilder: (_, __) => noShell(const AdminDriversScreen())),
          GoRoute(path: '/admin/coupons', pageBuilder: (_, __) => noShell(const AdminCouponsScreen())),
          GoRoute(path: '/admin/store-config', pageBuilder: (_, __) => noShell(const AdminStoreConfigScreen())),
        ],
      ),
    ],
    errorBuilder: (_, __) => const SplashScreen(),
  );
});
