import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/config.dart';
import '../../models/order.dart';
import '../../models/tracking.dart';
import '../../services/geocoding_service.dart';
import '../../services/store_config_service.dart';
import '../../services/tracking_service.dart';
import 'map_markers.dart';
import 'tile_layer_builder.dart';
import 'tile_style_switcher.dart';

final _coordsRe = RegExp(r'\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)');

String _cleanAddress(String addr) {
  return addr
      .replaceAll(_coordsRe, '')
      .replaceAll(RegExp(r'\[[^\]]+\]\s*[—-]?\s*'), '')
      .replaceAll(RegExp(r'\s+—\s+'), ', ')
      .trim();
}

double _haversineKm(LatLng a, LatLng b) {
  const r = 6371.0;
  final dLat = (b.latitude - a.latitude) * math.pi / 180;
  final dLon = (b.longitude - a.longitude) * math.pi / 180;
  final lat1 = a.latitude * math.pi / 180;
  final lat2 = b.latitude * math.pi / 180;
  final sa = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(lat1) * math.cos(lat2) * math.sin(dLon / 2) * math.sin(dLon / 2);
  return 2 * r * math.asin(math.sqrt(sa));
}

const _speeds = {'moto': 30.0, 'bicicleta': 15.0, 'auto': 25.0};
const _defaultSpeed = 25.0;

String _formatEta(double minutes) {
  if (minutes < 1) return 'Llegando';
  if (minutes < 60) return '${minutes.round()} min';
  final h = (minutes / 60).floor();
  final m = (minutes % 60).round();
  return m == 0 ? '$h h' : '$h h $m min';
}

class LiveOrderMap extends ConsumerStatefulWidget {
  const LiveOrderMap({
    super.key,
    required this.orderId,
    this.refreshSeconds = AppConfig.trackingPollSeconds,
    this.height = 320,
  });

  final int orderId;
  final int refreshSeconds;
  final double height;

  @override
  ConsumerState<LiveOrderMap> createState() => _LiveOrderMapState();
}

class _LiveOrderMapState extends ConsumerState<LiveOrderMap> {
  final _map = MapController();
  Timer? _timer;
  bool _mapReady = false;
  bool _loading = true;
  String? _error;
  OrderTracking? _data;
  LatLng? _geocodedDest;
  LatLng? _restaurant;
  String? _lastGeocodedAddr;
  DateTime _lastFetch = DateTime.now();

  @override
  void initState() {
    super.initState();
    _fetchOnce();
    _loadRestaurant();
    _timer = Timer.periodic(
        Duration(seconds: widget.refreshSeconds), (_) => _fetchOnce());
  }

  /// Carga la ubicación del restaurante; si falla, no se muestra el pin.
  Future<void> _loadRestaurant() async {
    try {
      final cfg = await StoreConfigService.get();
      if (!mounted) return;
      setState(() => _restaurant = LatLng(cfg.latitude, cfg.longitude));
    } catch (_) {
      // Silencioso: el seguimiento sigue funcionando sin el pin del restaurante.
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetchOnce() async {
    try {
      final d = await TrackingService.get(widget.orderId);
      if (!mounted) return;
      setState(() {
        _data = d;
        _lastFetch = DateTime.now();
        _error = null;
        _loading = false;
      });
      if (!d.isActive) {
        _timer?.cancel();
        _timer = null;
      } else {
        _timer ??= Timer.periodic(
            Duration(seconds: widget.refreshSeconds), (_) => _fetchOnce());
      }
      _maybeGeocode(d.deliveryAddress);
      _autoFit();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo obtener seguimiento';
        _loading = false;
      });
    }
  }

  Future<void> _maybeGeocode(String addr) async {
    if (!mounted) return;
    if (_coordsRe.hasMatch(addr)) {
      if (_geocodedDest != null) setState(() => _geocodedDest = null);
      return;
    }
    if (_lastGeocodedAddr == addr) return;
    _lastGeocodedAddr = addr;
    final cleaned = _cleanAddress(addr);
    if (cleaned.length < 4) return;
    final results = await GeocodingService.search(cleaned);
    if (!mounted || results.isEmpty) return;
    setState(() => _geocodedDest = LatLng(results.first.lat, results.first.lon));
    _autoFit();
  }

  LatLng? get _dest {
    final addr = _data?.deliveryAddress ?? '';
    final m = _coordsRe.firstMatch(addr);
    if (m != null) {
      return LatLng(double.parse(m.group(1)!), double.parse(m.group(2)!));
    }
    return _geocodedDest;
  }

  LatLng? get _driver {
    final d = _data;
    if (d != null && d.hasDriverLocation) {
      return LatLng(d.driverLatitude!, d.driverLongitude!);
    }
    return null;
  }

  void _autoFit() {
    if (!_mapReady) return;
    final dest = _dest;
    final driver = _driver;
    try {
      if (dest != null && driver != null) {
        final same = (dest.latitude - driver.latitude).abs() < 1e-6 &&
            (dest.longitude - driver.longitude).abs() < 1e-6;
        if (same) {
          _map.move(driver, 16);
        } else {
          _map.fitCamera(CameraFit.bounds(
            bounds: LatLngBounds(dest, driver),
            padding: const EdgeInsets.all(50),
            maxZoom: 16,
          ));
        }
      } else if (driver != null) {
        _map.move(driver, 15);
      } else if (dest != null) {
        _map.move(dest, 15);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        height: widget.height,
        decoration: BoxDecoration(
          color: const Color(0xFFFAFAFA),
          border: Border.all(color: const Color(0xFFE5E5E5)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(child: CircularProgressIndicator()),
      );
    }
    final data = _data;
    if (_error != null || data == null) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFD4D4D4), style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(child: Text(_error ?? 'Sin datos de seguimiento')),
      );
    }

    final dest = _dest;
    final driver = _driver;
    final center = driver ??
        dest ??
        const LatLng(AppConfig.restaurantLat, AppConfig.restaurantLng);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            height: widget.height,
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _map,
                  options: MapOptions(
                    initialCenter: center,
                    initialZoom: 14,
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.all & ~InteractiveFlag.scrollWheelZoom,
                    ),
                    onMapReady: () {
                      _mapReady = true;
                      _autoFit();
                    },
                  ),
                  children: [
                    const ReactiveTileLayer(),
                    if (driver != null && dest != null)
                      PolylineLayer(polylines: [
                        Polyline(
                          points: [driver, dest],
                          color: const Color(0xFF3B82F6).withValues(alpha: 0.7),
                          strokeWidth: 3,
                          pattern: StrokePattern.dashed(segments: const [8, 6]),
                        ),
                      ]),
                    MarkerLayer(markers: [
                      if (_restaurant != null)
                        Marker(
                          point: _restaurant!,
                          width: 44,
                          height: 44,
                          alignment: Alignment.topCenter,
                          child: const RestaurantMarker(),
                        ),
                      if (dest != null)
                        Marker(
                          point: dest,
                          width: 42,
                          height: 42,
                          alignment: Alignment.topCenter,
                          child: const DestinationMarker(),
                        ),
                      if (driver != null)
                        Marker(
                          point: driver,
                          width: 46,
                          height: 46,
                          alignment: Alignment.center,
                          child: DriverMarker(),
                        ),
                    ]),
                  ],
                ),
                if (data.isActive)
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _PulseDot(),
                          SizedBox(width: 6),
                          Text('En vivo',
                              style: TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ),
                const TileStyleSwitcher(),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        _EtaBanner(data: data, driver: driver, dest: dest),
        const SizedBox(height: 6),
        _RefreshFooter(
          driverName: data.driverName,
          driverUpdatedAt: data.driverUpdatedAt,
          lastFetch: _lastFetch,
          refreshSeconds: widget.refreshSeconds,
          hasDriver: driver != null,
        ),
      ],
    );
  }
}

class _PulseDot extends StatefulWidget {
  const _PulseDot();
  @override
  State<_PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<_PulseDot> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(seconds: 1))
        ..repeat(reverse: true);
  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween(begin: 0.4, end: 1.0).animate(_c),
      child: Container(
        width: 8,
        height: 8,
        decoration: const BoxDecoration(
            shape: BoxShape.circle, color: Color(0xFF22C55E)),
      ),
    );
  }
}

class _EtaBanner extends StatelessWidget {
  const _EtaBanner({required this.data, required this.driver, required this.dest});
  final OrderTracking data;
  final LatLng? driver;
  final LatLng? dest;

  @override
  Widget build(BuildContext context) {
    if (driver == null || dest == null) {
      if (!data.isActive) return const SizedBox.shrink();
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF3C7),
          border: Border.all(color: const Color(0xFFFDE68A)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Row(children: [
          Icon(Icons.schedule, size: 18, color: Color(0xFF92400E)),
          SizedBox(width: 8),
          Expanded(
              child: Text('Esperando ubicación del repartidor para calcular ETA…',
                  style: TextStyle(color: Color(0xFF92400E)))),
        ]),
      );
    }
    final km = _haversineKm(driver!, dest!);
    final speed = _speeds[data.driverVehicleType] ?? _defaultSpeed;
    final minutes = km / speed * 60;

    final (bg, border, fg) = switch (data.status) {
      OrderStatus.onTheWay => (
          const Color(0xFFDCFCE7),
          const Color(0xFFBBF7D0),
          const Color(0xFF166534)
        ),
      OrderStatus.delivered => (
          const Color(0xFFF5F5F5),
          const Color(0xFFE5E5E5),
          const Color(0xFF525252)
        ),
      _ => (
          const Color(0xFFDBEAFE),
          const Color(0xFFBFDBFE),
          const Color(0xFF1E40AF)
        ),
    };
    final title = switch (data.status) {
      OrderStatus.onTheWay => 'Llegada estimada',
      OrderStatus.delivered => 'Entregado',
      _ => 'ETA aprox.',
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(children: [
            Icon(Icons.schedule, color: fg),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title.toUpperCase(),
                    style: TextStyle(
                        fontSize: 10, letterSpacing: 0.5, color: fg.withValues(alpha: 0.7))),
                Text(
                  data.status == OrderStatus.delivered ? '—' : _formatEta(minutes),
                  style: TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold, color: fg),
                ),
              ],
            ),
          ]),
          Row(children: [
            Icon(Icons.route, size: 14, color: fg),
            const SizedBox(width: 4),
            Text('${km.toStringAsFixed(2)} km',
                style: TextStyle(fontSize: 12, color: fg)),
          ]),
        ],
      ),
    );
  }
}

class _RefreshFooter extends StatefulWidget {
  const _RefreshFooter({
    required this.driverName,
    required this.driverUpdatedAt,
    required this.lastFetch,
    required this.refreshSeconds,
    required this.hasDriver,
  });
  final String? driverName;
  final DateTime? driverUpdatedAt;
  final DateTime lastFetch;
  final int refreshSeconds;
  final bool hasDriver;

  @override
  State<_RefreshFooter> createState() => _RefreshFooterState();
}

class _RefreshFooterState extends State<_RefreshFooter> {
  Timer? _tick;
  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  String _timeAgoSec(double sec) {
    if (sec < 5) return 'ahora';
    if (sec < 60) return 'hace ${sec.round()}s';
    return 'hace ${(sec / 60).floor()} min';
  }

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(fontSize: 11, color: Color(0xFF737373));
    Widget right;
    if (widget.driverUpdatedAt != null) {
      final ageSec =
          DateTime.now().difference(widget.driverUpdatedAt!).inMilliseconds / 1000;
      final elapsed =
          DateTime.now().difference(widget.lastFetch).inSeconds;
      final countdown = math.max(0, widget.refreshSeconds - elapsed);
      right = Text(
        'GPS del repartidor: ${_timeAgoSec(ageSec)} · Actualiza en ${countdown}s',
        style: style,
      );
    } else if (widget.hasDriver) {
      right = const Text('—', style: style);
    } else {
      right = const Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.location_on, size: 12, color: Color(0xFF737373)),
        SizedBox(width: 2),
        Text('Esperando ubicación', style: style),
      ]);
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Flexible(
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.pedal_bike, size: 12, color: Color(0xFF737373)),
            const SizedBox(width: 4),
            Flexible(
              child: Text(widget.driverName ?? 'Sin repartidor asignado',
                  style: style, overflow: TextOverflow.ellipsis),
            ),
          ]),
        ),
        Flexible(child: Align(alignment: Alignment.centerRight, child: right)),
      ],
    );
  }
}
