import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/cart.dart';
import 'package:chikenhot/providers/auth_provider.dart';
import 'package:chikenhot/providers/cart_provider.dart';
import 'package:chikenhot/widgets/common.dart';

/// Carrito local (`/cart`) — espejo de frontend/src/pages/CartPage.tsx.
class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(cartProvider);
    final subtotal = ref.watch(cartSubtotalProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('🛒 Tu carrito')),
      body: items.isEmpty
          ? EmptyView(
              icon: Icons.shopping_bag_outlined,
              message: 'Tu carrito está vacío\n\n'
                  'Añade productos del menú para empezar tu pedido',
              action: ElevatedButton(
                onPressed: () => context.go('/'),
                child: const Text('Ver menú'),
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, i) => _CartLine(
                      item: items[i],
                      onChanged: (qty) => ref
                          .read(cartProvider.notifier)
                          .updateQuantity(items[i].product.id, qty),
                      onRemove: () => ref
                          .read(cartProvider.notifier)
                          .remove(items[i].product.id),
                    ),
                  ),
                ),
                _Summary(subtotal: subtotal),
              ],
            ),
    );
  }
}

class _CartLine extends StatelessWidget {
  const _CartLine({
    required this.item,
    required this.onChanged,
    required this.onRemove,
  });

  final CartItem item;
  final ValueChanged<int> onChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final product = item.product;
    return SectionCard(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: BrandColors.c50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(product.icon, style: const TextStyle(fontSize: 28)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  '${Fmt.money(product.price)} c/u',
                  style: const TextStyle(fontSize: 13, color: Neutral.n500),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    QtyStepper(
                      value: item.quantity,
                      min: 0,
                      onChanged: onChanged,
                    ),
                    const Spacer(),
                    Text(
                      Fmt.money(item.lineTotal),
                      style: const TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onRemove,
            tooltip: 'Eliminar',
            icon: const Icon(Icons.delete_outline),
            color: const Color(0xFFEF4444),
          ),
        ],
      ),
    );
  }
}

class _Summary extends ConsumerWidget {
  const _Summary({required this.subtotal});

  final double subtotal;

  void _goToCheckout(BuildContext context, WidgetRef ref) {
    final authenticated = ref.read(authProvider).authenticated;
    if (!authenticated) {
      context.push('/login');
    } else {
      context.push('/checkout');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Neutral.n200)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Subtotal',
                    style:
                        TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                  Text(
                    Fmt.money(subtotal),
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Neutral.n50,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Icon(Icons.info_outline, size: 16, color: Neutral.n400),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Delivery e IGV se calculan en el checkout',
                        style: TextStyle(fontSize: 12, color: Neutral.n600),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => _goToCheckout(context, ref),
                  child: const Text('Continuar al pago'),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.go('/'),
                  child: const Text('Seguir comprando'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
