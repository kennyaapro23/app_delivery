import 'package:dio/dio.dart';

/// Geocoding gratis con Nominatim (OpenStreetMap) — espejo de geocoding.ts.
/// Política: máx 1 req/seg, User-Agent identificable. En clientes no-navegador
/// Nominatim EXIGE un User-Agent real, de lo contrario bloquea con 403.
class GeocodeResult {
  GeocodeResult({
    required this.lat,
    required this.lon,
    required this.displayName,
    this.address,
  });

  final double lat;
  final double lon;
  final String displayName;
  final Map<String, dynamic>? address;

  String get shortAddress {
    final a = address;
    if (a == null) return displayName;
    String? s(String k) {
      final v = a[k];
      return (v is String && v.trim().isNotEmpty) ? v : null;
    }

    final street = [s('road'), s('house_number')].whereType<String>().join(' ');
    final area = s('suburb') ?? s('neighbourhood');
    final city = s('city') ?? s('town');
    final parts =
        [street, area, city].where((e) => e != null && e.isNotEmpty).toList();
    return parts.isEmpty ? displayName : parts.join(', ');
  }
}

class GeocodingService {
  static final Dio _dio = Dio(BaseOptions(
    baseUrl: 'https://nominatim.openstreetmap.org',
    headers: {
      'User-Agent': 'Chikenhot/1.0 (contact@chikenhot.pe)',
      'Accept-Language': 'es',
    },
    connectTimeout: const Duration(seconds: 12),
    receiveTimeout: const Duration(seconds: 12),
  ));

  static Future<List<GeocodeResult>> search(String query, {CancelToken? cancel}) async {
    final q = query.trim();
    if (q.length < 3) return [];
    try {
      final res = await _dio.get('/search', queryParameters: {
        'q': q,
        'format': 'json',
        'addressdetails': '1',
        'limit': '5',
        'countrycodes': 'pe',
      }, cancelToken: cancel);
      final list = res.data as List? ?? [];
      return list.map((r) {
        final m = r as Map<String, dynamic>;
        return GeocodeResult(
          lat: double.tryParse('${m['lat']}') ?? 0,
          lon: double.tryParse('${m['lon']}') ?? 0,
          displayName: m['display_name'] as String? ?? '',
          address: m['address'] as Map<String, dynamic>?,
        );
      }).toList();
    } on DioException {
      return [];
    }
  }

  static Future<GeocodeResult?> reverse(double lat, double lon, {CancelToken? cancel}) async {
    try {
      final res = await _dio.get('/reverse', queryParameters: {
        'lat': '$lat',
        'lon': '$lon',
        'format': 'json',
        'addressdetails': '1',
      }, cancelToken: cancel);
      final m = res.data as Map<String, dynamic>?;
      if (m == null || m['display_name'] == null) return null;
      return GeocodeResult(
        lat: double.tryParse('${m['lat']}') ?? lat,
        lon: double.tryParse('${m['lon']}') ?? lon,
        displayName: m['display_name'] as String,
        address: m['address'] as Map<String, dynamic>?,
      );
    } on DioException {
      return null;
    }
  }
}
