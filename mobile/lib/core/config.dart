/// Configuración global de la app (espejo de backend/app/config.py y mapTiles.ts).
class AppConfig {
  AppConfig._();

  /// Backend desplegado en EC2 (Nginx puerto 80). Sirve para emulador,
  /// celular real y web por igual. Se puede sobreescribir con:
  ///   flutter run --dart-define=API_URL=http://otra-ip/api/v1
  static const String _override = String.fromEnvironment('API_URL');
  static const String _defaultBaseUrl = 'http://52.70.207.124/api/v1';

  static String get apiBaseUrl => _override.isNotEmpty ? _override : _defaultBaseUrl;

  // ── Restaurante / punto de despacho (Lima centro) ────────────
  static const double restaurantLat = -12.0464;
  static const double restaurantLng = -77.0428;
  static const String restaurantName = 'Chikenhot Lima Centro';

  // ── Impuestos / moneda ───────────────────────────────────────
  static const double taxRate = 0.18; // IGV Perú
  static const String currencySymbol = 'S/';

  // ── Live tracking ────────────────────────────────────────────
  static const int trackingPollSeconds = 5;
  static const int driverReportSeconds = 8;
}

/// Estilos de tiles del mapa — espejo exacto de frontend/src/lib/mapTiles.ts.
/// Todas las fuentes son GRATIS y SIN API key.
enum TileStyleId { voyager, positron, satellite, dark }

class TileStyleConfig {
  const TileStyleConfig({
    required this.id,
    required this.label,
    required this.emoji,
    required this.description,
    required this.urlTemplate,
    required this.attribution,
    required this.maxZoom,
    this.subdomains = const ['a', 'b', 'c', 'd'],
  });

  final TileStyleId id;
  final String label;
  final String emoji;
  final String description;
  final String urlTemplate;
  final String attribution;
  final double maxZoom;
  final List<String> subdomains;
}

const Map<TileStyleId, TileStyleConfig> kTileStyles = {
  TileStyleId.voyager: TileStyleConfig(
    id: TileStyleId.voyager,
    label: 'Voyager',
    emoji: '🗺️',
    description: 'Moderno y limpio (default)',
    urlTemplate:
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OSM © CARTO',
    maxZoom: 20,
  ),
  TileStyleId.positron: TileStyleConfig(
    id: TileStyleId.positron,
    label: 'Positron',
    emoji: '🤍',
    description: 'Minimal, tonos grises',
    urlTemplate:
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OSM © CARTO',
    maxZoom: 20,
  ),
  TileStyleId.satellite: TileStyleConfig(
    id: TileStyleId.satellite,
    label: 'Satélite',
    emoji: '🛰️',
    description: 'Imagen aérea real',
    urlTemplate:
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 19,
    subdomains: [],
  ),
  TileStyleId.dark: TileStyleConfig(
    id: TileStyleId.dark,
    label: 'Dark',
    emoji: '🌙',
    description: 'Tema oscuro',
    urlTemplate:
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OSM © CARTO',
    maxZoom: 20,
  ),
};

const TileStyleId kDefaultTileStyle = TileStyleId.voyager;
