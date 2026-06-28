import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

class AdminShell extends ConsumerWidget {
  const AdminShell({super.key, required this.child, required this.location});
  final Widget child;
  final String location;

  static const _items = [
    ('/admin', 'Dashboard', Icons.dashboard_outlined),
    ('/admin/orders', 'Pedidos', Icons.receipt_long_outlined),
    ('/admin/products', 'Productos', Icons.fastfood_outlined),
    ('/admin/users', 'Usuarios', Icons.people_outline),
    ('/admin/drivers', 'Repartidores', Icons.delivery_dining_outlined),
    ('/admin/coupons', 'Cupones', Icons.local_offer_outlined),
    ('/admin/store-config', 'Restaurante', Icons.store_outlined),
  ];

  String get _title {
    for (final it in _items) {
      if (it.$1 == '/admin' ? location == '/admin' : location.startsWith(it.$1)) {
        return it.$2;
      }
    }
    return 'Admin';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = ref.watch(authProvider).fullName ?? 'Admin';
    return Scaffold(
      appBar: AppBar(
        title: Text('🍗 $_title'),
        actions: [
          IconButton(
            tooltip: 'Cerrar sesión',
            icon: const Icon(Icons.logout, size: 20),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      drawer: Drawer(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('🍗 Chikenhot',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: BrandColors.c600)),
                    const SizedBox(height: 4),
                    Text(name, style: const TextStyle(color: Neutral.n500)),
                    const Text('Panel de administración', style: TextStyle(fontSize: 12, color: Neutral.n400)),
                  ],
                ),
              ),
              const Divider(height: 1),
              for (final it in _items)
                ListTile(
                  leading: Icon(it.$3),
                  title: Text(it.$2),
                  selected: it.$1 == '/admin' ? location == '/admin' : location.startsWith(it.$1),
                  selectedColor: BrandColors.c600,
                  selectedTileColor: BrandColors.c50,
                  onTap: () {
                    Navigator.pop(context);
                    context.go(it.$1);
                  },
                ),
            ],
          ),
        ),
      ),
      body: child,
    );
  }
}
