import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/order.dart';
import 'package:chikenhot/services/orders_service.dart';
import 'package:chikenhot/widgets/common.dart';
import 'package:chikenhot/widgets/map/live_order_map.dart';

/// Transiciones de estado permitidas para el administrador.
/// Espejo de `NEXT_STATUSES_ADMIN` en el frontend web.
/// pending→[accepted,canceled], accepted→[preparing,canceled],
/// preparing→[ready,canceled]. Desde `ready` el flujo lo controla el repartidor.
const Map<OrderStatus, List<OrderStatus>> _nextStatusesAdmin = {
  OrderStatus.pending: [OrderStatus.accepted, OrderStatus.canceled],
  OrderStatus.accepted: [OrderStatus.preparing, OrderStatus.canceled],
  OrderStatus.preparing: [OrderStatus.ready, OrderStatus.canceled],
  OrderStatus.ready: [],
  OrderStatus.onTheWay: [],
  OrderStatus.delivered: [],
  OrderStatus.canceled: [],
};

/// Detecta si una dirección de entrega lleva el token de coordenadas embebido
/// `(lat, lon)` — necesario para que `LiveOrderMap` ubique el destino.
final RegExp _coordsRe = RegExp(r'\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)');

/// Detalle de pedido para el administrador: cabecera con estado, seguimiento en
/// vivo, productos, línea de tiempo, datos del cliente, resumen y acciones de
/// transición de estado. Auto-refresca cada 15s mientras el pedido esté activo.
class AdminOrderDetailScreen extends ConsumerStatefulWidget {
  const AdminOrderDetailScreen({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<AdminOrderDetailScreen> createState() =>
      _AdminOrderDetailScreenState();
}

class _AdminOrderDetailScreenState
    extends ConsumerState<AdminOrderDetailScreen> {
  Order? _order;
  bool _loading = true;
  bool _refreshing = false;
  bool _updating = false;
  String? _error;

  Timer? _poll;

  /// Token incremental por petición: descarta respuestas obsoletas (fuera de
  /// orden) cuando varios `_load` corren en paralelo (p. ej. refresco manual +
  /// polling), evitando que una respuesta antigua sobrescriba una más reciente.
  int _loadToken = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  /// Auto-refresco cada 15s mientras el pedido esté activo. Se detiene al
  /// llegar a un estado terminal (entregado/cancelado) o al desmontar.
  void _syncPolling() {
    _poll?.cancel();
    _poll = null;
    final order = _order;
    if (order != null && order.status.isActive) {
      _poll = Timer.periodic(
        const Duration(seconds: 15),
        (_) => _load(showLoading: false),
      );
    }
  }

  Future<void> _load({bool showLoading = true}) async {
    final token = ++_loadToken;
    if (mounted) {
      setState(() {
        if (showLoading) {
          _loading = true;
        } else {
          _refreshing = true;
        }
        _error = null;
      });
    }
    try {
      final order = await OrdersService.get(widget.orderId);
      // Descarta respuestas obsoletas: solo la última petición aplica su estado.
      if (!mounted || token != _loadToken) return;
      setState(() {
        _order = order;
        if (showLoading) _loading = false;
        _refreshing = false;
      });
      _syncPolling();
    } catch (e) {
      if (!mounted || token != _loadToken) return;
      setState(() {
        _error = getErrorMessage(e);
        if (showLoading) _loading = false;
        _refreshing = false;
      });
    }
  }

  Future<void> _moveTo(OrderStatus next) async {
    final order = _order;
    if (order == null || _updating) return;
    setState(() => _updating = true);
    try {
      final updated = await OrdersService.updateStatus(order.id, next);
      if (!mounted) return;
      // Invalida cualquier `_load` en vuelo para que no sobrescriba el estado
      // recién actualizado con una respuesta anterior a la transición.
      ++_loadToken;
      setState(() => _order = updated);
      _syncPolling();
      _snack('Estado actualizado a "${next.label}"');
    } catch (e) {
      _snack(getErrorMessage(e), error: true);
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  void _snack(String message, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text(message),
        backgroundColor:
            error ? const Color(0xFFB91C1C) : const Color(0xFF15803D),
      ));
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      backgroundColor: Neutral.n50,
      appBar: AppBar(
        title: Text(order != null ? 'Pedido ${order.orderNumber}' : 'Pedido'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Pedidos',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/admin/orders');
            }
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refrescar',
            onPressed: (_loading || _refreshing)
                ? null
                : () => _load(showLoading: false),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView(message: 'Cargando pedido…');
    }
    final order = _order;
    if (_error != null || order == null) {
      return ErrorView(
        message: _error ?? 'Pedido no encontrado',
        onRetry: _load,
      );
    }

    final isActive = order.status.isActive;
    final hasCoords = _coordsRe.hasMatch(order.deliveryAddress);

    return RefreshIndicator(
      onRefresh: () => _load(showLoading: false),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _header(order),
          const SizedBox(height: 16),
          if (isActive && hasCoords) ...[
            const Text('📡 Seguimiento en vivo',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: LiveOrderMap(
                  orderId: order.id, refreshSeconds: 10, height: 300),
            ),
            const SizedBox(height: 16),
          ],
          _itemsCard(order),
          const SizedBox(height: 16),
          _timelineCard(order),
          const SizedBox(height: 16),
          _customerCard(order),
          const SizedBox(height: 16),
          _summaryCard(order),
          const SizedBox(height: 16),
          _statusActions(order),
        ],
      ),
    );
  }

  Widget _header(Order order) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Pedido ${order.orderNumber}',
                  style: const TextStyle(
                      fontSize: 22, fontWeight: FontWeight.w800)),
              if (order.createdAt != null) ...[
                const SizedBox(height: 4),
                Text(Fmt.dateTime(order.createdAt!),
                    style:
                        const TextStyle(fontSize: 13, color: Neutral.n500)),
              ],
            ],
          ),
        ),
        const SizedBox(width: 12),
        StatusBadge(order.status),
      ],
    );
  }

  Widget _itemsCard(Order order) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Productos',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 12),
          if (order.items.isEmpty)
            const Text('Sin productos', style: TextStyle(color: Neutral.n500))
          else
            ...order.items.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${item.quantity}× ${item.productName}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                            const SizedBox(height: 2),
                            Text('${Fmt.money(item.unitPrice)} c/u',
                                style: const TextStyle(
                                    fontSize: 12, color: Neutral.n500)),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(Fmt.money(item.subtotal),
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                )),
        ],
      ),
    );
  }

  Widget _timelineCard(Order order) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Seguimiento',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 12),
          if (order.timeline.isEmpty)
            const Text('Aún no hay eventos',
                style: TextStyle(color: Neutral.n500))
          else
            ...List.generate(order.timeline.length, (i) {
              final event = order.timeline[i];
              final isLast = i == order.timeline.length - 1;
              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 20,
                          height: 20,
                          decoration: const BoxDecoration(
                            color: BrandColors.c500,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.check,
                              size: 12, color: Colors.white),
                        ),
                        if (!isLast)
                          Expanded(
                            child: Container(width: 2, color: Neutral.n200),
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(event.title,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                            if (event.description != null &&
                                event.description!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(event.description!,
                                    style: const TextStyle(
                                        fontSize: 13, color: Neutral.n500)),
                              ),
                            if (event.timestamp != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(Fmt.dateTime(event.timestamp!),
                                    style: const TextStyle(
                                        fontSize: 11, color: Neutral.n400)),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _customerCard(Order order) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Cliente',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 10),
          Text(
            order.customerName?.isNotEmpty == true ? order.customerName! : '—',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          if (order.customerPhone != null && order.customerPhone!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(order.customerPhone!,
                  style: const TextStyle(fontSize: 13, color: Neutral.n500)),
            ),
          const SizedBox(height: 12),
          _miniLabel('Dirección'),
          Text(order.deliveryAddress,
              style: const TextStyle(fontSize: 14, color: Neutral.n700)),
          if (order.driverName != null && order.driverName!.isNotEmpty) ...[
            const SizedBox(height: 12),
            _miniLabel('Repartidor'),
            Text(order.driverName!,
                style: const TextStyle(fontSize: 14, color: Neutral.n700)),
          ],
          const SizedBox(height: 12),
          _miniLabel('Pago'),
          Row(
            children: [
              Icon(order.paymentMethod.icon, size: 16, color: Neutral.n500),
              const SizedBox(width: 6),
              Text(order.paymentMethod.label,
                  style: const TextStyle(fontSize: 14, color: Neutral.n700)),
            ],
          ),
          if (order.notes != null && order.notes!.isNotEmpty) ...[
            const SizedBox(height: 12),
            _miniLabel('Notas'),
            Text(order.notes!,
                style: const TextStyle(fontSize: 14, color: Neutral.n700)),
          ],
        ],
      ),
    );
  }

  Widget _miniLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Text(text,
          style: const TextStyle(fontSize: 12, color: Neutral.n500)),
    );
  }

  Widget _summaryCard(Order order) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Resumen',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 12),
          _summaryRow('Subtotal', Fmt.money(order.subtotal)),
          _summaryRow('Delivery', Fmt.money(order.deliveryFee)),
          _summaryRow('IGV', Fmt.money(order.tax)),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Divider(height: 1, color: Neutral.n200),
          ),
          _summaryRow('Total', Fmt.money(order.total), bold: true),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, {bool bold = false}) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
      fontSize: bold ? 16 : 14,
      color: bold ? Neutral.n900 : Neutral.n600,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text(value, style: style.copyWith(color: Neutral.n900)),
        ],
      ),
    );
  }

  Widget _statusActions(Order order) {
    final allowed = _nextStatusesAdmin[order.status] ?? const [];

    // Desde `ready` (listo) o `on_the_way` (en ruta) el administrador ya no
    // controla el flujo: lo avanza el repartidor.
    if (allowed.isEmpty) {
      if (order.status == OrderStatus.ready ||
          order.status == OrderStatus.onTheWay) {
        return _driverFlowInfo(order);
      }
      return const SizedBox.shrink();
    }

    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Cambiar estado',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 12),
          ...allowed.map((next) {
            final danger = next == OrderStatus.canceled;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _updating ? null : () => _moveTo(next),
                  style: FilledButton.styleFrom(
                    backgroundColor:
                        danger ? const Color(0xFFB91C1C) : BrandColors.c500,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: _updating
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : Text('→ ${next.label}',
                          style:
                              const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _driverFlowInfo(Order order) {
    final estado =
        order.status == OrderStatus.ready ? 'listo para entrega' : 'en ruta';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('El repartidor controla el flujo',
              style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  color: Color(0xFF1E40AF))),
          const SizedBox(height: 6),
          Text(
            '🛵 El pedido está $estado. Ahora le toca al repartidor avanzar el estado.',
            style: const TextStyle(fontSize: 13, color: Color(0xFF1D4ED8)),
          ),
        ],
      ),
    );
  }
}
