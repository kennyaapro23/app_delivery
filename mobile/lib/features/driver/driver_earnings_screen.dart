import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/delivery.dart';
import 'package:chikenhot/services/delivery_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// DriverEarningsPage `/delivery/earnings` — ganancias del repartidor.
///
/// Solo lectura: hero "Total acumulado" + tarjetas Hoy / Semana / Mes /
/// Total de entregas. Se renderiza dentro de DriverShell (sin AppBar; el
/// shell aporta el header). Datos vía `DeliveryService.earnings()`.
class DriverEarningsScreen extends ConsumerStatefulWidget {
  const DriverEarningsScreen({super.key});

  @override
  ConsumerState<DriverEarningsScreen> createState() =>
      _DriverEarningsScreenState();
}

class _DriverEarningsScreenState extends ConsumerState<DriverEarningsScreen> {
  bool _loading = true;
  String? _error;
  EarningsSummary? _data;

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
      final data = await DeliveryService.earnings();
      if (!mounted) return;
      setState(() {
        _data = data;
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
      return const SizedBox(
        height: 280,
        child: LoadingView(message: 'Cargando tus ganancias…'),
      );
    }

    final data = _data;
    if (_error != null || data == null) {
      return SizedBox(
        height: 280,
        child: ErrorView(
          message: _error ?? 'No se pudieron cargar las ganancias.',
          onRetry: _load,
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: BrandColors.c500,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('💰 Ganancias',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),

            // Hero "Total acumulado".
            _TotalHero(
              total: data.total,
              deliveriesTotal: data.deliveriesTotal,
            ),
            const SizedBox(height: 24),

            // StatCards: Hoy / Esta semana / Este mes / Total entregas.
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.55,
              children: [
                StatCard(
                  label: 'Hoy',
                  value: Fmt.money(data.today),
                  icon: Icons.attach_money,
                  color: const Color(0xFF15803D),
                  hint: '${data.deliveriesToday} entregas',
                ),
                StatCard(
                  label: 'Esta semana',
                  value: Fmt.money(data.thisWeek),
                  icon: Icons.calendar_today_outlined,
                ),
                StatCard(
                  label: 'Este mes',
                  value: Fmt.money(data.thisMonth),
                  icon: Icons.trending_up,
                ),
                StatCard(
                  label: 'Total entregas',
                  value: '${data.deliveriesTotal}',
                  icon: Icons.emoji_events_outlined,
                  color: const Color(0xFFD97706),
                ),
              ],
            ),

            const SizedBox(height: 24),
            const Center(
              child: Text(
                'Las ganancias se calculan a partir de los pedidos entregados.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Neutral.n500),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tarjeta hero con degradado de marca: total acumulado + entregas.
class _TotalHero extends StatelessWidget {
  const _TotalHero({required this.total, required this.deliveriesTotal});

  final double total;
  final int deliveriesTotal;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [BrandColors.c500, BrandColors.c700],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: BrandColors.c500.withValues(alpha: 0.3),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Total acumulado',
              style: TextStyle(fontSize: 14, color: Colors.white)),
          const SizedBox(height: 6),
          Text(
            Fmt.money(total),
            style: const TextStyle(
                fontSize: 36, fontWeight: FontWeight.w800, color: Colors.white),
          ),
          const SizedBox(height: 8),
          Text(
            '$deliveriesTotal entregas completadas',
            style: const TextStyle(fontSize: 13, color: Colors.white),
          ),
        ],
      ),
    );
  }
}
