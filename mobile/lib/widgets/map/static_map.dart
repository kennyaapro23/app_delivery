import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/config.dart';
import '../../services/store_config_service.dart';
import 'map_markers.dart';
import 'tile_layer_builder.dart';

class MapPin {
  MapPin({required this.point, this.color = const Color(0xFFF97316), this.onTap});
  final LatLng point;
  final Color color;
  final VoidCallback? onTap;
}

/// Mapa no interactivo con marcadores de colores — espejo de StaticMap.tsx.
class StaticMap extends ConsumerStatefulWidget {
  const StaticMap({super.key, required this.pins, this.height = 320});
  final List<MapPin> pins;
  final double height;

  @override
  ConsumerState<StaticMap> createState() => _StaticMapState();
}

class _StaticMapState extends ConsumerState<StaticMap> {
  final _map = MapController();
  LatLng? _restaurant;

  @override
  void initState() {
    super.initState();
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

  void _fit() {
    final pins = widget.pins;
    if (pins.isEmpty) return;
    try {
      if (pins.length == 1) {
        _map.move(pins.first.point, 15);
      } else {
        _map.fitCamera(CameraFit.bounds(
          bounds: LatLngBounds.fromPoints(pins.map((p) => p.point).toList()),
          padding: const EdgeInsets.all(40),
        ));
      }
    } catch (_) {}
  }

  bool _pinsChanged(List<MapPin> a, List<MapPin> b) {
    if (a.length != b.length) return true;
    for (var i = 0; i < a.length; i++) {
      if (a[i].point.latitude != b[i].point.latitude ||
          a[i].point.longitude != b[i].point.longitude) {
        return true;
      }
    }
    return false;
  }

  @override
  void didUpdateWidget(covariant StaticMap old) {
    super.didUpdateWidget(old);
    if (_pinsChanged(old.pins, widget.pins)) _fit();
  }

  @override
  Widget build(BuildContext context) {
    final center = widget.pins.isNotEmpty
        ? widget.pins.first.point
        : const LatLng(AppConfig.restaurantLat, AppConfig.restaurantLng);
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: widget.height,
        child: FlutterMap(
          mapController: _map,
          options: MapOptions(
            initialCenter: center,
            initialZoom: 12,
            interactionOptions:
                const InteractionOptions(flags: InteractiveFlag.none),
            onMapReady: _fit,
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
                ...widget.pins.map((p) => Marker(
                      point: p.point,
                      width: 40,
                      height: 40,
                      alignment: Alignment.topCenter,
                      child: GestureDetector(
                        onTap: p.onTap,
                        child: PinMarker(color: p.color),
                      ),
                    )),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
