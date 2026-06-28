import '../core/api_client.dart';
import '../models/user.dart';

/// Espejo de frontend/src/services/auth.ts.
class AuthService {
  static final _dio = ApiClient.instance.dio;

  static Future<TokenResponse> login(String email, String password) async {
    final res = await _dio.post('/auth/login/json', data: {
      'email': email,
      'password': password,
    });
    ensureOk(res);
    return TokenResponse.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<TokenResponse> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    final res = await _dio.post('/auth/register', data: {
      'email': email,
      'password': password,
      'full_name': fullName,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      'role': 'customer',
    });
    ensureOk(res);
    return TokenResponse.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<TokenResponse> registerDriver(Map<String, dynamic> payload) async {
    final res = await _dio.post('/auth/register-driver', data: payload);
    ensureOk(res);
    return TokenResponse.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<User> getMe() async {
    final res = await _dio.get('/auth/me');
    ensureOk(res);
    return User.fromJson(res.data as Map<String, dynamic>);
  }
}
