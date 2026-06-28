import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/dashboard.dart';
import 'package:chikenhot/services/dashboard_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// AdminDashboardPage `/admin` — panel de KPIs del administrador.
/// Solo lectura, sin polling: 6 StatCards con métricas del día.
/// Se renderiza dentro de AdminShell (sin AppBar; el shell aporta el header y
/// el cuerpo es desplazable). Espejo de `AdminDashboardPage.tsx`.
class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() =>
      _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  bool _loading = true;
  String? _error;
  AdminDashboard? _data;

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
      final data = await DashboardService.admin();
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
        child: LoadingView(message: 'Cargando panel…'),
      );
    }
    if (_error != null || _data == null) {
      return SizedBox(
        height: 280,
        child: ErrorView(
          message: _error ?? 'No se pudo cargar el panel',
          onRetry: _load,
        ),
      );
    }

    final d = _data!;

    return RefreshIndicator(
      onRefresh: _load,
      color: BrandColors.c500,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Dashboard',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            const Text('Resumen del día',
                style: TextStyle(fontSize: 13, color: Neutral.n500)),
            const SizedBox(height: 20),

            // 6 StatCards en cuadrícula 2 columnas (espejo del grid web).
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.45,
              children: [
                StatCard(
                  label: 'Pedidos hoy',
                  value: '${d.ordersToday}',
                  icon: Icons.shopping_bag_outlined,
                  trend: d.ordersChangePercent,
                ),
                StatCard(
                  label: 'Ingresos hoy',
                  value: Fmt.money(d.revenueToday),
                  icon: Icons.attach_money,
                  color: const Color(0xFF15803D),
                  trend: d.revenueChangePercent,
                ),
                StatCard(
                  label: 'Pedidos pendientes',
                  value: '${d.pendingOrders}',
                  icon: Icons.access_time,
                  color: const Color(0xFFD97706),
                ),
                StatCard(
                  label: 'Usuarios activos',
                  value: '${d.activeUsers}',
                  icon: Icons.people_outline,
                ),
                StatCard(
                  label: 'Repartidores',
                  value: '${d.totalDrivers}',
                  icon: Icons.pedal_bike_outlined,
                  hint: '${d.availableDrivers} disponibles ahora',
                ),
                StatCard(
                  label: 'Disponibles ahora',
                  value: '${d.availableDrivers}',
                  icon: Icons.how_to_reg_outlined,
                  color: const Color(0xFF15803D),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
