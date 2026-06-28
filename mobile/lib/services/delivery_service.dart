import '../core/api_client.dart';
import '../models/delivery.dart';

class DeliveryService {
  static final _dio = ApiClient.instance.dio;

  /// Devuelve el nuevo estado de disponibilidad.
  static Future<bool> toggleAvailability() async {
    final res = await _dio.post('/delivery/toggle-availability');
    ensureOk(res);
    return (res.data as Map<String, dynamic>)['is_available'] as bool? ?? false;
  }

  static Future<void> updateLocation({
    required double latitude,
    required double longitude,
    String? zone,
  }) async {
    final res = await _dio.patch('/delivery/location', data: {
      'latitude': latitude,
      'longitude': longitude,
      if (zone != null) 'zone': zone,
    });
    ensureOk(res);
  }

  static Future<List<NearbyOrder>> nearbyOrders({int limit = 20, int skip = 0}) async {
    final res = await _dio.get('/delivery/nearby-orders',
        queryParameters: {'skip': skip, 'limit': limit});
    ensureOk(res);
    final data = res.data is Map ? res.data as Map<String, dynamic> : const {};
    return (data['orders'] as List? ?? [])
        .map((e) => NearbyOrder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /delivery/accept/{id}
  static Future<void> accept(int orderId) async {
    final res = await _dio.post('/delivery/accept/$orderId');
    ensureOk(res);
  }

  /// PATCH /delivery/complete/{id}
  static Future<void> complete(int orderId) async {
    final res = await _dio.patch('/delivery/complete/$orderId');
    ensureOk(res);
  }

  static Future<EarningsSummary> earnings() async {
    final res = await _dio.get('/delivery/earnings');
    ensureOk(res);
    return EarningsSummary.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<DriverStats> stats() async {
    final res = await _dio.get('/delivery/stats');
    ensureOk(res);
    return DriverStats.fromJson(res.data as Map<String, dynamic>);
  }

  /// GET /delivery/drivers (admin)
  static Future<List<DriverProfile>> allDrivers() async {
    final res = await _dio.get('/delivery/drivers');
    ensureOk(res);
    return (res.data as List? ?? [])
        .map((e) => DriverProfile.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
