import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/api_client.dart';
import 'core/theme.dart';
import 'providers/auth_provider.dart';
import 'router/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('es');
  ApiClient.instance.init();
  runApp(const ProviderScope(child: ChikenhotApp()));
}

class ChikenhotApp extends ConsumerStatefulWidget {
  const ChikenhotApp({super.key});

  @override
  ConsumerState<ChikenhotApp> createState() => _ChikenhotAppState();
}

class _ChikenhotAppState extends ConsumerState<ChikenhotApp> {
  @override
  void initState() {
    super.initState();
    // Rehidrata la sesión desde el almacenamiento seguro.
    Future.microtask(() => ref.read(authProvider.notifier).init());
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Chikenhot',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: router,
    );
  }
}
