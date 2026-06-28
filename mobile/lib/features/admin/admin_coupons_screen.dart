import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/coupon.dart';
import 'package:chikenhot/services/coupons_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// Panel de administración de cupones (`/admin/coupons`).
/// Lista los cupones y permite crear nuevos. Render dentro de AdminShell (sin AppBar).
class AdminCouponsScreen extends ConsumerStatefulWidget {
  const AdminCouponsScreen({super.key});

  @override
  ConsumerState<AdminCouponsScreen> createState() => _AdminCouponsScreenState();
}

class _AdminCouponsScreenState extends ConsumerState<AdminCouponsScreen> {
  bool _loading = true;
  String? _error;
  List<Coupon> _coupons = const [];

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
      final coupons = await CouponsService.list();
      if (!mounted) return;
      setState(() {
        _coupons = coupons;
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

  Future<void> _openCreate() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _CouponFormSheet(),
    );
    if (created == true) {
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Neutral.n50,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        backgroundColor: BrandColors.c500,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Nuevo cupón'),
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
      return const LoadingView(message: 'Cargando cupones…');
    }
    if (_error != null) {
      return ListView(
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          ErrorView(message: _error!, onRetry: _load),
        ],
      );
    }
    if (_coupons.isEmpty) {
      return ListView(
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          const EmptyView(
            message: 'No hay cupones activos',
            icon: Icons.local_offer_outlined,
          ),
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      itemCount: _coupons.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _CouponCard(_coupons[i]),
    );
  }
}

/// Tarjeta de cupón con código, estado, descuento, mínimo, usos y expiración.
class _CouponCard extends StatelessWidget {
  const _CouponCard(this.coupon);
  final Coupon coupon;

  String get _discountLabel {
    final pct = coupon.discountPercent;
    if (pct != null && pct > 0) {
      final s = pct == pct.roundToDouble() ? pct.toInt().toString() : pct.toString();
      return '$s% off';
    }
    return '${Fmt.money(coupon.discountAmount ?? 0)} off';
  }

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  coupon.code,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: BrandColors.c600,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              _StatusChip(active: coupon.isActive),
            ],
          ),
          if ((coupon.description ?? '').isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              coupon.description!,
              style: const TextStyle(fontSize: 13, color: Neutral.n500),
            ),
          ],
          const SizedBox(height: 12),
          Text(
            _discountLabel,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          _MetaRow(
            icon: Icons.shopping_bag_outlined,
            text: 'Mínimo: ${Fmt.money(coupon.minOrderAmount)}',
          ),
          const SizedBox(height: 4),
          _MetaRow(
            icon: Icons.confirmation_number_outlined,
            text: 'Usos: ${coupon.currentUses} / ${coupon.maxUses}',
          ),
          if (coupon.expiresAt != null) ...[
            const SizedBox(height: 4),
            _MetaRow(
              icon: Icons.event_outlined,
              text: 'Expira: ${Fmt.date(coupon.expiresAt!)}',
            ),
          ],
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: Neutral.n400),
        const SizedBox(width: 6),
        Expanded(
          child: Text(text, style: const TextStyle(fontSize: 12, color: Neutral.n500)),
        ),
      ],
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.active});
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = active ? const Color(0xFF15803D) : Neutral.n600;
    final bg = active ? const Color(0xFFDCFCE7) : Neutral.n200;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        active ? 'Activo' : 'Inactivo',
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700),
      ),
    );
  }
}

/// Modal de creación de cupón. % y S/ son mutuamente excluyentes:
/// al escribir en uno se limpia el otro.
class _CouponFormSheet extends StatefulWidget {
  const _CouponFormSheet();

  @override
  State<_CouponFormSheet> createState() => _CouponFormSheetState();
}

class _CouponFormSheetState extends State<_CouponFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _code = TextEditingController();
  final _description = TextEditingController();
  final _discountPercent = TextEditingController();
  final _discountAmount = TextEditingController();
  final _minOrder = TextEditingController(text: '0');
  final _maxUses = TextEditingController(text: '100');

  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    _description.dispose();
    _discountPercent.dispose();
    _discountAmount.dispose();
    _minOrder.dispose();
    _maxUses.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });

    final pctText = _discountPercent.text.trim();
    final amtText = _discountAmount.text.trim();
    final payload = <String, dynamic>{
      'code': _code.text.toUpperCase().trim(),
      if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
      if (pctText.isNotEmpty) 'discount_percent': double.tryParse(pctText),
      if (amtText.isNotEmpty) 'discount_amount': double.tryParse(amtText),
      'min_order_amount': double.tryParse(_minOrder.text.trim()) ?? 0,
      'max_uses': int.tryParse(_maxUses.text.trim()) ?? 1,
    };

    try {
      await CouponsService.create(payload);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = getErrorMessage(e);
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Neutral.n300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      const Expanded(
                        child: Text('Nuevo cupón',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                      ),
                      IconButton(
                        onPressed: _saving ? null : () => Navigator.of(context).pop(false),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(_error!,
                          style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13)),
                    ),
                    const SizedBox(height: 14),
                  ],
                  _Label('Código (ej: WELCOME20)'),
                  TextFormField(
                    controller: _code,
                    enabled: !_saving,
                    textCapitalization: TextCapitalization.characters,
                    inputFormatters: [_UpperCaseFormatter()],
                    decoration: const InputDecoration(hintText: 'WELCOME20'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Ingresa un código' : null,
                  ),
                  const SizedBox(height: 14),
                  _Label('Descripción (opcional)'),
                  TextFormField(
                    controller: _description,
                    enabled: !_saving,
                    decoration: const InputDecoration(hintText: 'Descuento de bienvenida'),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Label('% descuento'),
                            TextFormField(
                              controller: _discountPercent,
                              enabled: !_saving,
                              keyboardType:
                                  const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(hintText: '10'),
                              onChanged: (v) {
                                if (v.isNotEmpty && _discountAmount.text.isNotEmpty) {
                                  _discountAmount.clear();
                                  setState(() {});
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Label('o S/ fijo'),
                            TextFormField(
                              controller: _discountAmount,
                              enabled: !_saving,
                              keyboardType:
                                  const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(hintText: '5.00'),
                              onChanged: (v) {
                                if (v.isNotEmpty && _discountPercent.text.isNotEmpty) {
                                  _discountPercent.clear();
                                  setState(() {});
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Label('Mínimo de orden'),
                            TextFormField(
                              controller: _minOrder,
                              enabled: !_saving,
                              keyboardType:
                                  const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(hintText: '0'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Label('Usos máximos'),
                            TextFormField(
                              controller: _maxUses,
                              enabled: !_saving,
                              keyboardType: TextInputType.number,
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                              decoration: const InputDecoration(hintText: '100'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: _saving ? null : () => Navigator.of(context).pop(false),
                        child: const Text('Cancelar'),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _saving ? null : _submit,
                        child: _saving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Crear cupón'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
            fontSize: 12, fontWeight: FontWeight.w600, color: Neutral.n600),
      ),
    );
  }
}

/// Fuerza mayúsculas en el campo de código del cupón.
class _UpperCaseFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    return newValue.copyWith(text: newValue.text.toUpperCase());
  }
}
