import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../../core/config.dart';
import '../../services/geocoding_service.dart';
import 'map_markers.dart';
import 'tile_layer_builder.dart';
import 'tile_style_switcher.dart';

class PickedLocation {
  PickedLocation({required this.lat, required this.lon, required this.address});
  final double lat;
  final double lon;
  final String address;
}

/// Selector de ubicación en mapa — espejo de LocationPicker.tsx.
class LocationPicker extends ConsumerStatefulWidget {
  const LocationPicker({
    super.key,
    this.initial,
    required this.onChanged,
    this.height = 280,
  });

  final PickedLocation? initial;
  final ValueChanged<PickedLocation> onChanged;
  final double height;

  @override
  ConsumerState<LocationPicker> createState() => _LocationPickerState();
}

class _LocationPickerState extends ConsumerState<LocationPicker> {
  final _map = MapController();
  final _searchCtrl = TextEditingController();
  late LatLng _pos;
  String? _address;
  Timer? _reverseDebounce;
  Timer? _searchDebounce;
  List<GeocodeResult> _results = [];
  bool _searching = false;
  bool _locating = false;

  @override
  void initState() {
    super.initState();
    final i = widget.initial;
    _pos = i != null
        ? LatLng(i.lat, i.lon)
        : const LatLng(AppConfig.restaurantLat, AppConfig.restaurantLng);
    _address = i?.address;
    if (i == null) {
      // Auto-detectar GPS al abrir; si falla, queda en Lima Centro.
      WidgetsBinding.instance.addPostFrameCallback((_) => _useMyLocation());
    }
  }

  @override
  void dispose() {
    _reverseDebounce?.cancel();
    _searchDebounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _setPosition(LatLng p, {bool move = true}) {
    setState(() => _pos = p);
    if (move) _map.move(p, _map.camera.zoom);
    _scheduleReverse();
  }

  void _scheduleReverse() {
    _reverseDebounce?.cancel();
    _reverseDebounce = Timer(const Duration(milliseconds: 500), () async {
      final r = await GeocodingService.reverse(_pos.latitude, _pos.longitude);
      if (!mounted) return;
      final addr = r?.shortAddress ?? '';
      setState(() => _address = addr);
      widget.onChanged(
          PickedLocation(lat: _pos.latitude, lon: _pos.longitude, address: addr));
    });
  }

  void _onSearchChanged(String q) {
    _searchDebounce?.cancel();
    if (q.trim().length < 3) {
      setState(() => _results = []);
      return;
    }
    _searchDebounce = Timer(const Duration(milliseconds: 400), () async {
      setState(() => _searching = true);
      final res = await GeocodingService.search(q);
      if (!mounted) return;
      setState(() {
        _results = res;
        _searching = false;
      });
    });
  }

  Future<void> _useMyLocation() async {
    setState(() => _locating = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw 'Activa el GPS del dispositivo';
      }
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        throw 'Permiso de ubicación denegado';
      }
      final p = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 10)),
      );
      final ll = LatLng(p.latitude, p.longitude);
      _map.move(ll, 16);
      _setPosition(ll, move: false);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Buscador
        Stack(
          children: [
            Column(
              children: [
                TextField(
                  controller: _searchCtrl,
                  onChanged: _onSearchChanged,
                  decoration: InputDecoration(
                    hintText: 'Buscar dirección…',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searching
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2)),
                          )
                        : null,
                    isDense: true,
                  ),
                ),
                if (_results.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    constraints: const BoxConstraints(maxHeight: 180),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: const Color(0xFFE5E5E5)),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: ListView(
                      shrinkWrap: true,
                      children: _results
                          .map((r) => ListTile(
                                dense: true,
                                leading: const Icon(Icons.place_outlined, size: 18),
                                title: Text(r.shortAddress,
                                    maxLines: 1, overflow: TextOverflow.ellipsis),
                                subtitle: Text(r.displayName,
                                    maxLines: 1, overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 11)),
                                onTap: () {
                                  final ll = LatLng(r.lat, r.lon);
                                  _searchCtrl.clear();
                                  setState(() => _results = []);
                                  _map.move(ll, 16);
                                  _setPosition(ll, move: false);
                                },
                              ))
                          .toList(),
                    ),
                  ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 8),
        // Mapa
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            height: widget.height,
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _map,
                  options: MapOptions(
                    initialCenter: _pos,
                    initialZoom: 16,
                    onTap: (_, p) => _setPosition(p, move: false),
                  ),
                  children: [
                    const ReactiveTileLayer(),
                    MarkerLayer(markers: [
                      Marker(
                        point: _pos,
                        width: 42,
                        height: 42,
                        alignment: Alignment.topCenter,
                        child: const DestinationMarker(),
                      ),
                    ]),
                  ],
                ),
                const TileStyleSwitcher(),
                Positioned(
                  right: 8,
                  bottom: 8,
                  child: FloatingActionButton.small(
                    heroTag: 'mylocation',
                    onPressed: _locating ? null : _useMyLocation,
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black87,
                    child: _locating
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.my_location),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        // Footer dirección + coords
        Row(
          children: [
            const Icon(Icons.place, size: 16, color: Color(0xFFF25F05)),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                _address?.isNotEmpty == true ? _address! : 'Toca el mapa para ubicar',
                style: const TextStyle(fontSize: 13),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.only(left: 22, top: 2),
          child: Text(
            '${_pos.latitude.toStringAsFixed(6)}, ${_pos.longitude.toStringAsFixed(6)}',
            style: const TextStyle(fontSize: 11, color: Color(0xFF737373)),
          ),
        ),
      ],
    );
  }
}
