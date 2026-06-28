import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/storage.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthState {
  const AuthState({
    this.hydrated = false,
    this.authenticated = false,
    this.userId,
    this.role,
    this.fullName,
    this.user,
  });

  final bool hydrated;
  final bool authenticated;
  final int? userId;
  final UserRole? role;
  final String? fullName;
  final User? user;

  AuthState copyWith({
    bool? hydrated,
    bool? authenticated,
    int? userId,
    UserRole? role,
    String? fullName,
    User? user,
  }) {
    return AuthState(
      hydrated: hydrated ?? this.hydrated,
      authenticated: authenticated ?? this.authenticated,
      userId: userId ?? this.userId,
      role: role ?? this.role,
      fullName: fullName ?? this.fullName,
      user: user ?? this.user,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  /// Llamado una vez al arrancar: rehidrata sesión desde almacenamiento seguro.
  Future<void> init() async {
    ApiClient.instance.onLogout = _onForcedLogout;
    await ApiClient.instance.hydrate();
    final sessionJson = await Storage.session;
    if (ApiClient.instance.hasSession && sessionJson != null) {
      try {
        final s = jsonDecode(sessionJson) as Map<String, dynamic>;
        state = state.copyWith(
          hydrated: true,
          authenticated: true,
          userId: (s['user_id'] as num?)?.toInt(),
          role: UserRole.fromApi(s['role'] as String?),
          fullName: s['full_name'] as String?,
        );
        // Refresca el perfil en segundo plano (puntos, etc.).
        unawaitedLoadProfile();
        return;
      } catch (_) {}
    }
    state = state.copyWith(hydrated: true, authenticated: false);
  }

  void unawaitedLoadProfile() {
    loadProfile().catchError((_) {});
  }

  Future<void> _persistSession(TokenResponse t) async {
    ApiClient.instance.setTokens(t.accessToken, t.refreshToken);
    await Storage.saveTokens(t.accessToken, t.refreshToken);
    await Storage.saveSession(jsonEncode({
      'user_id': t.userId,
      'role': t.role.api,
      'full_name': t.fullName,
    }));
    state = state.copyWith(
      hydrated: true,
      authenticated: true,
      userId: t.userId,
      role: t.role,
      fullName: t.fullName,
    );
    unawaitedLoadProfile();
  }

  Future<UserRole> login(String email, String password) async {
    final t = await AuthService.login(email, password);
    await _persistSession(t);
    return t.role;
  }

  Future<UserRole> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    final t = await AuthService.register(
      email: email,
      password: password,
      fullName: fullName,
      phone: phone,
    );
    await _persistSession(t);
    return t.role;
  }

  Future<UserRole> registerDriver(Map<String, dynamic> payload) async {
    final t = await AuthService.registerDriver(payload);
    await _persistSession(t);
    return t.role;
  }

  Future<void> loadProfile() async {
    final user = await AuthService.getMe();
    state = state.copyWith(user: user);
  }

  Future<void> logout() async {
    await Storage.clearAuth();
    ApiClient.instance.clearTokens();
    state = const AuthState(hydrated: true, authenticated: false);
  }

  void _onForcedLogout() {
    Storage.clearAuth();
    state = const AuthState(hydrated: true, authenticated: false);
  }
}

final authProvider =
    NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
