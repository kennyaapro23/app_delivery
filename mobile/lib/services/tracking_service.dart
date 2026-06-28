import '../core/api_client.dart';
import '../models/tracking.dart';

class TrackingService {
  static final _dio = ApiClient.instance.dio;

  static Future<OrderTracking> get(int orderId) async {
    final res = await _dio.get('/orders/$orderId/tracking');
    ensureOk(res);
    return OrderTracking.fromJson(res.data as Map<String, dynamic>);
  }
}
