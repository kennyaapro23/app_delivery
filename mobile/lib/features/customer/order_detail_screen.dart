import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/order.dart';
import 'package:chikenhot/services/orders_service.dart';
import 'package:chikenhot/services/reviews_service.dart';
import 'package:chikenhot/widgets/common.dart';
import 'package:chikenhot/widgets/map/live_order_map.dart';

/// Detalle de un pedido del cliente: cabecera, tracking en vivo, productos,
/// línea de tiempo, resumen, datos de entrega y acciones
/// (descargar factura, calificar, cancelar).
class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  Order? _order;
  bool _loading = true;
  String? _error;

  bool _canceling = false;
  bool _downloading = false;
  bool _reviewSubmitted = false;

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
      final order = await OrdersService.get(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = order;
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

  void _snack(String message, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text(message),
        backgroundColor: error ? const Color(0xFFB91C1C) : const Color(0xFF15803D),
      ));
  }

  Future<void> _downloadInvoice() async {
    final order = _order;
    if (order == null || _downloading) return;
    setState(() => _downloading = true);
    try {
      final bytes = await OrdersService.invoicePdf(order.id);
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/factura-${order.orderNumber}.pdf');
      await file.writeAsBytes(bytes, flush: true);
      final result = await OpenFilex.open(file.path);
      if (result.type != ResultType.done) {
        _snack('No se pudo abrir la factura: ${result.message}', error: true);
      }
    } catch (e) {
      _snack(getErrorMessage(e), error: true);
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  Future<void> _cancelOrder() async {
    final order = _order;
    if (order == null || _canceling) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancelar pedido'),
        content: const Text('¿Cancelar este pedido? Esta acción no se puede deshacer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('No'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFB91C1C)),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Sí, cancelar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _canceling = true);
    try {
      final updated = await OrdersService.cancel(order.id);
      if (!mounted) return;
      setState(() => _order = updated);
      _snack('Pedido cancelado');
    } catch (e) {
      _snack(getErrorMessage(e), error: true);
    } finally {
      if (mounted) setState(() => _canceling = false);
    }
  }

  Future<void> _openReviewDialog() async {
    final order = _order;
    if (order == null) return;

    var rating = 5;
    final commentCtrl = TextEditingController();
    var submitting = false;
    String? reviewError;

    const labels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

    final bool? created;
    try {
      created = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            Future<void> submit() async {
              setLocal(() {
                submitting = true;
                reviewError = null;
              });
              try {
                await ReviewsService.create(
                  orderId: order.id,
                  rating: rating.toDouble(),
                  comment: commentCtrl.text.trim().isEmpty
                      ? null
                      : commentCtrl.text.trim(),
                );
                if (ctx.mounted) Navigator.of(ctx).pop(true);
              } catch (e) {
                setLocal(() {
                  reviewError = getErrorMessage(e);
                  submitting = false;
                });
              }
            }

            return AlertDialog(
              title: const Text('¿Qué te pareció?'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Center(
                    child: Column(
                      children: [
                        StarRating(
                          value: rating.toDouble(),
                          size: 36,
                          onChanged: (v) => setLocal(() => rating = v),
                        ),
                        const SizedBox(height: 8),
                        Text(labels[rating],
                            style: const TextStyle(color: Neutral.n500)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: commentCtrl,
                    minLines: 3,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Comentario (opcional)',
                      hintText: 'Cuéntanos cómo fue tu experiencia...',
                      border: OutlineInputBorder(),
                      alignLabelWithHint: true,
                    ),
                  ),
                  if (reviewError != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(reviewError!,
                          style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13)),
                    ),
                  ],
                ],
              ),
              actions: [
                TextButton(
                  onPressed: submitting ? null : () => Navigator.of(ctx).pop(false),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BrandColors.c500),
                  onPressed: submitting ? null : submit,
                  child: submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Publicar reseña'),
                ),
              ],
            );
          },
        );
      },
    );
    } finally {
      // Garantiza la liberación del controller aunque la continuación se
      // interrumpa (p.ej. la ruta se elimina mientras el diálogo está abierto).
      commentCtrl.dispose();
    }

    if (created == true && mounted) {
      setState(() => _reviewSubmitted = true);
      _snack('¡Gracias por tu reseña!');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Neutral.n50,
      appBar: AppBar(
        title: const Text('Detalle del pedido'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Mis pedidos',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/orders');
            }
          },
        ),
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

    final canCancel = order.status == OrderStatus.pending ||
        order.status == OrderStatus.accepted ||
        order.status == OrderStatus.preparing;
    final canReview =
        order.status == OrderStatus.delivered && !_reviewSubmitted;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _header(order),
          const SizedBox(height: 16),
          if (_reviewSubmitted) ...[
            _successBanner('¡Gracias por tu reseña!'),
            const SizedBox(height: 16),
          ],
          if (order.status.isActive) ...[
            const Text('📡 Seguimiento en vivo',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: LiveOrderMap(orderId: order.id, refreshSeconds: 10, height: 300),
            ),
            const SizedBox(height: 16),
          ],
          _itemsCard(order),
          const SizedBox(height: 16),
          _timelineCard(order),
          const SizedBox(height: 16),
          _summaryCard(order),
          const SizedBox(height: 16),
          _deliveryCard(order),
          const SizedBox(height: 20),
          _actions(order, canCancel: canCancel, canReview: canReview),
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
              Text('Pedido #${order.orderNumber}',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              if (order.createdAt != null)
                Text('Realizado el ${Fmt.dateTime(order.createdAt!)}',
                    style: const TextStyle(fontSize: 13, color: Neutral.n500)),
            ],
          ),
        ),
        const SizedBox(width: 12),
        StatusBadge(order.status),
      ],
    );
  }

  Widget _successBanner(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFDCFCE7),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle, color: Color(0xFF15803D), size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: const TextStyle(color: Color(0xFF166534), fontWeight: FontWeight.w600)),
          ),
        ],
      ),
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
                                style: const TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 2),
                            Text('${Fmt.money(item.unitPrice)} c/u',
                                style: const TextStyle(fontSize: 12, color: Neutral.n500)),
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
            const Text('Aún no hay eventos', style: TextStyle(color: Neutral.n500))
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
                          child: const Icon(Icons.check, size: 12, color: Colors.white),
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
                                style: const TextStyle(fontWeight: FontWeight.w600)),
                            if (event.description != null && event.description!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(event.description!,
                                    style: const TextStyle(fontSize: 13, color: Neutral.n500)),
                              ),
                            if (event.timestamp != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(Fmt.dateTime(event.timestamp!),
                                    style: const TextStyle(fontSize: 11, color: Neutral.n400)),
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

  Widget _deliveryCard(Order order) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Entrega',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 12),
          _infoRow(Icons.location_on_outlined, order.deliveryAddress),
          const SizedBox(height: 10),
          _infoRow(order.paymentMethod.icon, order.paymentMethod.label),
          if (order.driverName != null && order.driverName!.isNotEmpty) ...[
            const SizedBox(height: 10),
            _infoRow(
              Icons.phone_outlined,
              'Repartidor: ${order.driverName}'
              '${order.driverPhone != null && order.driverPhone!.isNotEmpty ? ' · ${order.driverPhone}' : ''}',
            ),
          ],
          if (order.notes != null && order.notes!.isNotEmpty) ...[
            const SizedBox(height: 10),
            _infoRow(Icons.sticky_note_2_outlined, order.notes!),
          ],
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Neutral.n400),
        const SizedBox(width: 8),
        Expanded(
          child: Text(text, style: const TextStyle(fontSize: 14, color: Neutral.n700)),
        ),
      ],
    );
  }

  Widget _actions(Order order, {required bool canCancel, required bool canReview}) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _downloading ? null : _downloadInvoice,
            icon: _downloading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.file_download_outlined),
            label: const Text('Descargar factura'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              foregroundColor: Neutral.n700,
              side: const BorderSide(color: Neutral.n300),
            ),
          ),
        ),
        if (canReview) ...[
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _openReviewDialog,
              icon: const Icon(Icons.star_outline),
              label: const Text('Calificar pedido'),
              style: FilledButton.styleFrom(
                backgroundColor: BrandColors.c500,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ],
        if (canCancel) ...[
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _canceling ? null : _cancelOrder,
              icon: _canceling
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.cancel_outlined),
              label: const Text('Cancelar pedido'),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFB91C1C),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
