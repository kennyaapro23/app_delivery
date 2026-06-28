import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config.dart';
import '../../providers/tile_style_provider.dart';

/// Construye el TileLayer del estilo dado — espejo de BaseTileLayer.tsx.
TileLayer buildTileLayer(BuildContext context, TileStyleConfig cfg) {
  final retina = MediaQuery.of(context).devicePixelRatio > 1.5;
  return TileLayer(
    urlTemplate: cfg.urlTemplate,
    subdomains: cfg.subdomains,
    maxZoom: cfg.maxZoom,
    userAgentPackageName: 'com.chikenhot.app',
    retinaMode: retina,
    tileProvider: NetworkTileProvider(),
  );
}

/// TileLayer que reacciona al estilo seleccionado globalmente.
class ReactiveTileLayer extends ConsumerWidget {
  const ReactiveTileLayer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final style = ref.watch(tileStyleProvider);
    final cfg = kTileStyles[style]!;
    return buildTileLayer(context, cfg);
  }
}

/// Atribución obligatoria (OSM/CARTO/Esri).
Widget attributionFor(TileStyleId style) {
  final cfg = kTileStyles[style]!;
  return RichAttributionWidget(
    alignment: AttributionAlignment.bottomRight,
    attributions: [TextSourceAttribution(cfg.attribution, onTap: () {})],
  );
}
