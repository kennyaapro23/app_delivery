import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/user.dart';
import 'package:chikenhot/providers/auth_provider.dart';
import 'package:chikenhot/widgets/common.dart';

/// ProfilePage `/profile` — perfil del cliente + programa de fidelización.
/// Espejo de frontend/src/pages/ProfilePage.tsx, adaptado a Flutter móvil.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Refresca el perfil al montar (puntos, nivel, etc.).
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final hadUser = ref.read(authProvider).user != null;
    setState(() {
      // Si ya hay un usuario en cache, mostrarlo sin bloquear con spinner.
      _loading = !hadUser;
      _error = null;
    });
    try {
      await ref.read(authProvider.notifier).loadProfile();
      if (!mounted) return;
      setState(() => _loading = false);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = getErrorMessage(e);
        _loading = false;
      });
    }
  }

  Future<void> _logout() async {
    await ref.read(authProvider.notifier).logout();
    if (!mounted) return;
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider.select((s) => s.user));

    final Widget body;
    if (_loading && user == null) {
      body = const LoadingView();
    } else if (user == null) {
      body = ErrorView(
        message: _error ?? 'No se pudo cargar el perfil',
        onRetry: _load,
      );
    } else {
      body = _ProfileBody(user: user, onLogout: _logout);
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Mi perfil')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: body,
      ),
    );
  }
}

class _ProfileBody extends StatelessWidget {
  const _ProfileBody({required this.user, required this.onLogout});

  final User user;
  final Future<void> Function() onLogout;

  String get _initial =>
      user.fullName.isEmpty ? '?' : user.fullName.characters.first.toUpperCase();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        // ----- Tarjeta de identidad -----
        SectionCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: BrandColors.c100,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      _initial,
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: BrandColors.c700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user.createdAt != null
                              ? 'Cliente desde ${Fmt.date(user.createdAt!)}'
                              : 'Cliente',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Neutral.n500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 12),
              // Grilla de información.
              Wrap(
                runSpacing: 16,
                children: [
                  _InfoTile(
                    icon: Icons.mail_outline,
                    label: 'Email',
                    value: user.email,
                  ),
                  _InfoTile(
                    icon: Icons.phone_outlined,
                    label: 'Teléfono',
                    value: (user.phone == null || user.phone!.isEmpty)
                        ? '—'
                        : user.phone!,
                  ),
                  _InfoTile(
                    icon: Icons.person_outline,
                    label: 'Rol',
                    value: user.role.label,
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // ----- Programa de fidelización -----
        SectionCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: const [
                  Icon(Icons.workspace_premium, size: 20, color: BrandColors.c500),
                  SizedBox(width: 8),
                  Text(
                    'Programa de fidelización',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Nivel actual',
                          style: TextStyle(fontSize: 13, color: Neutral.n500),
                        ),
                        const SizedBox(height: 6),
                        MembershipBadge(user.membershipLevel),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        'Puntos acumulados',
                        style: TextStyle(fontSize: 13, color: Neutral.n500),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${user.points}',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: BrandColors.c600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // ----- Cerrar sesión -----
        OutlinedButton.icon(
          onPressed: onLogout,
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFB91C1C),
            side: const BorderSide(color: Color(0xFFFCA5A5)),
          ),
          icon: const Icon(Icons.logout),
          label: const Text('Cerrar sesión'),
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(icon, size: 18, color: Neutral.n400),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    letterSpacing: 0.5,
                    color: Neutral.n400,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
