import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../providers/cart_provider.dart';

class CustomerShell extends ConsumerWidget {
  const CustomerShell({super.key, required this.child, required this.location});
  final Widget child;
  final String location;

  static const _tabs = ['/', '/favorites', '/orders', '/profile'];

  int get _index {
    if (location == '/') return 0;
    if (location.startsWith('/favorites')) return 1;
    if (location.startsWith('/orders')) return 2;
    if (location.startsWith('/profile')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(cartCountProvider);
    return Scaffold(
      body: child,
      floatingActionButton: FloatingActionButton(
        heroTag: 'cart',
        backgroundColor: BrandColors.c500,
        onPressed: () => context.push('/cart'),
        child: Badge(
          isLabelVisible: count > 0,
          label: Text('$count'),
          child: const Icon(Icons.shopping_cart, color: Colors.white),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => context.go(_tabs[i]),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.restaurant_menu_outlined), selectedIcon: Icon(Icons.restaurant_menu), label: 'Menú'),
          NavigationDestination(icon: Icon(Icons.favorite_border), selectedIcon: Icon(Icons.favorite), label: 'Favoritos'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Pedidos'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Perfil'),
        ],
      ),
    );
  }
}
