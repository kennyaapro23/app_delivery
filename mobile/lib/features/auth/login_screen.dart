import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/providers/auth_provider.dart';
import 'package:chikenhot/providers/cart_provider.dart';
import 'package:chikenhot/providers/favorites_provider.dart';
import 'package:chikenhot/router/app_router.dart';
import 'package:chikenhot/widgets/common.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _doLogin(String email, String password) async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // Limpia toda la sesión previa (auth + carrito + favoritos) antes de
      // autenticar, para no heredar datos del usuario anterior (espejo web).
      await ref.read(authProvider.notifier).logout();
      ref.read(cartProvider.notifier).clear();
      ref.read(favoritesProvider.notifier).clear();

      final role = await ref.read(authProvider.notifier).login(email, password);
      if (!mounted) return;
      context.go(defaultHomeForRole(role));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = getErrorMessage(e);
        _loading = false;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    await _doLogin(_emailCtrl.text.trim(), _passwordCtrl.text);
  }

  Future<void> _logout() async {
    await ref.read(authProvider.notifier).logout();
    ref.read(cartProvider.notifier).clear();
    ref.read(favoritesProvider.notifier).clear();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final hasSession = auth.authenticated && auth.role != null;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: SectionCard(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ── Encabezado / logo ──
                    const Text('🍗',
                        style: TextStyle(fontSize: 44),
                        textAlign: TextAlign.center),
                    const SizedBox(height: 8),
                    const Text(
                      'Bienvenido de vuelta',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Inicia sesión para continuar',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: Neutral.n500),
                    ),
                    const SizedBox(height: 20),

                    // ── Banner de sesión activa ──
                    if (hasSession) _buildSessionBanner(auth),

                    // ── Formulario ──
                    Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('Email',
                              style: TextStyle(
                                  fontSize: 13, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _emailCtrl,
                            enabled: !_loading,
                            keyboardType: TextInputType.emailAddress,
                            autocorrect: false,
                            textInputAction: TextInputAction.next,
                            decoration:
                                const InputDecoration(hintText: 'tu@email.com'),
                            validator: (v) => (v == null || v.trim().isEmpty)
                                ? 'Ingresa tu email'
                                : null,
                          ),
                          const SizedBox(height: 14),
                          const Text('Contraseña',
                              style: TextStyle(
                                  fontSize: 13, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _passwordCtrl,
                            enabled: !_loading,
                            obscureText: true,
                            textInputAction: TextInputAction.done,
                            onFieldSubmitted: (_) => _handleSubmit(),
                            decoration:
                                const InputDecoration(hintText: '••••••••'),
                            validator: (v) => (v == null || v.isEmpty)
                                ? 'Ingresa tu contraseña'
                                : null,
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: 14),
                            _buildErrorBox(_error!),
                          ],
                          const SizedBox(height: 18),
                          ElevatedButton(
                            onPressed: _loading ? null : _handleSubmit,
                            child: _loading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.4,
                                      valueColor:
                                          AlwaysStoppedAnimation(Colors.white),
                                    ),
                                  )
                                : const Text('Iniciar sesión'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // ── Enlaces a registro ──
                    _buildRegisterLinks(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSessionBanner(AuthState auth) {
    const amberBorder = Color(0xFFFDE68A);
    const amberBg = Color(0xFFFFFBEB);
    const amberText = Color(0xFF92400E);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: amberBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: amberBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RichText(
            text: TextSpan(
              style: const TextStyle(
                  fontSize: 13, color: amberText, height: 1.4),
              children: [
                const TextSpan(text: 'Ya estás logueado como '),
                TextSpan(
                  text: auth.fullName ?? '—',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                TextSpan(
                  text: '  (${auth.role?.label ?? ''})',
                  style: const TextStyle(
                      fontSize: 11, color: Color(0xFFB45309)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _loading
                      ? null
                      : () => context.go(defaultHomeForRole(auth.role)),
                  child: const Text('Ir a mi panel',
                      style: TextStyle(fontSize: 12)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _loading ? null : _logout,
                  icon: const Icon(Icons.logout, size: 14),
                  label: const Text('Cerrar sesión',
                      style: TextStyle(fontSize: 12)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBox(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, size: 18, color: Color(0xFFB91C1C)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(fontSize: 13, color: Color(0xFFB91C1C)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRegisterLinks() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('¿No tienes cuenta? ',
                style: TextStyle(fontSize: 13, color: Neutral.n600)),
            GestureDetector(
              onTap: _loading ? null : () => context.push('/register'),
              child: const Text(
                'Regístrate',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: BrandColors.c600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('🛵 ¿Eres repartidor? ',
                style: TextStyle(fontSize: 12, color: Neutral.n500)),
            GestureDetector(
              onTap: _loading ? null : () => context.push('/register-driver'),
              child: const Text(
                'Únete aquí',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: BrandColors.c600,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
