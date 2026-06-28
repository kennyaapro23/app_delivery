import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/delivery.dart';
import 'package:chikenhot/services/delivery_service.dart';
import 'package:chikenhot/widgets/common.dart';
import 'package:chikenhot/widgets/map/static_map.dart';

/// `/admin/drivers` — roster de repartidores (lista + mapa).
/// Espejo de frontend `AdminDriversPage.tsx`. Se renderiza dentro de
/// [AdminShell] (el shell provee AppBar/drawer/Scaffold), por lo que esta
/// pantalla sólo aporta el cuerpo con dos pestañas: Lista / Mapa.
class AdminDriversScreen extends ConsumerStatefulWidget {
  const AdminDriversScreen({super.key});

  @override
  ConsumerState<AdminDriversScreen> createState() => _AdminDriversScreenState();
}

class _AdminDriversScreenState extends ConsumerState<AdminDriversScreen> {
  static const _available = Color(0xFF10B981); // green
  static const _offline = Color(0xFF9CA3AF); // gray

  List<DriverProfile> _drivers = const [];
  bool _loading = true;
  String? _error;

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
      final drivers = await DeliveryService.allDrivers();
      if (!mounted) return;
      setState(() {
        _drivers = drivers;
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
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          const Material(
            color: Colors.white,
            child: TabBar(
              labelColor: BrandColors.c600,
              unselectedLabelColor: Neutral.n500,
              indicatorColor: BrandColors.c500,
              labelStyle: TextStyle(fontWeight: FontWeight.w700),
              tabs: [
                Tab(icon: Icon(Icons.view_list_outlined), text: 'Lista'),
                Tab(icon: Icon(Icons.map_outlined), text: 'Mapa'),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) return const LoadingView(message: 'Cargando repartidores…');
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_drivers.isEmpty) {
      return const EmptyView(
        message: 'No hay perfiles de repartidor todavía',
        icon: Icons.delivery_dining_outlined,
      );
    }
    return TabBarView(
      children: [
        _listTab(),
        _mapTab(),
      ],
    );
  }

  // ── Tab Lista ──────────────────────────────────────────────────────────
  Widget _listTab() {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _drivers.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) => _DriverCard(
          driver: _drivers[i],
          available: _available,
          offline: _offline,
          onTap: () => _showDetail(_drivers[i]),
        ),
      ),
    );
  }

  // ── Tab Mapa ───────────────────────────────────────────────────────────
  Widget _mapTab() {
    final located = _drivers.where((d) => d.hasLocation).toList();
    if (located.isEmpty) {
      return const EmptyView(
        message: 'Ningún repartidor ha reportado ubicación todavía.',
        icon: Icons.location_off_outlined,
      );
    }
    final pins = located
        .map((d) => MapPin(
              point: LatLng(d.latitude!, d.longitude!),
              color: d.isAvailable ? _available : _offline,
              onTap: () => _showDetail(d),
            ))
        .toList();
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${located.length} repartidor${located.length == 1 ? '' : 'es'} con ubicación reportada',
            style: const TextStyle(color: Neutral.n500, fontSize: 13),
          ),
          const SizedBox(height: 12),
          StaticMap(pins: pins, height: 480),
          const SizedBox(height: 12),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: [
              _LegendDot(color: _available, label: 'Disponible'),
              _LegendDot(color: _offline, label: 'Offline'),
            ],
          ),
        ],
      ),
    );
  }

  void _showDetail(DriverProfile d) {
    showDialog<void>(
      context: context,
      builder: (_) => _DriverDetailDialog(
        driver: d,
        available: _available,
        offline: _offline,
      ),
    );
  }
}

// ── Card de la lista ──────────────────────────────────────────────────────
class _DriverCard extends StatelessWidget {
  const _DriverCard({
    required this.driver,
    required this.available,
    required this.offline,
    required this.onTap,
  });

  final DriverProfile driver;
  final Color available;
  final Color offline;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final d = driver;
    final hasVehicle = (d.vehiclePlate ?? '').isNotEmpty;
    return SectionCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: BrandColors.c100,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(d.vehicleEmoji, style: const TextStyle(fontSize: 24)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          d.fullName ?? '—',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          (d.phone ?? d.email) ?? '—',
                          style: const TextStyle(fontSize: 12, color: Neutral.n500),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  _AvailabilityBadge(
                    available: d.isAvailable,
                    availableColor: available,
                    offlineColor: offline,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _MiniStat(
                      value: '${d.totalDeliveries}',
                      label: 'Entregas',
                    ),
                  ),
                  Expanded(
                    child: _MiniStat(
                      value: d.averageRating.toStringAsFixed(1),
                      label: 'Rating',
                      leading: const Icon(Icons.star, size: 14, color: Color(0xFFF59E0B)),
                    ),
                  ),
                  Expanded(
                    child: _MiniStat(
                      value: Fmt.money(d.totalEarnings),
                      label: 'Ganado',
                    ),
                  ),
                ],
              ),
              if (hasVehicle) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.directions_car_outlined, size: 14, color: Neutral.n400),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        [
                          [d.vehicleBrand, d.vehicleModel].where(_nonEmpty).join(' '),
                          d.vehiclePlate,
                        ].where(_nonEmpty).join(' · '),
                        style: const TextStyle(fontSize: 12, color: Neutral.n500),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.value, required this.label, this.leading});
  final String value;
  final String label;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (leading != null) ...[leading!, const SizedBox(width: 4)],
            Flexible(
              child: Text(
                value,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: Neutral.n500)),
      ],
    );
  }
}

class _AvailabilityBadge extends StatelessWidget {
  const _AvailabilityBadge({
    required this.available,
    required this.availableColor,
    required this.offlineColor,
  });
  final bool available;
  final Color availableColor;
  final Color offlineColor;

  @override
  Widget build(BuildContext context) {
    final color = available ? availableColor : offlineColor;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        available ? 'Disponible' : 'Offline',
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 12, color: Neutral.n600)),
      ],
    );
  }
}

// ── Diálogo de detalle (sólo lectura) ──────────────────────────────────────
class _DriverDetailDialog extends StatelessWidget {
  const _DriverDetailDialog({
    required this.driver,
    required this.available,
    required this.offline,
  });

  final DriverProfile driver;
  final Color available;
  final Color offline;

  @override
  Widget build(BuildContext context) {
    final d = driver;
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: const BoxDecoration(
                      color: BrandColors.c100,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(d.vehicleEmoji, style: const TextStyle(fontSize: 28)),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          d.fullName ?? '—',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          d.email ?? '—',
                          style: const TextStyle(fontSize: 13, color: Neutral.n500),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        _AvailabilityBadge(
                          available: d.isAvailable,
                          availableColor: available,
                          offlineColor: offline,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Cerrar',
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            // KPIs
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                children: [
                  Expanded(child: _Kpi(value: '${d.totalDeliveries}', label: 'Entregas')),
                  Expanded(
                    child: _Kpi(
                      value: d.averageRating.toStringAsFixed(1),
                      label: 'Rating',
                      leading: const Icon(Icons.star, size: 18, color: Color(0xFFF59E0B)),
                    ),
                  ),
                  Expanded(child: _Kpi(value: Fmt.money(d.totalEarnings), label: 'Ganado')),
                ],
              ),
            ),
            const Divider(height: 1),
            // Secciones
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Section(
                      title: 'Datos personales',
                      icon: Icons.badge_outlined,
                      rows: [
                        _Row('Email', d.email),
                        _Row('Teléfono', d.phone),
                        _Row('DNI', d.documentId),
                        _Row('Nacimiento', d.birthDate),
                        _Row('Género', d.gender),
                        _Row(
                          'Dirección',
                          [d.homeAddress, d.homeDistrict].where(_nonEmpty).join(', '),
                        ),
                      ],
                    ),
                    _Section(
                      title: 'Contacto de emergencia',
                      icon: Icons.favorite_outline,
                      rows: [
                        _Row('Nombre', d.emergencyContactName),
                        _Row('Teléfono', d.emergencyContactPhone),
                        _Row('Relación', d.emergencyContactRelation),
                      ],
                    ),
                    _Section(
                      title: 'Vehículo',
                      icon: Icons.directions_car_outlined,
                      rows: [
                        _Row(
                          'Tipo',
                          (d.vehicleType ?? '').isEmpty
                              ? null
                              : '${d.vehicleEmoji} ${d.vehicleType}',
                        ),
                        _Row(
                          'Marca / Modelo',
                          [d.vehicleBrand, d.vehicleModel].where(_nonEmpty).join(' '),
                        ),
                        _Row('Año', d.vehicleYear?.toString()),
                        _Row('Color', d.vehicleColor),
                        _Row('Placa', d.vehiclePlate, mono: true),
                        _Row(
                          'Licencia',
                          [
                            d.licenseNumber,
                            (d.licenseExpiry ?? '').isEmpty ? null : 'vence ${d.licenseExpiry}',
                          ].where(_nonEmpty).join(' — '),
                        ),
                        _Row(
                          'Seguro / SOAT',
                          [
                            d.insuranceNumber,
                            (d.insuranceExpiry ?? '').isEmpty
                                ? null
                                : 'vence ${d.insuranceExpiry}',
                          ].where(_nonEmpty).join(' — '),
                        ),
                      ],
                    ),
                    _Section(
                      title: 'Información bancaria',
                      icon: Icons.credit_card_outlined,
                      rows: [
                        _Row('Banco', d.bankName),
                        _Row('Tipo de cuenta', d.bankAccountType),
                        _Row('N° de cuenta', d.bankAccount, mono: true),
                        _Row('CCI', d.bankCci, mono: true),
                        _Row('Titular', d.bankAccountHolder),
                      ],
                    ),
                    if (d.hasLocation)
                      _Section(
                        title: 'Última ubicación',
                        icon: Icons.location_on_outlined,
                        rows: [
                          _Row('Zona', d.currentZone),
                          _Row(
                            'Coordenadas',
                            '${d.latitude!.toStringAsFixed(6)}, ${d.longitude!.toStringAsFixed(6)}',
                            mono: true,
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Cerrar'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.value, required this.label, this.leading});
  final String value;
  final String label;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (leading != null) ...[leading!, const SizedBox(width: 4)],
            Flexible(
              child: Text(
                value,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: Neutral.n500)),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.icon, required this.rows});
  final String title;
  final IconData icon;
  final List<_Row> rows;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: BrandColors.c500),
              const SizedBox(width: 6),
              Text(
                title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                  color: Neutral.n500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...rows,
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.mono = false});
  final String label;
  final String? value;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    final empty = value == null || value!.isEmpty;
    final display = empty ? '—' : value!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, color: Neutral.n500),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              display,
              style: TextStyle(
                fontSize: 13,
                color: empty ? Neutral.n300 : Neutral.n800,
                fontWeight: FontWeight.w500,
                fontFamily: mono && !empty ? 'monospace' : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

bool _nonEmpty(String? s) => s != null && s.isNotEmpty;
