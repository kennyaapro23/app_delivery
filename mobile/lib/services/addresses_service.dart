import '../core/api_client.dart';
import '../models/address.dart';

class AddressesService {
  static final _dio = ApiClient.instance.dio;

  static Future<List<Address>> list() async {
    final res = await _dio.get('/addresses');
    ensureOk(res);
    return (res.data as List? ?? [])
        .map((e) => Address.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<Address> create(Map<String, dynamic> payload) async {
    final res = await _dio.post('/addresses', data: payload);
    ensureOk(res);
    return Address.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<Address> update(int id, Map<String, dynamic> payload) async {
    final res = await _dio.put('/addresses/$id', data: payload);
    ensureOk(res);
    return Address.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<void> delete(int id) async {
    final res = await _dio.delete('/addresses/$id');
    ensureOk(res);
  }
}
