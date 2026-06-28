import '../core/api_client.dart';
import '../models/dashboard.dart';
import '../models/delivery.dart';

class DashboardService {
  static final _dio = ApiClient.instance.dio;

  static Future<AdminDashboard> admin() async {
    final res = await _dio.get('/dashboard/admin');
    ensureOk(res);
    return AdminDashboard.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<CustomerDashboard> customer() async {
    final res = await _dio.get('/dashboard/customer');
    ensureOk(res);
    return CustomerDashboard.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<DriverStats> driver() async {
    final res = await _dio.get('/dashboard/driver');
    ensureOk(res);
    return DriverStats.fromJson(res.data as Map<String, dynamic>);
  }
}
