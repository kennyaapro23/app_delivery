import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/order.dart';
import 'package:chikenhot/services/orders_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// Pedidos asignados al repartidor: Activos + Historial.
class DriverMyOrdersScreen extends ConsumerStatefulWidget {
  const DriverMyOrdersScreen({super.key});

  @override
  ConsumerState<DriverMyOrdersScreen> createState() =>
      _DriverMyOrdersScreenState();
}

class _DriverMyOrdersScreenState extends ConsumerState<DriverMyOrdersScreen> {
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
    if (_loading) {
      return const LoadingView(message: 'Cargando tus pedidos…');
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    final active = _orders.where((o) => o.status.isActive).toList();
    final past = _orders.where((o) => !o.status.isActive).take(20).toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Mis pedidos',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 16),

          // Activos
          _SectionHeader('Activos (${active.length})'),
          const SizedBox(height: 8),
          if (active.isEmpty)
            EmptyView(
              message: 'No tienes pedidos asignados',
              icon: Icons.inventory_2_outlined,
              action: ElevatedButton.icon(
                onPressed: () => context.go('/delivery/available'),
                icon: const Icon(Icons.search),
                label: const Text('Ver pedidos disponibles'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: BrandColors.c500,
                  foregroundColor: Colors.white,
                ),
              ),
            )
          else
            ...active.map((o) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _OrderRow(order: o),
                )),

          // Historial
          if (past.isNotEmpty) ...[
            const SizedBox(height: 16),
            const _SectionHeader('Historial'),
            const SizedBox(height: 8),
            ...past.map((o) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _OrderRow(order: o),
                )),
          ],
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: Neutral.n600,
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  const _OrderRow({required this.order});
  final Order order;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/delivery/my-orders/${order.id}'),
      child: SectionCard(
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          order.orderNumber,
                          style: const TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 15),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      StatusBadge(order.status, small: true),
                    ],
                  ),
                  if (order.createdAt != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      Fmt.date(order.createdAt!),
                      style: const TextStyle(
                          fontSize: 12, color: Neutral.n500),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  Fmt.money(order.deliveryFee),
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 14),
                ),
                const Text(
                  'delivery',
                  style: TextStyle(fontSize: 11, color: Neutral.n500),
                ),
              ],
            ),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right, size: 18, color: Neutral.n400),
          ],
        ),
      ),
    );
  }
}
