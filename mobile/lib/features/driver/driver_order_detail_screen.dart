import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/order.dart';
import 'package:chikenhot/services/delivery_service.dart';
import 'package:chikenhot/services/orders_service.dart';
import 'package:chikenhot/widgets/common.dart';
import 'package:chikenhot/widgets/map/live_order_map.dart';

/// Coordenadas embebidas en `delivery_address` → `(lat, lon)`.
final _coordsRe = RegExp(r'\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)');

/// Detalle de un pedido asignado al repartidor.
///
/// - Carga el pedido con `OrdersService.get` y auto-refresca cada 10s mientras
///   el estado siga activo (para ver cuando admin lo marca como `ready`).
/// - Muestra el mapa de tracking en vivo + accesos directos a Google Maps/Waze
///   cuando la dirección tiene coordenadas embebidas.
/// - Datos del cliente (llamada con un toque, dirección, pago, notas).
/// - Productos + total a cobrar + línea de tiempo.
/// - Acciones: recoger (ready → en ruta) y marcar como entregado (en ruta).
class DriverOrderDetailScreen extends ConsumerStatefulWidget {
  const DriverOrderDetailScreen({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<DriverOrderDetailScreen> createState() =>
      _DriverOrderDetailScreenState();
}

class _DriverOrderDetailScreenState
    extends ConsumerState<DriverOrderDetailScreen> {
  Order? _order;
  bool _loading = true;
  bool _updating = false;
  String? _error;

  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _load(showLoading: true);
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool showLoading = false}) async {
    if (showLoading) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final order = await OrdersService.get(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = order;
        _loading = false;
      });
      _syncPolling();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = getErrorMessage(e);
        _loading = false;
      });
    }
  }

  /// Arranca/detiene el polling de 10s según el estado del pedido.
  void _syncPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
    if (_order?.status.isActive ?? false) {
      _pollTimer = Timer.periodic(
        const Duration(seconds: 10),
        (_) => _poll(),
      );
    }
  }

  /// Refresco silencioso (sin spinner, ignora errores transitorios).
  Future<void> _poll() async {
    try {
      final order = await OrdersService.get(widget.orderId);
      if (!mounted) return;
      setState(() => _order = order);
      _syncPolling();
    } catch (_) {
      // Silencioso: el siguiente tick reintenta.
    }
  }

  Future<void> _pickUp() async {
    final order = _order;
    if (order == null) return;
    setState(() => _updating = true);
    try {
      // ready → on_the_way (PATCH /orders/:id/status — repartidor autorizado).
      final updated =
          await OrdersService.updateStatus(order.id, OrderStatus.onTheWay);
      if (!mounted) return;
      setState(() => _order = updated);
      _syncPolling();
    } catch (e) {
      if (!mounted) return;
      _showError(getErrorMessage(e));
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<void> _complete() async {
    final order = _order;
    if (order == null) return;
    setState(() => _updating = true);
    try {
      await DeliveryService.complete(order.id);
      // Refresca el pedido para ver el timeline actualizado.
      final fresh = await OrdersService.get(order.id);
      if (!mounted) return;
      setState(() => _order = fresh);
      _syncPolling();
    } catch (e) {
      if (!mounted) return;
      _showError(getErrorMessage(e));
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _launch(Uri uri) async {
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      _showError('No se pudo abrir la aplicación');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(
          onPressed: () => context.pop(),
        ),
        title: Text(_order != null ? 'Pedido ${_order!.orderNumber}' : 'Pedido'),
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
        onRetry: () => _load(showLoading: true),
      );
    }

    final canPickUp = order.status == OrderStatus.ready;
    final canDeliver = order.status == OrderStatus.onTheWay;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _header(order),
          const SizedBox(height: 16),
          ..._routeSection(order),
          _customerCard(order),
          const SizedBox(height: 16),
          _itemsCard(order),
          const SizedBox(height: 16),
          _timelineCard(order),
          if (canPickUp || canDeliver) ...[
            const SizedBox(height: 20),
            if (canPickUp)
              _actionButton(
                icon: Icons.local_shipping_outlined,
                label: 'Recoger y salir en ruta → ${OrderStatus.onTheWay.label}',
                onPressed: _pickUp,
              ),
            if (canDeliver)
              _actionButton(
                icon: Icons.check_circle_outline,
                label: 'Marcar como entregado',
                onPressed: _complete,
              ),
          ],
          const SizedBox(height: 16),
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
              Text(
                'Pedido ${order.orderNumber}',
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
              ),
              if (order.createdAt != null) ...[
                const SizedBox(height: 2),
                Text(
                  Fmt.dateTime(order.createdAt!),
                  style: const TextStyle(fontSize: 12, color: Neutral.n500),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 8),
        StatusBadge(order.status),
      ],
    );
  }

  /// Mapa de ruta + accesos a Google Maps / Waze cuando hay coordenadas.
  List<Widget> _routeSection(Order order) {
    final m = _coordsRe.firstMatch(order.deliveryAddress);
    if (m == null) return const [];
    final lat = double.parse(m.group(1)!);
    final lon = double.parse(m.group(2)!);

    final gmaps = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$lat,$lon&travelmode=driving',
    );
    final waze = Uri.parse('https://waze.com/ul?ll=$lat,$lon&navigate=yes');

    return [
      const Text(
        '📍 Ruta hacia el cliente',
        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
      const SizedBox(height: 8),
      ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: LiveOrderMap(orderId: widget.orderId, refreshSeconds: 10, height: 260),
      ),
      const SizedBox(height: 10),
      Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _launch(gmaps),
              icon: const Icon(Icons.navigation_outlined, size: 18),
              label: const Text('Abrir en Google Maps'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _launch(waze),
              icon: const Icon(Icons.navigation_outlined, size: 18),
              label: const Text('Abrir en Waze'),
            ),
          ),
        ],
      ),
      const SizedBox(height: 16),
    ];
  }

  Widget _customerCard(Order order) {
    final phone = order.customerPhone;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Cliente',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
          ),
          const SizedBox(height: 10),
          Text(
            order.customerName ?? 'Cliente',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          if (phone != null && phone.isNotEmpty) ...[
            const SizedBox(height: 6),
            InkWell(
              onTap: () => _launch(Uri.parse('tel:$phone')),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.phone, size: 15, color: BrandColors.c600),
                    const SizedBox(width: 6),
                    Text(
                      phone,
                      style: const TextStyle(
                        color: BrandColors.c600,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 2),
                child: Icon(Icons.location_on_outlined,
                    size: 18, color: Neutral.n400),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  order.deliveryAddress,
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(order.paymentMethod.icon, size: 18, color: Neutral.n400),
              const SizedBox(width: 8),
              Text(
                order.paymentMethod.label,
                style: const TextStyle(fontSize: 14),
              ),
              if (order.paymentMethod == PaymentMethod.efectivo) ...[
                const SizedBox(width: 6),
                Text(
                  '· Cobrar ${Fmt.money(order.total)}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFEA580C),
                  ),
                ),
              ],
            ],
          ),
          if (order.notes != null && order.notes!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFFEFCE8),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '📝 ${order.notes!}',
                style: const TextStyle(fontSize: 12, color: Color(0xFF854D0E)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _itemsCard(Order order) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Productos',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
          ),
          const SizedBox(height: 8),
          ...order.items.map(
            (it) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${it.quantity}× ${it.productName}',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                  Text(
                    Fmt.money(it.subtotal),
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text(
                'Total a cobrar',
                style: TextStyle(fontSize: 13, color: Neutral.n500),
              ),
              Text(
                Fmt.money(order.total),
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _timelineCard(Order order) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Seguimiento',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
          ),
          const SizedBox(height: 12),
          if (order.timeline.isEmpty)
            const Text(
              'Sin eventos todavía',
              style: TextStyle(fontSize: 13, color: Neutral.n500),
            )
          else
            ...List.generate(order.timeline.length, (i) {
              final ev = order.timeline[i];
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
                          const Expanded(
                            child: VerticalDivider(
                              width: 2,
                              thickness: 2,
                              color: Neutral.n200,
                            ),
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
                            Text(
                              ev.title,
                              style: const TextStyle(
                                  fontSize: 14, fontWeight: FontWeight.w600),
                            ),
                            if (ev.timestamp != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                Fmt.dateTime(ev.timestamp!),
                                style: const TextStyle(
                                    fontSize: 11, color: Neutral.n400),
                              ),
                            ],
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

  Widget _actionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _updating ? null : onPressed,
        icon: _updating
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white),
              )
            : Icon(icon, size: 18),
        label: Text(label, textAlign: TextAlign.center),
      ),
    );
  }
}
