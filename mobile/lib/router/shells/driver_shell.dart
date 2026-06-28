import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/delivery_service.dart';
import '../../services/driver_location_reporter.dart';

class DriverShell extends ConsumerStatefulWidget {
  const DriverShell({super.key, required this.child, required this.location});
  final Widget child;
  final String location;

  @override
  ConsumerState<DriverShell> createState() => _DriverShellState();
}

class _DriverShellState extends ConsumerState<DriverShell>
    with WidgetsBindingObserver {
  final _reporter =
      DriverLocationReporter(intervalSeconds: AppConfig.driverReportSeconds);
  bool _available = true; // optimista al montar
  bool _toggling = false;

  static const _tabs = [
    '/delivery',
    '/delivery/map',
    '/delivery/my-orders',
    '/delivery/earnings',
    '/delivery/ratings',
  ];

  int get _index {
    final l = widget.location;
    if (l == '/delivery') return 0;
    if (l.startsWith('/delivery/map')) return 1;
    if (l.startsWith('/delivery/my-orders')) return 2;
    if (l.startsWith('/delivery/earnings')) return 3;
    if (l.startsWith('/delivery/ratings')) return 4;
    return 0;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _reporter.start(); // disponible por defecto
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _reporter.stop();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _reporter.setPaused(state != AppLifecycleState.resumed);
  }

  Future<void> _toggle() async {
    setState(() => _toggling = true);
    try {
      final available = await DeliveryService.toggleAvailability();
      setState(() => _available = available);
      if (available) {
        _reporter.start();
      } else {
        _reporter.stop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(getErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = ref.watch(authProvider).fullName ?? 'Repartidor';
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🛵 Chikenhot', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            Text('Hola, $name',
                style: const TextStyle(fontSize: 12, color: Neutral.n500, fontWeight: FontWeight.w400)),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
            child: TextButton.icon(
              onPressed: _toggling ? null : _toggle,
              style: TextButton.styleFrom(
                backgroundColor: _available ? const Color(0xFFDCFCE7) : Neutral.n200,
                foregroundColor: _available ? const Color(0xFF15803D) : Neutral.n600,
              ),
              icon: _toggling
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                  : Icon(_available ? Icons.power_settings_new : Icons.power_off, size: 16),
              label: Text(_available ? 'Disponible' : 'Offline',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
            ),
          ),
          IconButton(
            tooltip: 'Cerrar sesión',
            icon: const Icon(Icons.logout, size: 20),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => context.go(_tabs[i]),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Inicio'),
          NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map), label: 'Mapa'),
          NavigationDestination(icon: Icon(Icons.list_alt_outlined), selectedIcon: Icon(Icons.list_alt), label: 'Pedidos'),
          NavigationDestination(icon: Icon(Icons.payments_outlined), selectedIcon: Icon(Icons.payments), label: 'Ganancias'),
          NavigationDestination(icon: Icon(Icons.star_border), selectedIcon: Icon(Icons.star), label: 'Rating'),
        ],
      ),
    );
  }
}
