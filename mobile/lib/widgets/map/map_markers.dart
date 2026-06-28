import 'package:flutter/material.dart';

import '../../core/theme.dart';

/// Marcador de destino — gota naranja con centro blanco (espejo destinationIcon).
class DestinationMarker extends StatelessWidget {
  const DestinationMarker({super.key});

  @override
  Widget build(BuildContext context) {
    return const Stack(
      alignment: Alignment.center,
      children: [
        Icon(Icons.location_on, size: 42, color: BrandColors.c600),
        Positioned(
          top: 9,
          child: CircleAvatar(radius: 6, backgroundColor: Colors.white),
        ),
      ],
    );
  }
}

/// Marcador de gota de color sólido (StaticMap, admin drivers).
class PinMarker extends StatelessWidget {
  const PinMarker({super.key, required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Icon(Icons.location_on, size: 40, color: color),
        const Positioned(
          top: 8,
          child: CircleAvatar(radius: 5, backgroundColor: Colors.white),
        ),
      ],
    );
  }
}

/// Marcador del restaurante — pin de marca con emoji de pollo (punto de despacho).
/// Distintivo respecto a destino/repartidor para no confundirlos en el mapa.
class RestaurantMarker extends StatelessWidget {
  const RestaurantMarker({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 44,
      height: 44,
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Icon(Icons.location_on, size: 44, color: BrandColors.c700),
          Positioned(
            top: 6,
            child: Container(
              width: 22,
              height: 22,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
              ),
              alignment: Alignment.center,
              child: const Text('🍗', style: TextStyle(fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }
}

/// Marcador del repartidor — círculo azul pulsante con scooter (espejo driverIcon).
class DriverMarker extends StatefulWidget {
  const DriverMarker({super.key, this.glyph = '🛵'});
  final String glyph;

  @override
  State<DriverMarker> createState() => _DriverMarkerState();
}

class _DriverMarkerState extends State<DriverMarker>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  static const _blue = Color(0xFF3B82F6);

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 46,
      height: 46,
      child: Stack(
        alignment: Alignment.center,
        children: [
          AnimatedBuilder(
            animation: _c,
            builder: (_, __) {
              final t = _c.value; // 0..1
              final scale = 1.0 + 0.8 * t;
              final opacity = (0.5 * (1 - t)).clamp(0.0, 1.0);
              return Container(
                width: 36 * scale,
                height: 36 * scale,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _blue.withValues(alpha: opacity),
                ),
              );
            },
          ),
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _blue,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: const [
                BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2)),
              ],
            ),
            alignment: Alignment.center,
            child: Text(widget.glyph, style: const TextStyle(fontSize: 18)),
          ),
        ],
      ),
    );
  }
}
