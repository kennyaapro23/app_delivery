import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Almacenamiento de tokens (seguro) y preferencias (cart, tile style).
class Storage {
  Storage._();

  static const _secure = FlutterSecureStorage();

  static const _kAccess = 'chikenhot_access';
  static const _kRefresh = 'chikenhot_refresh';
  static const _kSession = 'chikenhot_session'; // json: userId/role/fullName

  // ── Tokens ──────────────────────────────────────────────────
  static Future<void> saveTokens(String access, String refresh) async {
    await _secure.write(key: _kAccess, value: access);
    await _secure.write(key: _kRefresh, value: refresh);
  }

  static Future<String?> get accessToken => _secure.read(key: _kAccess);
  static Future<String?> get refreshToken => _secure.read(key: _kRefresh);

  static Future<void> saveSession(String json) =>
      _secure.write(key: _kSession, value: json);
  static Future<String?> get session => _secure.read(key: _kSession);

  static Future<void> clearAuth() async {
    await _secure.delete(key: _kAccess);
    await _secure.delete(key: _kRefresh);
    await _secure.delete(key: _kSession);
  }

  // ── Preferencias simples (shared_preferences) ───────────────
  // Cacheamos el Future (no el valor) para que llamadas concurrentes al
  // arranque compartan una única inicialización y no disparen varios
  // getInstance() en paralelo.
  static Future<SharedPreferences>? _prefsFuture;
  static Future<SharedPreferences> get _p =>
      _prefsFuture ??= SharedPreferences.getInstance();

  static Future<void> setString(String key, String value) async =>
      (await _p).setString(key, value);

  static Future<String?> getString(String key) async =>
      (await _p).getString(key);

  static Future<void> remove(String key) async => (await _p).remove(key);
}
