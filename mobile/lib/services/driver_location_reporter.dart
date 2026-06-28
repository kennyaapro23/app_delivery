import 'dart:async';

import 'package:geolocator/geolocator.dart';

import 'delivery_service.dart';

/// Reporta la ubicación GPS del repartidor al backend de forma periódica.
/// Espejo de useDriverLocationReporter.ts, pero con GPS real (sin jitter demo).
///
/// Usa un planificador RECURSIVO (no Timer.periodic) para evitar solaparse:
/// cada tick espera a que termine el reporte antes de agendar el siguiente.
class DriverLocationReporter {
  DriverLocationReporter({this.intervalSeconds = 15});

  final int intervalSeconds;
  Timer? _timer;
  bool _cancelled = true;
  bool _paused = false;

  bool get isRunning => !_cancelled;

  void start() {
    if (!_cancelled) return;
    _cancelled = false;
    _scheduleTick(immediate: true);
  }

  void stop() {
    _cancelled = true;
    _timer?.cancel();
    _timer = null;
  }

  /// Pausa los reportes cuando la app pasa a segundo plano (batería/datos).
  /// Al pausar se cancela el timer para no seguir despertando la app; al
  /// reanudar, si está corriendo, se reagenda un tick inmediato.
  void setPaused(bool paused) {
    if (_paused == paused) return;
    _paused = paused;
    if (paused) {
      _timer?.cancel();
      _timer = null;
    } else if (!_cancelled) {
      _scheduleTick(immediate: true);
    }
  }

  void _scheduleTick({bool immediate = false}) {
    _timer?.cancel();
    final delay = immediate ? Duration.zero : Duration(seconds: intervalSeconds);
    _timer = Timer(delay, _tick);
  }

  Future<void> _tick() async {
    if (_cancelled || _paused) return;
    await _reportReal();
    // El reporte es async: pudo cancelarse o pausarse mientras corría.
    if (_cancelled || _paused) return;
    _scheduleTick();
  }

  Future<bool> _reportReal() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return false;
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        return false;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );
      await DeliveryService.updateLocation(
        latitude: pos.latitude,
        longitude: pos.longitude,
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}
