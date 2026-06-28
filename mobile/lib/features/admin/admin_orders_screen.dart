import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/order.dart';
import 'package:chikenhot/services/orders_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// Supervisión de todos los pedidos (`/admin/orders`).
///
/// Réplica de `frontend/src/pages/admin/AdminOrdersPage.tsx`: lista todos los
/// pedidos con `OrdersService.list()`, filtrables por estado mediante chips
/// ("Todos" + los 7 estados). Cada tarjeta muestra el número de pedido (mono),
/// el cliente (nombre + teléfono), un `StatusBadge`, el total y la fecha, y un
/// enlace "Ver →" que navega al detalle (`/admin/orders/{id}`). Incluye
/// refresco manual y maneja los estados de carga, vacío y error.
///
/// Se renderiza dentro de `AdminShell` (sin AppBar propio).
class AdminOrdersScreen extends ConsumerStatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  ConsumerState<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends ConsumerState<AdminOrdersScreen> {
  /// `null` = "Todos" (sin filtro de estado).
  OrderStatus? _filter;
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
      final orders = await OrdersService.list(status: _filter?.api, limit: 100);
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

  void _selectFilter(OrderStatus? status) {
    if (_filter == status) return;
    setState(() => _filter = status);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Encabezado: título + refrescar ──
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Pedidos',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                ),
                TextButton.icon(
                  onPressed: _loading ? null : _load,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Refrescar'),
                ),
              ],
            ),
          ),

          // ── Chips de filtro por estado ──
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _FilterChip(
                  label: 'Todos',
                  selected: _filter == null,
                  onTap: () => _selectFilter(null),
                ),
                for (final status in OrderStatus.values) ...[
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: status.label,
                    selected: _filter == status,
                    onTap: () => _selectFilter(status),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 8),

          // ── Cuerpo ──
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView(message: 'Cargando pedidos…');
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
              child: const EmptyView(
                icon: Icons.receipt_long_outlined,
                message: 'No hay pedidos',
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
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        itemCount: _orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) => _AdminOrderCard(order: _orders[i]),
      ),
    );
  }
}

/// Chip de filtro de estado (estilo píldora marca).
class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? BrandColors.c500 : Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected ? BrandColors.c500 : Neutral.n200,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : Neutral.n600,
            ),
          ),
        ),
      ),
    );
  }
}

/// Tarjeta de pedido para el panel admin.
class _AdminOrderCard extends StatelessWidget {
  const _AdminOrderCard({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final created = order.createdAt;
    final phone = order.customerPhone;

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/admin/orders/${order.id}'),
      child: SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Número de pedido (mono) + estado.
            Row(
              children: [
                Expanded(
                  child: Text(
                    order.orderNumber,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                StatusBadge(order.status, small: true),
              ],
            ),
            const SizedBox(height: 10),

            // Cliente: nombre + teléfono.
            Text(
              order.customerName ?? '—',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            if (phone != null && phone.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                phone,
                style: const TextStyle(fontSize: 12, color: Neutral.n500),
              ),
            ],
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),

            // Total + fecha + enlace "Ver →".
            Row(
              children: [
                Text(
                  Fmt.money(order.total),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 17,
                  ),
                ),
                const SizedBox(width: 12),
                if (created != null)
                  Expanded(
                    child: Text(
                      Fmt.dateTime(created),
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Neutral.n500,
                      ),
                    ),
                  )
                else
                  const Spacer(),
                const SizedBox(width: 8),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Text(
                      'Ver',
                      style: TextStyle(
                        color: BrandColors.c600,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    Icon(Icons.chevron_right, size: 18, color: BrandColors.c600),
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
