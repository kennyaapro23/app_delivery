import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/delivery.dart';
import 'package:chikenhot/services/delivery_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// `/delivery/available` — pedidos cercanos que el repartidor puede aceptar.
class DriverAvailableScreen extends ConsumerStatefulWidget {
  const DriverAvailableScreen({super.key});

  @override
  ConsumerState<DriverAvailableScreen> createState() =>
      _DriverAvailableScreenState();
}

class _DriverAvailableScreenState extends ConsumerState<DriverAvailableScreen> {
  List<NearbyOrder> _orders = const [];
  bool _loading = true;
  int? _accepting;
  String? _error;

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
      final orders = await DeliveryService.nearbyOrders();
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

  Future<void> _accept(int id) async {
    setState(() => _accepting = id);
    try {
      await DeliveryService.accept(id);
      if (!mounted) return;
      context.push('/delivery/my-orders/$id');
    } catch (e) {
      if (!mounted) return;
      final msg = getErrorMessage(e);
      setState(() => _error = msg);
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(msg)));
      await _load();
    } finally {
      if (mounted) setState(() => _accepting = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pedidos disponibles'),
        actions: [
          IconButton(
            tooltip: 'Actualizar',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: BrandColors.c500,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView(message: 'Buscando pedidos cercanos…');
    }
    if (_error != null && _orders.isEmpty) {
      return ListView(
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          ErrorView(message: _error!, onRetry: _load),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _Header(count: _orders.length),
        if (_error != null) ...[
          const SizedBox(height: 12),
          _InlineError(message: _error!),
        ],
        const SizedBox(height: 12),
        if (_orders.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 48),
            child: EmptyView(
              icon: Icons.schedule,
              message: '🕑 No hay pedidos disponibles ahora mismo',
              action: OutlinedButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh),
                label: const Text('Actualizar'),
              ),
            ),
          )
        else
          ..._orders.map((o) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _OrderCard(
                  order: o,
                  accepting: _accepting == o.id,
                  onAccept: _accepting == null ? () => _accept(o.id) : null,
                ),
              )),
      ],
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.count});
  final int count;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: BrandColors.c500.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.delivery_dining, color: BrandColors.c500),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Pedidos disponibles',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
              Text(
                count == 1
                    ? '1 esperando un repartidor'
                    : '$count esperando un repartidor',
                style: const TextStyle(fontSize: 13, color: Neutral.n500),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFCA5A5)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, size: 18, color: Color(0xFFB91C1C)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message,
                style: const TextStyle(fontSize: 13, color: Color(0xFFB91C1C))),
          ),
        ],
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    required this.accepting,
    required this.onAccept,
  });

  final NearbyOrder order;
  final bool accepting;
  final VoidCallback? onAccept;

  @override
  Widget build(BuildContext context) {
    final createdAt = order.createdAt;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Pedido ${order.orderNumber}',
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 2),
                    Text(
                      createdAt != null ? Fmt.dateTime(createdAt) : '—',
                      style: const TextStyle(fontSize: 12, color: Neutral.n500),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    Fmt.money(order.deliveryFee),
                    style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: BrandColors.c600),
                  ),
                  const Text('Ganancia',
                      style: TextStyle(fontSize: 11, color: Neutral.n500)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 1),
                child: Icon(Icons.location_on_outlined,
                    size: 18, color: Neutral.n400),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(order.deliveryAddress,
                    style: const TextStyle(fontSize: 13, color: Neutral.n700)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(order.paymentMethod.icon, size: 18, color: Neutral.n400),
              const SizedBox(width: 8),
              Text(order.paymentMethod.label,
                  style: const TextStyle(fontSize: 13, color: Neutral.n700)),
              const SizedBox(width: 8),
              const Text('·', style: TextStyle(color: Neutral.n300)),
              const SizedBox(width: 8),
              Text('Total: ${Fmt.money(order.total)}',
                  style: const TextStyle(fontSize: 13, color: Neutral.n700)),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: accepting ? null : onAccept,
              child: accepting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Aceptar pedido'),
            ),
          ),
        ],
      ),
    );
  }
}
