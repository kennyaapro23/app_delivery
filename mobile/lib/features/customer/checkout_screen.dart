import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/config.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/address.dart';
import 'package:chikenhot/models/cart.dart';
import 'package:chikenhot/models/delivery.dart';
import 'package:chikenhot/models/order.dart';
import 'package:chikenhot/models/product.dart';
import 'package:chikenhot/providers/cart_provider.dart';
import 'package:chikenhot/services/addresses_service.dart';
import 'package:chikenhot/services/coupons_service.dart';
import 'package:chikenhot/services/orders_service.dart';
import 'package:chikenhot/services/products_service.dart';
import 'package:chikenhot/widgets/common.dart';
import 'package:chikenhot/widgets/map/location_picker.dart';

const double _kFallbackDeliveryFee = 5;

/// Sentinel para "Usar una ubicación nueva (mapa)" en el selector de dirección.
const int _kNewLocationId = -1;

class _AppliedCoupon {
  _AppliedCoupon(this.code, this.discount);
  final String code;
  final double discount;
}

/// Pantalla de checkout — espejo de frontend/src/pages/CheckoutPage.tsx.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  List<Address> _addresses = [];
  int _selectedAddressId = _kNewLocationId; // -1 = ubicación nueva (mapa)
  PickedLocation? _location;

  final _detailCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _couponCtrl = TextEditingController();

  PaymentMethod _payment = PaymentMethod.efectivo;

  _AppliedCoupon? _applied;
  String? _couponError;
  bool _applyingCoupon = false;

  bool _placing = false;
  String? _error;

  CalculateFeeResult? _feePreview;
  bool _feeLoading = false;
  int _feeSeq = 0;
  String? _priceChangeWarning;

  @override
  void initState() {
    super.initState();
    _refreshPrices();
    _loadAddresses();
  }

  @override
  void dispose() {
    _detailCtrl.dispose();
    _notesCtrl.dispose();
    _couponCtrl.dispose();
    super.dispose();
  }

  double get _subtotal => ref.read(cartSubtotalProvider);

  // ── Refresco de precios al montar ──────────────────────────────
  // Sin esto el cliente vería el precio cacheado mientras el backend
  // cobra el precio actual — discrepancia entre lo mostrado y lo facturado.
  Future<void> _refreshPrices() async {
    final items = ref.read(cartProvider);
    if (items.isEmpty) return;
    final ids = items.map((i) => i.product.id).toList();
    final fresh = await Future.wait(ids.map(
      (id) => ProductsService.product(id)
          .then<Product?>((p) => p)
          .catchError((_) => null),
    ));
    if (!mounted) return;
    final valid = fresh.whereType<Product>().toList();
    if (valid.isEmpty) return;
    final changed = valid.where((p) {
      final local = items.where((i) => i.product.id == p.id).firstOrNull;
      return local != null && (local.product.price - p.price).abs() > 0.005;
    }).toList();
    ref.read(cartProvider.notifier).replaceProducts(valid);
    if (changed.isNotEmpty) {
      final names = changed.map((p) => p.name).join(', ');
      setState(() {
        _priceChangeWarning =
            'Los precios de $names se actualizaron. Revisa tu pedido antes de confirmar.';
      });
      // El subtotal pudo cambiar: revalida el cupón contra el nuevo subtotal
      // para que el descuento mostrado coincida con el que aplica el backend
      // (que descarta el cupón si cae bajo min_order_amount, o recalcula el %).
      if (_applied != null) await _revalidateCoupon();
    }
  }

  // Revalida el cupón ya aplicado contra el subtotal actual.
  Future<void> _revalidateCoupon() async {
    final code = _applied?.code;
    if (code == null) return;
    try {
      final res = await CouponsService.apply(code, _subtotal);
      if (!mounted) return;
      setState(() {
        if (res.valid) {
          _applied = _AppliedCoupon(code, res.discount);
        } else {
          _applied = null;
          _couponError = res.message;
        }
      });
    } catch (_) {
      // Ante un fallo de red, no descartamos el cupón silenciosamente; el
      // backend lo validará de nuevo al crear el pedido.
    }
  }

  Future<void> _loadAddresses() async {
    try {
      final list = await AddressesService.list();
      if (!mounted) return;
      setState(() {
        _addresses = list;
        final stillExists =
            _selectedAddressId != _kNewLocationId &&
                list.any((a) => a.id == _selectedAddressId);
        // Si la selección dejó de existir (editada/eliminada) o aún no había
        // selección, elegir la predeterminada / primera; si no hay, mapa.
        if (!stillExists) {
          final def = list.where((a) => a.isDefault).firstOrNull ??
              (list.isNotEmpty ? list.first : null);
          _selectedAddressId = def?.id ?? _kNewLocationId;
        }
      });
      _recalcFee();
    } catch (_) {
      // Sin direcciones guardadas, sigue con ubicación nueva (mapa).
    }
  }

  // ── Recalcula el delivery según la ubicación de entrega ────────
  Future<void> _recalcFee() async {
    double? lat;
    double? lon;
    String? address;
    if (_selectedAddressId == _kNewLocationId) {
      final loc = _location;
      if (loc == null) {
        setState(() => _feePreview = null);
        return;
      }
      lat = loc.lat;
      lon = loc.lon;
    } else {
      final a = _addresses.where((x) => x.id == _selectedAddressId).firstOrNull;
      if (a == null) {
        setState(() => _feePreview = null);
        return;
      }
      if (a.hasCoords) {
        lat = a.latitude;
        lon = a.longitude;
      } else {
        address = a.fullAddress;
      }
    }

    final seq = ++_feeSeq;
    setState(() => _feeLoading = true);
    try {
      final res = await OrdersService.calculateFee(
        latitude: lat,
        longitude: lon,
        address: address,
      );
      if (!mounted || seq != _feeSeq) return;
      setState(() => _feePreview = res);
    } catch (_) {
      if (!mounted || seq != _feeSeq) return;
      setState(() => _feePreview = null);
    } finally {
      // Apaga el spinner si esta es la petición vigente. Si una petición
      // nueva la superó, el seq actual (_feeSeq) pertenece a esa otra y será
      // ella quien cierre su propio loading; así el spinner nunca queda colgado.
      if (mounted && seq == _feeSeq) setState(() => _feeLoading = false);
    }
  }

  /// True cuando la tarifa se calcula por coords (ubicación nueva, o dirección
  /// guardada con coords). En estos casos exigimos un preview válido antes de
  /// confirmar para que el total mostrado coincida con el que cobra el backend.
  bool get _requiresFee {
    if (_selectedAddressId == _kNewLocationId) return _location != null;
    final a = _addresses.where((x) => x.id == _selectedAddressId).firstOrNull;
    return a != null && a.hasCoords;
  }

  double get _deliveryFee => _feePreview?.fee ?? _kFallbackDeliveryFee;
  double get _tax => _subtotal * AppConfig.taxRate;
  double get _total =>
      (_subtotal + _deliveryFee + _tax - (_applied?.discount ?? 0))
          .clamp(0, double.infinity)
          .toDouble();

  // ── Cupón ──────────────────────────────────────────────────────
  Future<void> _applyCoupon() async {
    final code = _couponCtrl.text.trim();
    if (code.isEmpty) return;
    setState(() {
      _applyingCoupon = true;
      _couponError = null;
    });
    try {
      final res = await CouponsService.apply(code, _subtotal);
      if (!mounted) return;
      if (res.valid) {
        setState(() {
          _applied = _AppliedCoupon(code.toUpperCase(), res.discount);
          _couponError = null;
        });
      } else {
        setState(() {
          _couponError = res.message;
          _applied = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _couponError = getErrorMessage(e));
    } finally {
      if (mounted) setState(() => _applyingCoupon = false);
    }
  }

  void _removeCoupon() {
    setState(() {
      _applied = null;
      _couponError = null;
    });
    _couponCtrl.clear();
  }

  // ── Construcción del delivery_address (contrato de coords) ─────
  String? _resolveDeliveryAddress() {
    if (_selectedAddressId != _kNewLocationId) {
      final a = _addresses.where((x) => x.id == _selectedAddressId).firstOrNull;
      if (a == null) return null;
      final parts = <String>[
        if (a.label.isNotEmpty) '[${a.label}]',
        if (a.fullAddress.isNotEmpty) a.fullAddress,
        if (a.reference != null && a.reference!.isNotEmpty) a.reference!,
        if (a.latitude != null && a.longitude != null)
          '(${a.latitude!.toStringAsFixed(6)}, ${a.longitude!.toStringAsFixed(6)})',
      ];
      if (parts.isEmpty) return null;
      return parts.join(' — ');
    }
    final loc = _location;
    if (loc == null) return null;
    final detail = _detailCtrl.text.trim();
    final parts = <String>[
      if (loc.address.isNotEmpty) loc.address,
      if (detail.isNotEmpty) detail,
      '(${loc.lat.toStringAsFixed(6)}, ${loc.lon.toStringAsFixed(6)})',
    ];
    return parts.join(' — ');
  }

  // ── Confirmar pedido ───────────────────────────────────────────
  Future<void> _submit() async {
    final items = ref.read(cartProvider);
    if (items.isEmpty) return;
    final fullAddress = _resolveDeliveryAddress();
    if (fullAddress == null) {
      setState(() =>
          _error = 'Selecciona una dirección o ubica tu entrega en el mapa');
      return;
    }
    // No permitir confirmar mientras se calcula el envío, ni con un fallback
    // (S/5) cuando la tarifa depende de coords: el backend recalcula por
    // distancia y el total mostrado debe coincidir con el cobrado.
    if (_feeLoading) {
      setState(() => _error = 'Calculando el costo de envío…');
      return;
    }
    if (_requiresFee && _feePreview == null) {
      setState(() => _error =
          'No se pudo calcular el costo de envío. Inténtalo de nuevo.');
      _recalcFee();
      return;
    }
    setState(() {
      _placing = true;
      _error = null;
    });
    try {
      final order = await OrdersService.create(
        items: items
            .map((i) => {'product_id': i.product.id, 'quantity': i.quantity})
            .toList(),
        deliveryAddress: fullAddress,
        paymentMethod: _payment.api,
        notes: _notesCtrl.text.trim(),
        couponCode: _applied?.code,
      );
      if (!mounted) return;
      ref.read(cartProvider.notifier).clear();
      context.go('/orders/${order.id}');
    } catch (e) {
      if (mounted) setState(() => _error = getErrorMessage(e));
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(cartProvider);
    final subtotal = ref.watch(cartSubtotalProvider);

    if (items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Finalizar pedido')),
        body: EmptyView(
          message: 'No tienes productos en el carrito',
          icon: Icons.shopping_cart_outlined,
          action: ElevatedButton.icon(
            onPressed: () => context.go('/'),
            icon: const Icon(Icons.restaurant_menu),
            label: const Text('Ir al menú'),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Finalizar pedido')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          if (_priceChangeWarning != null) ...[
            _PriceWarning(_priceChangeWarning!),
            const SizedBox(height: 16),
          ],
          _buildAddressSection(),
          const SizedBox(height: 16),
          _buildPaymentSection(),
          const SizedBox(height: 16),
          _buildNotesSection(),
          const SizedBox(height: 16),
          _buildSummary(items, subtotal),
          if (_error != null) ...[
            const SizedBox(height: 12),
            _ErrorBox(_error!),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed:
                  (_placing || _feeLoading || (_requiresFee && _feePreview == null))
                      ? null
                      : _submit,
              child: _placing
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Confirmar pedido'),
            ),
          ),
        ],
      ),
    );
  }

  // ── Dirección de entrega ───────────────────────────────────────
  Widget _buildAddressSection() {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text('📍 Dirección de entrega',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
              TextButton(
                onPressed: () async {
                  await context.push('/addresses');
                  // Al volver, las direcciones pudieron cambiar (editar/eliminar):
                  // recargar y revalidar la selección actual.
                  if (mounted) _loadAddresses();
                },
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Gestionar direcciones',
                    style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (final a in _addresses) _addressTile(a),
          _newLocationTile(),
          if (_selectedAddressId == _kNewLocationId) ...[
            const SizedBox(height: 12),
            LocationPicker(
              initial: _location,
              onChanged: (loc) {
                final prev = _location;
                final moved = prev == null ||
                    (prev.lat - loc.lat).abs() > 1e-6 ||
                    (prev.lon - loc.lon).abs() > 1e-6;
                // Siempre sincroniza estado y render con la ubicación nueva,
                // aunque solo cambie el texto (geocoding inverso) y no las coords.
                setState(() => _location = loc);
                if (moved) _recalcFee();
              },
            ),
            const SizedBox(height: 12),
            const Text('Referencia / detalle (opcional)',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            TextField(
              controller: _detailCtrl,
              decoration: const InputDecoration(
                hintText: 'Dpto 4B, frente al parque, tocar timbre',
                isDense: true,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _addressTile(Address a) {
    final selected = _selectedAddressId == a.id;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          setState(() => _selectedAddressId = a.id);
          _recalcFee();
        },
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: selected ? BrandColors.c50 : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? BrandColors.c500 : Neutral.n200,
              width: 2,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _RadioDot(selected: selected),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.place,
                            size: 14, color: BrandColors.c500),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(a.label,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 14)),
                        ),
                        if (a.isDefault) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: BrandColors.c100,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text('Predet.',
                                style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: BrandColors.c700)),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(a.fullAddress,
                        style: const TextStyle(
                            fontSize: 13, color: Neutral.n600)),
                    if (a.reference != null && a.reference!.isNotEmpty)
                      Text(a.reference!,
                          style: const TextStyle(
                              fontSize: 11, color: Neutral.n500)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _newLocationTile() {
    final selected = _selectedAddressId == _kNewLocationId;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () {
        setState(() => _selectedAddressId = _kNewLocationId);
        _recalcFee();
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? BrandColors.c50 : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? BrandColors.c500 : Neutral.n300,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            _RadioDot(selected: selected),
            const SizedBox(width: 10),
            const Icon(Icons.add_location_alt_outlined, size: 18),
            const SizedBox(width: 8),
            const Expanded(
              child: Text('Usar una ubicación nueva (mapa)',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }

  // ── Método de pago ─────────────────────────────────────────────
  Widget _buildPaymentSection() {
    const opts = <(PaymentMethod, String, String)>[
      (PaymentMethod.efectivo, '💵', 'Efectivo'),
      (PaymentMethod.yape, '📱', 'Yape'),
      (PaymentMethod.tarjeta, '💳', 'Tarjeta'),
    ];
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('💳 Método de pago',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Row(
            children: [
              for (var i = 0; i < opts.length; i++) ...[
                Expanded(
                    child:
                        _paymentTile(opts[i].$1, opts[i].$2, opts[i].$3)),
                if (i < opts.length - 1) const SizedBox(width: 10),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _paymentTile(PaymentMethod value, String icon, String label) {
    final selected = _payment == value;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => setState(() => _payment = value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? BrandColors.c50 : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? BrandColors.c500 : Neutral.n200,
            width: 2,
          ),
        ),
        child: Column(
          children: [
            Text(icon, style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 4),
            Text(label,
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  // ── Notas ──────────────────────────────────────────────────────
  Widget _buildNotesSection() {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('📝 Notas (opcional)',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          TextField(
            controller: _notesCtrl,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Sin cebolla, dejar en recepción, etc.',
              isDense: true,
            ),
          ),
        ],
      ),
    );
  }

  // ── Resumen del pedido ─────────────────────────────────────────
  Widget _buildSummary(List<CartItem> items, double subtotal) {
    final preview = _feePreview;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Tu pedido',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text('${item.quantity}× ${item.product.name}',
                        style: const TextStyle(fontSize: 13),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ),
                  const SizedBox(width: 8),
                  Text(Fmt.money(item.product.price * item.quantity),
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          const Divider(height: 24),
          _buildCoupon(),
          const SizedBox(height: 16),
          _summaryRow('Subtotal', Fmt.money(subtotal)),
          const SizedBox(height: 6),
          Row(
            children: [
              const Text('Delivery',
                  style: TextStyle(fontSize: 13, color: Neutral.n600)),
              if (_feeLoading) ...[
                const SizedBox(width: 8),
                const SizedBox(
                  height: 12,
                  width: 12,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ],
              const Spacer(),
              Text(Fmt.money(_deliveryFee),
                  style: const TextStyle(fontSize: 13)),
            ],
          ),
          if (preview?.distanceKm != null) ...[
            const SizedBox(height: 4),
            _distanceNote(preview!),
          ],
          const SizedBox(height: 6),
          _summaryRow('IGV (18%)', Fmt.money(_tax)),
          if (_applied != null) ...[
            const SizedBox(height: 6),
            _summaryRow(
              'Descuento (${_applied!.code})',
              '-${Fmt.money(_applied!.discount)}',
              color: const Color(0xFF15803D),
            ),
          ],
          const Divider(height: 24),
          Row(
            children: [
              const Text('Total',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const Spacer(),
              Text(Fmt.money(_total),
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w800)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _distanceNote(CalculateFeeResult preview) {
    final atMin = (preview.fee - preview.min).abs() < 0.01 &&
        preview.rawFee != null &&
        preview.rawFee! < preview.min;
    final atMax = (preview.fee - preview.max).abs() < 0.01 &&
        preview.rawFee != null &&
        preview.rawFee! > preview.max;
    return Padding(
      padding: const EdgeInsets.only(left: 2),
      child: Text.rich(
        TextSpan(
          style: const TextStyle(fontSize: 11, color: Neutral.n500),
          children: [
            TextSpan(text: '📏 ${preview.distanceKm} km desde el restaurante'),
            if (atMin)
              const TextSpan(
                text: ' · tarifa mínima',
                style: TextStyle(color: Color(0xFF15803D)),
              ),
            if (atMax)
              const TextSpan(
                text: ' · tope máximo',
                style: TextStyle(color: Color(0xFFEA580C)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value, {Color? color}) {
    return Row(
      children: [
        Text(label,
            style: TextStyle(fontSize: 13, color: color ?? Neutral.n600)),
        const Spacer(),
        Text(value,
            style: TextStyle(
                fontSize: 13,
                color: color,
                fontWeight:
                    color != null ? FontWeight.w700 : FontWeight.w500)),
      ],
    );
  }

  // ── Cupón (UI dentro del resumen) ──────────────────────────────
  Widget _buildCoupon() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.local_offer_outlined, size: 14, color: Neutral.n500),
            SizedBox(width: 4),
            Text('CUPÓN',
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Neutral.n500,
                    letterSpacing: 0.5)),
          ],
        ),
        const SizedBox(height: 8),
        if (_applied != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_applied!.code,
                          style: const TextStyle(
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF15803D))),
                      Text('-${Fmt.money(_applied!.discount)}',
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF16A34A))),
                    ],
                  ),
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: _removeCoupon,
                  icon: const Icon(Icons.close,
                      size: 18, color: Color(0xFFEF4444)),
                ),
              ],
            ),
          )
        else
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _couponCtrl,
                  textCapitalization: TextCapitalization.characters,
                  onChanged: (v) {
                    final up = v.toUpperCase();
                    if (up != v) {
                      _couponCtrl.value = TextEditingValue(
                        text: up,
                        selection:
                            TextSelection.collapsed(offset: up.length),
                      );
                    }
                  },
                  decoration: const InputDecoration(
                    hintText: 'CÓDIGO',
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: _applyingCoupon ? null : _applyCoupon,
                child: _applyingCoupon
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Aplicar'),
              ),
            ],
          ),
        if (_couponError != null) ...[
          const SizedBox(height: 6),
          Text(_couponError!,
              style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626))),
        ],
      ],
    );
  }
}

class _PriceWarning extends StatelessWidget {
  const _PriceWarning(this.message);
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('⚠️', style: TextStyle(fontSize: 14)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message,
                style:
                    const TextStyle(fontSize: 13, color: Color(0xFF92400E))),
          ),
        ],
      ),
    );
  }
}

/// Indicador visual de selección (sin la API deprecada de Radio).
class _RadioDot extends StatelessWidget {
  const _RadioDot({required this.selected});
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 20,
      height: 20,
      margin: const EdgeInsets.only(top: 2),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: selected ? BrandColors.c500 : Neutral.n400,
          width: 2,
        ),
      ),
      child: selected
          ? Center(
              child: Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: BrandColors.c500,
                ),
              ),
            )
          : null,
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox(this.message);
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(message,
          style: const TextStyle(fontSize: 13, color: Color(0xFFB91C1C))),
    );
  }
}
