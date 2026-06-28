import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/providers/auth_provider.dart';
import 'package:chikenhot/widgets/common.dart';

/// Pantalla de registro de cliente — espejo de RegisterPage.tsx.
/// Crea una cuenta `customer` (rol inyectado por el backend) y, al éxito,
/// hace auto-login y navega al catálogo (`/`).
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_loading) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });

    final phone = _phoneCtrl.text.trim();
    try {
      await ref.read(authProvider.notifier).register(
            email: _emailCtrl.text.trim(),
            password: _passwordCtrl.text,
            fullName: _fullNameCtrl.text.trim(),
            phone: phone.isEmpty ? null : phone,
          );
      if (!mounted) return;
      context.go('/');
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = getErrorMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Neutral.n50,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: SectionCard(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Encabezado
                      const Center(
                        child: Column(
                          children: [
                            Text('🍗', style: TextStyle(fontSize: 40)),
                            SizedBox(height: 8),
                            Text(
                              'Crear cuenta',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w700,
                                color: Neutral.n900,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Únete y disfruta de Chikenhot',
                              style: TextStyle(
                                fontSize: 14,
                                color: Neutral.n500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Nombre completo
                      _FieldLabel('Nombre completo'),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _fullNameCtrl,
                        enabled: !_loading,
                        textInputAction: TextInputAction.next,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(hintText: 'Juan Pérez'),
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        validator: (v) =>
                            (v == null || v.trim().isEmpty)
                                ? 'Ingresa tu nombre completo'
                                : null,
                      ),
                      const SizedBox(height: 16),

                      // Email
                      _FieldLabel('Email'),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _emailCtrl,
                        enabled: !_loading,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autocorrect: false,
                        decoration: const InputDecoration(hintText: 'tu@email.com'),
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        validator: (v) {
                          final value = v?.trim() ?? '';
                          if (value.isEmpty) return 'Ingresa tu email';
                          final re = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
                          if (!re.hasMatch(value)) {
                            return 'Ingresa un email válido';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Teléfono (opcional)
                      RichText(
                        text: const TextSpan(
                          text: 'Teléfono ',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Neutral.n800,
                          ),
                          children: [
                            TextSpan(
                              text: '(opcional)',
                              style: TextStyle(
                                fontWeight: FontWeight.w400,
                                color: Neutral.n400,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _phoneCtrl,
                        enabled: !_loading,
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(hintText: '999 999 999'),
                      ),
                      const SizedBox(height: 16),

                      // Contraseña
                      _FieldLabel('Contraseña'),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _passwordCtrl,
                        enabled: !_loading,
                        obscureText: _obscure,
                        textInputAction: TextInputAction.done,
                        decoration: InputDecoration(
                          hintText: 'Mínimo 6 caracteres',
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscure
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                              color: Neutral.n400,
                            ),
                            onPressed: _loading
                                ? null
                                : () => setState(() => _obscure = !_obscure),
                          ),
                        ),
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        onFieldSubmitted: (_) => _handleSubmit(),
                        validator: (v) {
                          final value = v ?? '';
                          if (value.isEmpty) return 'Ingresa una contraseña';
                          if (value.length < 6) {
                            return 'Mínimo 6 caracteres';
                          }
                          return null;
                        },
                      ),

                      // Error inline
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFFECACA)),
                          ),
                          child: Text(
                            _error!,
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFFB91C1C),
                            ),
                          ),
                        ),
                      ],

                      const SizedBox(height: 20),

                      // Botón Crear cuenta
                      SizedBox(
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _handleSubmit,
                          child: _loading
                              ? Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: const [
                                    SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor:
                                            AlwaysStoppedAnimation(Colors.white),
                                      ),
                                    ),
                                    SizedBox(width: 10),
                                    Text('Creando cuenta...'),
                                  ],
                                )
                              : const Text('Crear cuenta'),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Enlace a login
                      Center(
                        child: Wrap(
                          alignment: WrapAlignment.center,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            const Text(
                              '¿Ya tienes cuenta? ',
                              style: TextStyle(
                                fontSize: 14,
                                color: Neutral.n600,
                              ),
                            ),
                            GestureDetector(
                              onTap: _loading ? null : () => context.go('/login'),
                              child: const Text(
                                'Inicia sesión',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: BrandColors.c600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Neutral.n800,
      ),
    );
  }
}
