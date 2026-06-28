import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/delivery.dart';
import 'package:chikenhot/services/dashboard_service.dart';
import 'package:chikenhot/services/delivery_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// DriverDashboardPage `/delivery` — panel inicial del repartidor.
/// Solo lectura: 4 StatCards + resumen de ganancias + 2 accesos directos.
/// Se renderiza dentro de DriverShell (sin AppBar; el shell aporta el header).
class DriverDashboardScreen extends ConsumerStatefulWidget {
  const DriverDashboardScreen({super.key});

  @override
  ConsumerState<DriverDashboardScreen> createState() =>
      _DriverDashboardScreenState();
}

class _DriverDashboardScreenState extends ConsumerState<DriverDashboardScreen> {
  bool _loading = true;
  String? _error;
  DriverStats? _stats;
  EarningsSummary? _earnings;

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
      // Carga en paralelo: estadísticas del repartidor + resumen de ganancias.
      final results = await Future.wait([
        DashboardService.driver(),
        DeliveryService.earnings(),
      ]);
      if (!mounted) return;
      setState(() {
        _stats = results[0] as DriverStats;
        _earnings = results[1] as EarningsSummary;
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
        child: LoadingView(message: 'Cargando tu panel…'),
      );
    }
    if (_error != null) {
      return SizedBox(
        height: 280,
        child: ErrorView(message: _error!, onRetry: _load),
      );
    }

    final stats = _stats;
    final earnings = _earnings;

    final earningsToday = earnings?.today ?? stats?.earningsToday ?? 0;
    final deliveriesToday =
        earnings?.deliveriesToday ?? stats?.deliveriesCompleted ?? 0;
    final rating = stats != null && stats.averageRating > 0
        ? stats.averageRating.toStringAsFixed(1)
        : '—';
    final efficiency = stats?.efficiency ?? 0;

    return RefreshIndicator(
      onRefresh: _load,
      color: BrandColors.c500,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Bienvenido 🍗',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            const Text('Tu día en Chikenhot',
                style: TextStyle(fontSize: 13, color: Neutral.n500)),
            const SizedBox(height: 20),

            // 4 StatCards en una cuadrícula 2×2.
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.55,
              children: [
                StatCard(
                  label: 'Ganancias hoy',
                  value: Fmt.money(earningsToday),
                  icon: Icons.attach_money,
                  color: const Color(0xFF15803D),
                ),
                StatCard(
                  label: 'Entregas hoy',
                  value: '$deliveriesToday',
                  icon: Icons.inventory_2_outlined,
                ),
                StatCard(
                  label: 'Rating',
                  value: rating,
                  icon: Icons.star_outline,
                  color: const Color(0xFFD97706),
                ),
                StatCard(
                  label: 'Eficiencia',
                  value: '${efficiency % 1 == 0 ? efficiency.toInt() : efficiency.toStringAsFixed(1)}%',
                  icon: Icons.trending_up,
                ),
              ],
            ),

            // Resumen de ganancias.
            if (earnings != null) ...[
              const SizedBox(height: 24),
              SectionCard(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Resumen de ganancias',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 16),
                    Row(children: [
                      Expanded(
                          child: _EarningRow(
                              label: 'Hoy', value: Fmt.money(earnings.today))),
                      Expanded(
                          child: _EarningRow(
                              label: 'Esta semana',
                              value: Fmt.money(earnings.thisWeek))),
                    ]),
                    const SizedBox(height: 14),
                    Row(children: [
                      Expanded(
                          child: _EarningRow(
                              label: 'Este mes',
                              value: Fmt.money(earnings.thisMonth))),
                      Expanded(
                          child: _EarningRow(
                              label: 'Total',
                              value: Fmt.money(earnings.total),
                              bold: true)),
                    ]),
                  ],
                ),
              ),
            ],

            // Accesos directos.
            const SizedBox(height: 24),
            Row(children: [
              Expanded(
                child: _ShortcutCard(
                  emoji: '🔔',
                  label: 'Ver disponibles',
                  onTap: () => context.push('/delivery/available'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ShortcutCard(
                  emoji: '📦',
                  label: 'Mis pedidos',
                  onTap: () => context.go('/delivery/my-orders'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}

/// Fila etiqueta + valor del resumen de ganancias.
class _EarningRow extends StatelessWidget {
  const _EarningRow({required this.label, required this.value, this.bold = false});
  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 12, color: Neutral.n500)),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                fontSize: bold ? 18 : 15,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w700)),
      ],
    );
  }
}

/// Tarjeta de acceso directo (emoji + etiqueta).
class _ShortcutCard extends StatelessWidget {
  const _ShortcutCard({
    required this.emoji,
    required this.label,
    required this.onTap,
  });
  final String emoji;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: SectionCard(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 26)),
            const SizedBox(height: 8),
            Text(label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}
