import '../core/api_client.dart';
import '../models/store_config.dart';

class StoreConfigService {
  static final _dio = ApiClient.instance.dio;

  /// GET /store-config — público (todos los roles).
  static Future<StoreConfig> get() async {
    final res = await _dio.get('/store-config');
    ensureOk(res);
    return StoreConfig.fromJson(res.data as Map<String, dynamic>);
  }

  /// PATCH /store-config — actualización parcial (solo admin).
  static Future<StoreConfig> update({
    String? name,
    String? address,
    double? latitude,
    double? longitude,
    String? phone,
  }) async {
    final res = await _dio.patch('/store-config', data: {
      if (name != null) 'name': name,
      if (address != null) 'address': address,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (phone != null) 'phone': phone,
    });
    ensureOk(res);
    return StoreConfig.fromJson(res.data as Map<String, dynamic>);
  }
}
