import '../core/api_client.dart';
import '../models/product.dart';

class ProductsService {
  static final _dio = ApiClient.instance.dio;

  static Future<List<Category>> categories({bool includeInactive = false}) async {
    final res = await _dio.get('/products/categories',
        queryParameters: {'include_inactive': includeInactive});
    ensureOk(res);
    return (res.data as List? ?? [])
        .map((e) => Category.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<List<Product>> products({
    int? categoryId,
    String? search,
    bool featured = false,
    bool includeInactive = false,
    int limit = 100,
    int skip = 0,
  }) async {
    final res = await _dio.get('/products', queryParameters: {
      'skip': skip,
      'limit': limit,
      if (categoryId != null) 'category_id': categoryId,
      if (search != null && search.isNotEmpty) 'search': search,
      if (featured) 'featured': true,
      if (includeInactive) 'include_inactive': true,
    });
    ensureOk(res);
    final data = res.data is Map ? res.data as Map<String, dynamic> : const {};
    return (data['products'] as List? ?? [])
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<Product> product(int id) async {
    final res = await _dio.get('/products/$id');
    ensureOk(res);
    return Product.fromJson(res.data as Map<String, dynamic>);
  }

  // ── Admin ──────────────────────────────────────────────────
  static Future<Product> create(Map<String, dynamic> payload) async {
    final res = await _dio.post('/products', data: payload);
    ensureOk(res);
    return Product.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<Product> update(int id, Map<String, dynamic> payload) async {
    final res = await _dio.put('/products/$id', data: payload);
    ensureOk(res);
    return Product.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<void> delete(int id) async {
    final res = await _dio.delete('/products/$id');
    ensureOk(res);
  }

  static Future<Category> createCategory(Map<String, dynamic> payload) async {
    final res = await _dio.post('/products/categories', data: payload);
    ensureOk(res);
    return Category.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<Category> updateCategory(int id, Map<String, dynamic> payload) async {
    final res = await _dio.put('/products/categories/$id', data: payload);
    ensureOk(res);
    return Category.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<void> deleteCategory(int id) async {
    final res = await _dio.delete('/products/categories/$id');
    ensureOk(res);
  }
}
