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

  /// Registro de cliente.
  ///
  /// El backend ahora espera `first_name` y `last_name` por separado (compone
  /// `full_name = first_name + last_name` en la respuesta, así que el resto de
  /// la app que usa `full_name` no se rompe). El provider sigue entregando un
  /// `fullName` único, por lo que aquí lo separamos: la primera palabra es el
  /// nombre y el resto los apellidos.
  static Future<TokenResponse> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    final (firstName, lastName) = _splitFullName(fullName);
    final res = await _dio.post('/auth/register', data: {
      'email': email,
      'password': password,
      'first_name': firstName,
      'last_name': lastName,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      'role': 'customer',
    });
    ensureOk(res);
    return TokenResponse.fromJson(res.data as Map<String, dynamic>);
  }

  /// Registro de repartidor.
  ///
  /// El [payload] lo construye la pantalla e incluye `first_name`, `last_name`,
  /// el resto de campos de repartidor y, opcionalmente, `vehicle_photo` y
  /// `dni_photo` como data URIs base64 (`data:image/jpeg;base64,...`). Aquí solo
  /// se reenvía tal cual al backend.
  static Future<TokenResponse> registerDriver(Map<String, dynamic> payload) async {
    final res = await _dio.post('/auth/register-driver', data: payload);
    ensureOk(res);
    return TokenResponse.fromJson(res.data as Map<String, dynamic>);
  }

  /// Separa un nombre completo en (nombres, apellidos).
  /// La primera palabra es el nombre; el resto, los apellidos. Si solo hay una
  /// palabra, los apellidos quedan vacíos.
  static (String, String) _splitFullName(String fullName) {
    final parts =
        fullName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return ('', '');
    if (parts.length == 1) return (parts.first, '');
    return (parts.first, parts.sublist(1).join(' '));
  }

  static Future<User> getMe() async {
    final res = await _dio.get('/auth/me');
    ensureOk(res);
    return User.fromJson(res.data as Map<String, dynamic>);
  }
}
