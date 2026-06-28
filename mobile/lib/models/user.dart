/// Roles — espejo de UserRole en types/api.ts.
enum UserRole {
  admin,
  customer,
  deliveryDriver;

  String get api => switch (this) {
        UserRole.admin => 'admin',
        UserRole.customer => 'customer',
        UserRole.deliveryDriver => 'delivery_driver',
      };

  static UserRole fromApi(String? v) => switch (v) {
        'admin' => UserRole.admin,
        'delivery_driver' => UserRole.deliveryDriver,
        _ => UserRole.customer,
      };

  String get label => switch (this) {
        UserRole.admin => 'Administrador',
        UserRole.customer => 'Cliente',
        UserRole.deliveryDriver => 'Repartidor',
      };
}

enum MembershipLevel {
  bronce,
  plata,
  oro,
  platino;

  String get api => name.toUpperCase();

  static MembershipLevel fromApi(String? v) => switch (v) {
        'PLATA' => MembershipLevel.plata,
        'ORO' => MembershipLevel.oro,
        'PLATINO' => MembershipLevel.platino,
        _ => MembershipLevel.bronce,
      };

  String get label => switch (this) {
        MembershipLevel.bronce => 'Bronce',
        MembershipLevel.plata => 'Plata',
        MembershipLevel.oro => 'Oro',
        MembershipLevel.platino => 'Platino',
      };
}

class User {
  User({
    required this.id,
    required this.email,
    required this.fullName,
    this.phone,
    required this.role,
    required this.isActive,
    required this.points,
    required this.membershipLevel,
    this.createdAt,
  });

  final int id;
  final String email;
  final String fullName;
  final String? phone;
  final UserRole role;
  final bool isActive;
  final int points;
  final MembershipLevel membershipLevel;
  final DateTime? createdAt;

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: (j['id'] as num?)?.toInt() ?? 0,
        email: j['email'] as String? ?? '',
        fullName: j['full_name'] as String? ?? '',
        phone: j['phone'] as String?,
        role: UserRole.fromApi(j['role'] as String?),
        isActive: j['is_active'] as bool? ?? true,
        points: (j['points'] as num?)?.toInt() ?? 0,
        membershipLevel: MembershipLevel.fromApi(j['membership_level'] as String?),
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? ''),
      );
}

/// Respuesta de login/registro — espejo de TokenResponse.
class TokenResponse {
  TokenResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.userId,
    required this.role,
    required this.fullName,
  });

  final String accessToken;
  final String refreshToken;
  final int userId;
  final UserRole role;
  final String fullName;

  factory TokenResponse.fromJson(Map<String, dynamic> j) => TokenResponse(
        accessToken: j['access_token'] as String? ?? '',
        refreshToken: j['refresh_token'] as String? ?? '',
        userId: (j['user_id'] as num?)?.toInt() ?? 0,
        role: UserRole.fromApi(j['role'] as String?),
        fullName: j['full_name'] as String? ?? '',
      );
}
