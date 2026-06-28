import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/order.dart';
import 'package:chikenhot/services/orders_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// Lista de pedidos del cliente (`/orders`).
///
/// Réplica de `frontend/src/pages/OrdersPage.tsx`: carga los pedidos propios
/// con `OrdersService.list()`, muestra tarjetas con número de pedido, estado,
/// fecha, cantidad de productos, total y método de pago; cada tarjeta navega
/// al detalle (`/orders/{id}`). Maneja estados de carga, vacío y error, con
/// pull-to-refresh.
class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  bool _loading = true;
  String? _error;
  List<Order> _orders = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final orders = await OrdersService.list();
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = getErrorMessage(e);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mis pedidos')),
      body: SafeArea(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView(message: 'Cargando tus pedidos…');
    }

    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    if (_orders.isEmpty) {
      return RefreshIndicator(
        color: BrandColors.c500,
        onRefresh: _load,
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: EmptyView(
                icon: Icons.inventory_2_outlined,
                message: 'Aún no tienes pedidos',
                action: FilledButton(
                  onPressed: () => context.go('/'),
                  style: FilledButton.styleFrom(
                    backgroundColor: BrandColors.c500,
                  ),
                  child: const Text('Hacer mi primer pedido'),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: BrandColors.c500,
      onRefresh: _load,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: _orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) => _OrderCard(order: _orders[i]),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final count = order.items.length;
    final productLabel = '$count producto${count == 1 ? '' : 's'}';
    final created = order.createdAt;

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/orders/${order.id}'),
      child: SectionCard(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          'Pedido #${order.orderNumber}',
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      StatusBadge(order.status, small: true),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    [
                      if (created != null) Fmt.date(created),
                      productLabel,
                    ].join(' · '),
                    style: const TextStyle(fontSize: 13, color: Neutral.n500),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  Fmt.money(order.total),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 17,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(order.paymentMethod.icon,
                        size: 13, color: Neutral.n400),
                    const SizedBox(width: 4),
                    Text(
                      order.paymentMethod.label,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Neutral.n500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
