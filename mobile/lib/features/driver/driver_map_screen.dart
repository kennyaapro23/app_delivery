import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/config.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/delivery.dart';
import 'package:chikenhot/providers/tile_style_provider.dart';
import 'package:chikenhot/services/delivery_service.dart';
import 'package:chikenhot/services/store_config_service.dart';
import 'package:chikenhot/widgets/common.dart';
import 'package:chikenhot/widgets/map/map_markers.dart';
import 'package:chikenhot/widgets/map/tile_layer_builder.dart';

/// Regex para coords embebidas en delivery_address: `(-12.046400, -77.042800)`.
final _coordsRe = RegExp(r'\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)');

const _fallbackCenter = LatLng(AppConfig.restaurantLat, AppConfig.restaurantLng);

/// Colores de urgencia por distancia (espejo de urgencyColor).
const _green = Color(0xFF10B981); // < 2 km
const _orange = Color(0xFFF97316); // < 5 km
const _red = Color(0xFFEF4444); // resto
const _blue = Color(0xFF3B82F6); // marcador "yo" / sin distancia

/// Pedido cercano con coordenadas parseadas + distancia opcional.
class _OrderWithCoords {
  _OrderWithCoords({required this.order, required this.point, this.distanceKm});

  final NearbyOrder order;
  final LatLng point;
  final double? distanceKm;

  int get id => order.id;

  _OrderWithCoords withDistance(double? km) =>
      _OrderWithCoords(order: order, point: point, distanceKm: km);
}

Color _urgencyColor(double km) {
  if (km < 2) return _green;
  if (km < 5) return _orange;
  return _red;
}

/// Mapa de pedidos cercanos para el repartidor — espejo de DriverMapPage.tsx.
/// Se renderiza dentro de DriverShell (provee el body, sin AppBar propio).
class DriverMapScreen extends ConsumerStatefulWidget {
  const DriverMapScreen({super.key});

  @override
  ConsumerState<DriverMapScreen> createState() => _DriverMapScreenState();
}

class _DriverMapScreenState extends ConsumerState<DriverMapScreen> {
  final _map = MapController();
  final _distance = const Distance();

  List<_OrderWithCoords> _orders = [];
  LatLng? _myPos;
  LatLng? _lastFly;
  LatLng? _restaurant;
  bool _loading = true;
  bool _locating = false;
  String? _error;
  int? _accepting;
  double _maxKm = 10;

  @override
  void initState() {
    super.initState();
    _load();
    _loadRestaurant();
  }

  /// Carga la ubicación del restaurante; si falla, no se muestra el pin.
  Future<void> _loadRestaurant() async {
    try {
      final cfg = await StoreConfigService.get();
      if (!mounted) return;
      setState(() => _restaurant = LatLng(cfg.latitude, cfg.longitude));
    } catch (_) {
      // Silencioso: el mapa sigue funcionando sin el pin del restaurante.
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await DeliveryService.nearbyOrders();
      final parsed = <_OrderWithCoords>[];
      for (final o in list) {
        final m = _coordsRe.firstMatch(o.deliveryAddress);
        if (m != null) {
          final lat = double.tryParse(m.group(1)!);
          final lon = double.tryParse(m.group(2)!);
          if (lat != null && lon != null) {
            parsed.add(_OrderWithCoords(order: o, point: LatLng(lat, lon)));
          }
        }
      }
      if (!mounted) return;
      setState(() => _orders = parsed);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = getErrorMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _locateMe() async {
    setState(() => _locating = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _showError('Activa la ubicación del dispositivo');
        return;
      }
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        _showError('Permiso de ubicación denegado');
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      if (!mounted) return;
      final me = LatLng(pos.latitude, pos.longitude);
      setState(() => _myPos = me);
      _flyToOnce(me);
    } catch (e) {
      _showError(getErrorMessage(e));
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  /// Recentra solo cuando el usuario se movió de forma significativa (>~50m),
  /// para que el mapa no "salte" al refrescar pedidos cercanos.
  void _flyToOnce(LatLng pos) {
    final prev = _lastFly;
    if (prev != null &&
        (prev.latitude - pos.latitude).abs() < 5e-4 &&
        (prev.longitude - pos.longitude).abs() < 5e-4) {
      return;
    }
    _lastFly = pos;
    try {
      _map.move(pos, _map.camera.zoom);
    } catch (_) {}
  }

  Future<void> _accept(int id) async {
    setState(() => _accepting = id);
    try {
      await DeliveryService.accept(id);
      if (!mounted) return;
      context.push('/delivery/my-orders/$id');
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = getErrorMessage(e));
    } finally {
      if (mounted) setState(() => _accepting = null);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  /// Anota distancia (si hay ubicación), filtra por radio y ordena.
  List<_OrderWithCoords> get _visible {
    final me = _myPos;
    if (me == null) return _orders;
    final annotated = _orders
        .map((o) =>
            o.withDistance(_distance.as(LengthUnit.Kilometer, me, o.point)))
        .where((o) => (o.distanceKm ?? 0) <= _maxKm)
        .toList()
      ..sort((a, b) => (a.distanceKm ?? 0).compareTo(b.distanceKm ?? 0));
    return annotated;
  }

  LatLng get _center {
    final me = _myPos;
    if (me != null) return me;
    final v = _visible;
    return v.isNotEmpty ? v.first.point : _fallbackCenter;
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visible;
    final shortlist = visible.take(5).toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _header(),
          const SizedBox(height: 12),
          if (_error != null) ...[
            _errorBox(_error!),
            const SizedBox(height: 12),
          ],
          if (_myPos != null) ...[
            _radiusSlider(),
            const SizedBox(height: 12),
          ],
          _mapBox(visible),
          if (_myPos == null) ...[
            const SizedBox(height: 12),
            const Text(
              '💡 Activa "Mi ubicación" para ver distancia y filtrar por radio',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Neutral.n500),
            ),
          ],
          const SizedBox(height: 16),
          _shortlist(visible, shortlist),
        ],
      ),
    );
  }

  Widget _header() {
    return Row(
      children: [
        const Expanded(
          child: Text('🗺️ Pedidos cerca',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        ),
        IconButton(
          tooltip: 'Mi ubicación',
          onPressed: _locating ? null : _locateMe,
          icon: _locating
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.my_location, size: 20),
        ),
        IconButton(
          tooltip: 'Refrescar',
          onPressed: _loading ? null : _load,
          icon: const Icon(Icons.refresh, size: 20),
        ),
      ],
    );
  }

  Widget _errorBox(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(message,
          style: const TextStyle(fontSize: 13, color: Color(0xFFB91C1C))),
    );
  }

  Widget _radiusSlider() {
    return SectionCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Row(
        children: [
          const Text('Radio:',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          Expanded(
            child: Slider(
              min: 1,
              max: 20,
              divisions: 19,
              value: _maxKm,
              activeColor: BrandColors.c500,
              label: '${_maxKm.round()} km',
              onChanged: (v) => setState(() => _maxKm = v),
            ),
          ),
          SizedBox(
            width: 48,
            child: Text('${_maxKm.round()} km',
                textAlign: TextAlign.right,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _mapBox(List<_OrderWithCoords> visible) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 420,
        child: Stack(
          children: [
            FlutterMap(
              mapController: _map,
              options: MapOptions(
                initialCenter: _center,
                initialZoom: 13,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.all & ~InteractiveFlag.scrollWheelZoom,
                ),
              ),
              children: [
                const ReactiveTileLayer(),
                MarkerLayer(
                  markers: [
                    if (_restaurant != null)
                      Marker(
                        point: _restaurant!,
                        width: 44,
                        height: 44,
                        alignment: Alignment.topCenter,
                        child: const RestaurantMarker(),
                      ),
                    for (final o in visible)
                      Marker(
                        point: o.point,
                        width: 40,
                        height: 40,
                        alignment: Alignment.topCenter,
                        child: GestureDetector(
                          onTap: () => _showOrderSheet(o),
                          child: PinMarker(
                            color: o.distanceKm != null
                                ? _urgencyColor(o.distanceKm!)
                                : _blue,
                          ),
                        ),
                      ),
                    if (_myPos != null)
                      Marker(
                        point: _myPos!,
                        width: 22,
                        height: 22,
                        alignment: Alignment.center,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _blue,
                            border: Border.all(color: Colors.white, width: 3),
                            boxShadow: [
                              BoxShadow(
                                  color: _blue.withValues(alpha: 0.35),
                                  spreadRadius: 4),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
                attributionFor(ref.watch(tileStyleProvider)),
              ],
            ),
            if (_loading)
              const Positioned.fill(
                child: ColoredBox(
                  color: Color(0x66FFFFFF),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showOrderSheet(_OrderWithCoords o) {
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Pedido ${o.order.orderNumber}',
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.place_outlined, size: 16, color: Neutral.n500),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(o.order.deliveryAddress.split(' — ').first,
                      style:
                          const TextStyle(fontSize: 13, color: Neutral.n600)),
                ),
              ],
            ),
            if (o.distanceKm != null) ...[
              const SizedBox(height: 4),
              Text('${o.distanceKm!.toStringAsFixed(2)} km',
                  style: const TextStyle(fontSize: 12, color: Neutral.n500)),
            ],
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(Fmt.money(o.order.deliveryFee),
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: BrandColors.c600)),
                FilledButton(
                  onPressed: _accepting == o.id
                      ? null
                      : () {
                          Navigator.of(ctx).pop();
                          _accept(o.id);
                        },
                  child: _accepting == o.id
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Aceptar'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _shortlist(
      List<_OrderWithCoords> visible, List<_OrderWithCoords> shortlist) {
    if (visible.isEmpty && !_loading) {
      return EmptyView(
        icon: Icons.access_time,
        message: _myPos != null
            ? 'No hay pedidos dentro de ${_maxKm.round()} km'
            : 'No hay pedidos disponibles',
      );
    }
    return Column(
      children: [
        for (final o in shortlist) ...[
          _shortlistTile(o),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  Widget _shortlistTile(_OrderWithCoords o) {
    return SectionCard(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(o.order.orderNumber,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w800)),
                    ),
                    if (o.distanceKm != null) ...[
                      const SizedBox(width: 6),
                      Text('· ${o.distanceKm!.toStringAsFixed(2)} km',
                          style: const TextStyle(
                              fontSize: 12, color: Neutral.n500)),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    const Icon(Icons.place_outlined,
                        size: 13, color: Neutral.n400),
                    const SizedBox(width: 3),
                    Expanded(
                      child: Text(o.order.deliveryAddress.split(' — ').first,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 12, color: Neutral.n500)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          FilledButton(
            onPressed: _accepting == o.id ? null : () => _accept(o.id),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            ),
            child: _accepting == o.id
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : Text(Fmt.money(o.order.deliveryFee),
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
