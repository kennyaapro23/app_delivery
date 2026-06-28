import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/dashboard.dart';
import 'package:chikenhot/models/user.dart';
import 'package:chikenhot/services/users_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// `/admin/users` — gestión de usuarios (renderiza dentro de AdminShell, sin AppBar).
///
/// Espejo de `AdminUsersPage.tsx`: 6 tarjetas de estadísticas, búsqueda por
/// nombre/email, filtro por rol y tabla con acción de activar/desactivar.
class AdminUsersScreen extends ConsumerStatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  ConsumerState<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends ConsumerState<AdminUsersScreen> {
  List<User> _users = const [];
  UserStats? _stats;

  /// Filtro de rol: `null` = todos, o el valor de API ("customer"/"delivery_driver"/"admin").
  String? _role;
  String _search = '';

  bool _loading = true;
  String? _error;
  int? _togglingId;

  final _searchCtrl = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _loadStats();
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadStats() async {
    try {
      final s = await UsersService.stats();
      if (!mounted) return;
      setState(() => _stats = s);
    } catch (_) {
      // Las estadísticas son secundarias: ignoramos errores (espejo del web `.catch(() => {})`).
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await UsersService.list(
        role: _role,
        search: _search.trim().isEmpty ? null : _search.trim(),
        limit: 100,
      );
      if (!mounted) return;
      setState(() {
        _users = res.users;
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

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      setState(() => _search = value);
      _load();
    });
  }

  void _onRoleChanged(String? value) {
    setState(() => _role = value);
    _load();
  }

  Future<void> _toggleActive(User u) async {
    final action = u.isActive ? 'Desactivar' : 'Activar';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('$action usuario'),
        content: Text('¿$action a ${u.fullName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  u.isActive ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(action),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _togglingId = u.id);
    try {
      await UsersService.update(u.id, {'is_active': !u.isActive});
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(
          content: Text(u.isActive
              ? 'Usuario desactivado'
              : 'Usuario activado'),
        ));
      await Future.wait([_load(), _loadStats()]);
    } catch (e) {
      if (!mounted) return;
      final msg = getErrorMessage(e);
      setState(() => _error = msg);
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(msg)));
    } finally {
      if (mounted) setState(() => _togglingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () => Future.wait([_load(), _loadStats()]),
      color: BrandColors.c500,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Usuarios',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          if (_stats != null) ...[
            _StatsGrid(stats: _stats!),
            const SizedBox(height: 16),
          ],
          _Filters(
            controller: _searchCtrl,
            role: _role,
            onSearchChanged: _onSearchChanged,
            onRoleChanged: _onRoleChanged,
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            _InlineError(message: _error!),
          ],
          const SizedBox(height: 16),
          _buildList(),
        ],
      ),
    );
  }

  Widget _buildList() {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.only(top: 48),
        child: LoadingView(message: 'Cargando usuarios…'),
      );
    }
    if (_error != null && _users.isEmpty) {
      return Padding(
        padding: const EdgeInsets.only(top: 40),
        child: ErrorView(message: _error!, onRetry: _load),
      );
    }
    if (_users.isEmpty) {
      return const Padding(
        padding: EdgeInsets.only(top: 40),
        child: EmptyView(
          icon: Icons.people_outline,
          message: 'No se encontraron usuarios',
        ),
      );
    }
    return Column(
      children: [
        for (final u in _users)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _UserRow(
              user: u,
              toggling: _togglingId == u.id,
              onToggle: _togglingId == null ? () => _toggleActive(u) : null,
            ),
          ),
      ],
    );
  }
}

/// 6 tarjetas de estadística: Total / Activos / Clientes / Repartidores / Admins / Nuevos.
class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.stats});
  final UserStats stats;

  @override
  Widget build(BuildContext context) {
    final cards = <Widget>[
      StatCard(
        label: 'Total',
        value: '${stats.totalUsers}',
        icon: Icons.people_outline,
      ),
      StatCard(
        label: 'Activos',
        value: '${stats.activeUsers}',
        icon: Icons.verified_user_outlined,
        color: const Color(0xFF16A34A),
      ),
      StatCard(
        label: 'Clientes',
        value: '${stats.customers}',
        icon: Icons.shopping_bag_outlined,
        color: const Color(0xFF2563EB),
      ),
      StatCard(
        label: 'Repartidores',
        value: '${stats.drivers}',
        icon: Icons.pedal_bike_outlined,
      ),
      StatCard(
        label: 'Admins',
        value: '${stats.admins}',
        icon: Icons.shield_outlined,
        color: const Color(0xFF7C3AED),
      ),
      StatCard(
        label: 'Nuevos (semana)',
        value: '${stats.newThisWeek}',
        icon: Icons.person_add_alt_1_outlined,
        color: const Color(0xFFD97706),
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        // 2 columnas en móvil, 3 en pantallas anchas.
        final columns = constraints.maxWidth >= 560 ? 3 : 2;
        const spacing = 12.0;
        final itemWidth =
            (constraints.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final c in cards) SizedBox(width: itemWidth, child: c),
          ],
        );
      },
    );
  }
}

/// Búsqueda por nombre/email + selector de rol.
class _Filters extends StatelessWidget {
  const _Filters({
    required this.controller,
    required this.role,
    required this.onSearchChanged,
    required this.onRoleChanged,
  });

  final TextEditingController controller;
  final String? role;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String?> onRoleChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          controller: controller,
          onChanged: onSearchChanged,
          textInputAction: TextInputAction.search,
          decoration: const InputDecoration(
            hintText: 'Buscar por nombre o email...',
            prefixIcon: Icon(Icons.search, size: 20, color: Neutral.n400),
          ),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String?>(
          initialValue: role,
          isExpanded: true,
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.filter_list, size: 20, color: Neutral.n400),
          ),
          items: const [
            DropdownMenuItem(value: null, child: Text('Todos los roles')),
            DropdownMenuItem(value: 'customer', child: Text('Clientes')),
            DropdownMenuItem(
                value: 'delivery_driver', child: Text('Repartidores')),
            DropdownMenuItem(value: 'admin', child: Text('Admins')),
          ],
          onChanged: onRoleChanged,
        ),
      ],
    );
  }
}

/// Fila de usuario: nombre+email, badge de rol, badge de estado, fecha y acción.
class _UserRow extends StatelessWidget {
  const _UserRow({
    required this.user,
    required this.toggling,
    required this.onToggle,
  });

  final User user;
  final bool toggling;
  final VoidCallback? onToggle;

  @override
  Widget build(BuildContext context) {
    final createdAt = user.createdAt;
    return Opacity(
      opacity: user.isActive ? 1 : 0.6,
      child: SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        user.fullName.isEmpty ? '—' : user.fullName,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user.email,
                        style:
                            const TextStyle(fontSize: 12, color: Neutral.n500),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _ToggleButton(
                  isActive: user.isActive,
                  toggling: toggling,
                  onPressed: onToggle,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _RoleBadge(role: user.role),
                const SizedBox(width: 8),
                _StateBadge(isActive: user.isActive),
                const Spacer(),
                Flexible(
                  child: Text(
                    createdAt != null ? Fmt.date(createdAt) : '—',
                    textAlign: TextAlign.right,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: Neutral.n500),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ToggleButton extends StatelessWidget {
  const _ToggleButton({
    required this.isActive,
    required this.toggling,
    required this.onPressed,
  });

  final bool isActive;
  final bool toggling;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final color =
        isActive ? const Color(0xFFDC2626) : const Color(0xFF16A34A);
    return IconButton(
      tooltip: isActive ? 'Desactivar usuario' : 'Activar usuario',
      onPressed: toggling ? null : onPressed,
      style: IconButton.styleFrom(
        backgroundColor: color.withValues(alpha: 0.1),
        foregroundColor: color,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      icon: toggling
          ? SizedBox(
              height: 18,
              width: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: color),
            )
          : Icon(isActive ? Icons.power_settings_new : Icons.power, size: 20),
    );
  }
}

/// Badge de rol con colores espejo del web (admin morado / cliente azul / repartidor naranja).
class _RoleBadge extends StatelessWidget {
  const _RoleBadge({required this.role});
  final UserRole role;

  @override
  Widget build(BuildContext context) {
    final (Color color, String label) = switch (role) {
      UserRole.admin => (const Color(0xFF7C3AED), 'Admin'),
      UserRole.customer => (const Color(0xFF2563EB), 'Cliente'),
      UserRole.deliveryDriver => (BrandColors.c600, 'Repartidor'),
    };
    return _Pill(color: color, label: label);
  }
}

/// Badge de estado: Activo (verde) / Inactivo (gris).
class _StateBadge extends StatelessWidget {
  const _StateBadge({required this.isActive});
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    return isActive
        ? const _Pill(color: Color(0xFF16A34A), label: 'Activo')
        : const _Pill(color: Neutral.n600, label: 'Inactivo');
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
            color: color, fontSize: 12, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFCA5A5)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, size: 18, color: Color(0xFFB91C1C)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message,
                style:
                    const TextStyle(fontSize: 13, color: Color(0xFFB91C1C))),
          ),
        ],
      ),
    );
  }
}
