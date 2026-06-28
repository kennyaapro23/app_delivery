import '../core/api_client.dart';
import '../models/review.dart';

class ReviewsService {
  static final _dio = ApiClient.instance.dio;

  static Future<Review> create({
    required int orderId,
    required double rating,
    String? comment,
  }) async {
    final res = await _dio.post('/reviews', data: {
      'order_id': orderId,
      'rating': rating,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
    });
    ensureOk(res);
    return Review.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<List<Review>> mine() async {
    final res = await _dio.get('/reviews/my');
    ensureOk(res);
    return (res.data as List? ?? [])
        .map((e) => Review.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<List<Review>> forDriver(int driverId) async {
    final res = await _dio.get('/reviews/driver/$driverId');
    ensureOk(res);
    return (res.data as List? ?? [])
        .map((e) => Review.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
