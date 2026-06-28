import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'config.dart';
import 'storage.dart';

/// Cliente HTTP central — espejo de frontend/src/lib/api.ts.
/// Inyecta el Bearer token, y ante un 401 intenta refrescar el access token
/// con el refresh token (una sola vez) y reintenta la petición original.
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  late final Dio dio;
  String? _accessToken;
  String? _refreshToken;

  /// Llamado cuando el refresh falla -> la sesión debe cerrarse.
  VoidCallback? onLogout;

  Future<String?>? _refreshing;

  /// Generación de sesión: se incrementa en cada logout/clearTokens para
  /// invalidar un refresh en vuelo y evitar que re-guarde tokens tras cerrar
  /// sesión (sesión "fantasma").
  int _sessionGen = 0;

  bool get hasSession => _accessToken != null;

  void init() {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        headers: {'Content-Type': 'application/json'},
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        // No lanzar excepción en 4xx para poder leer el detalle uniformemente.
        validateStatus: (s) => s != null && s < 500,
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_accessToken != null) {
            options.headers['Authorization'] = 'Bearer $_accessToken';
          }
          handler.next(options);
        },
        onResponse: (response, handler) async {
          // Manejo manual del 401 (validateStatus deja pasar 4xx).
          if (_shouldRefresh(response.statusCode, response.requestOptions)) {
            final newToken = await _refresh();
            if (newToken != null) {
              try {
                final retry = await _retryRequest(
                  response.requestOptions,
                  newToken,
                );
                return handler.resolve(retry);
              } catch (_) {
                return handler.next(response);
              }
            }
          }
          handler.next(response);
        },
        onError: (e, handler) async {
          // Algunos 401 llegan como DioException (p. ej. otro Dio sin
          // validateStatus<500, errores de parseo, redirecciones). Aplicar el
          // mismo refresh aquí para que sea simétrico con onResponse.
          if (_shouldRefresh(e.response?.statusCode, e.requestOptions)) {
            final newToken = await _refresh();
            if (newToken != null) {
              try {
                final retry = await _retryRequest(e.requestOptions, newToken);
                return handler.resolve(retry);
              } catch (_) {
                return handler.next(e);
              }
            }
          }
          handler.next(e);
        },
      ),
    );
  }

  /// ¿Debe intentarse un refresh para este status/petición? Evita bucles
  /// (`_retry`) y no intenta refrescar sobre el propio endpoint de refresh.
  bool _shouldRefresh(int? statusCode, RequestOptions options) {
    return statusCode == 401 &&
        options.extra['_retry'] != true &&
        options.path != '/auth/refresh';
  }

  /// Reintenta la petición original con el nuevo token, marcándola para no
  /// reintentar de nuevo. Clona FormData para no reenviar un stream ya
  /// consumido en subidas multipart.
  Future<Response<dynamic>> _retryRequest(
    RequestOptions options,
    String newToken,
  ) {
    options.extra['_retry'] = true;
    options.headers['Authorization'] = 'Bearer $newToken';
    if (options.data is FormData) {
      options.data = (options.data as FormData).clone();
    }
    return dio.fetch(options);
  }

  Future<void> hydrate() async {
    _accessToken = await Storage.accessToken;
    _refreshToken = await Storage.refreshToken;
  }

  void setTokens(String access, String refresh) {
    _accessToken = access;
    _refreshToken = refresh;
  }

  void clearTokens() {
    _accessToken = null;
    _refreshToken = null;
    // Invalida cualquier refresh en vuelo para que no re-guarde tokens
    // después de cerrar sesión.
    _sessionGen++;
  }

  Future<String?> _refresh() {
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  Future<String?> _doRefresh() async {
    final rt = _refreshToken;
    if (rt == null) {
      _triggerLogout();
      return null;
    }
    // Marca la sesión activa al iniciar el refresh; si hay logout mientras
    // está en vuelo, descartamos el resultado al volver.
    final gen = _sessionGen;
    final Response<dynamic> res;
    try {
      final raw = Dio(
        BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          headers: {'Content-Type': 'application/json'},
          // Igual que el cliente principal: 4xx no lanzan, así distinguimos
          // "refresh inválido" (401/403) de "sin red" (timeout/conexión).
          validateStatus: (s) => s != null && s < 500,
        ),
      );
      res = await raw.post(
        '/auth/refresh',
        data: {'refresh_token': rt},
      );
    } on DioException catch (e) {
      // Errores transitorios de red/timeout: NO cerrar sesión ni borrar
      // tokens válidos. El usuario puede reintentar cuando vuelva la red.
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout) {
        return null;
      }
      _triggerLogout();
      return null;
    } catch (_) {
      _triggerLogout();
      return null;
    }

    // Sesión cerrada durante el refresh: descartar sin re-guardar tokens.
    if (gen != _sessionGen) {
      return null;
    }

    if (res.statusCode == 200 && res.data is Map) {
      final access = res.data['access_token'] as String?;
      if (access == null) {
        _triggerLogout();
        return null;
      }
      // Muchos esquemas de rotación no devuelven un nuevo refresh_token en
      // cada refresh: conservar el actual si no viene uno nuevo.
      final refresh = (res.data['refresh_token'] as String?) ?? rt;
      setTokens(access, refresh);
      await Storage.saveTokens(access, refresh);
      return access;
    }

    // 401/403 u otra respuesta no exitosa: refresh inválido -> logout.
    _triggerLogout();
    return null;
  }

  void _triggerLogout() {
    clearTokens();
    onLogout?.call();
  }
}

/// Extrae un mensaje legible — espejo de getErrorMessage en api.ts.
String getErrorMessage(Object err) {
  if (err is DioException) {
    final data = err.response?.data;
    if (data is Map) {
      final detail = data['detail'];
      if (detail is String) return detail;
      if (detail is List && detail.isNotEmpty) {
        final first = detail.first;
        if (first is Map && first['msg'] != null) return first['msg'].toString();
      }
    }
    if (err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.connectionTimeout) {
      return 'No se pudo conectar con el servidor';
    }
    return err.message ?? 'Error de red';
  }
  return 'Ocurrió un error inesperado';
}

/// Lanza una excepción si la respuesta no es 2xx, con el mensaje del backend.
void ensureOk(Response res) {
  final code = res.statusCode ?? 0;
  if (code < 200 || code >= 300) {
    String msg = 'Error $code';
    final data = res.data;
    if (data is Map && data['detail'] != null) {
      final detail = data['detail'];
      if (detail is String) {
        msg = detail;
      } else if (detail is List && detail.isNotEmpty) {
        final first = detail.first;
        if (first is Map && first['msg'] != null) msg = first['msg'].toString();
      }
    }
    throw ApiException(msg, code);
  }
}

class ApiException implements Exception {
  ApiException(this.message, this.statusCode);
  final String message;
  final int statusCode;
  @override
  String toString() => message;
}
