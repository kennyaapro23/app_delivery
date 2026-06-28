import '../core/api_client.dart';
import '../models/dashboard.dart';
import '../models/user.dart';

class UsersListResult {
  UsersListResult(this.users, this.total);
  final List<User> users;
  final int total;
}

class UsersService {
  static final _dio = ApiClient.instance.dio;

  static Future<UsersListResult> list({
    String? role,
    String? search,
    int limit = 100,
    int skip = 0,
  }) async {
    final res = await _dio.get('/users', queryParameters: {
      'skip': skip,
      'limit': limit,
      if (role != null && role.isNotEmpty) 'role': role,
      if (search != null && search.isNotEmpty) 'search': search,
    });
    ensureOk(res);
    final data = res.data is Map ? res.data as Map<String, dynamic> : const {};
    final users = (data['users'] as List? ?? [])
        .map((e) => User.fromJson(e as Map<String, dynamic>))
        .toList();
    return UsersListResult(users, (data['total'] as num?)?.toInt() ?? users.length);
  }

  static Future<UserStats> stats() async {
    final res = await _dio.get('/users/stats');
    ensureOk(res);
    return UserStats.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<User> update(int id, Map<String, dynamic> payload) async {
    final res = await _dio.put('/users/$id', data: payload);
    ensureOk(res);
    return User.fromJson(res.data as Map<String, dynamic>);
  }
}
