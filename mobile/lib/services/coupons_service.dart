import '../core/api_client.dart';
import '../models/coupon.dart';

class CouponsService {
  static final _dio = ApiClient.instance.dio;

  static Future<List<Coupon>> list() async {
    final res = await _dio.get('/coupons');
    ensureOk(res);
    return (res.data as List? ?? [])
        .map((e) => Coupon.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<Coupon> create(Map<String, dynamic> payload) async {
    final res = await _dio.post('/coupons', data: payload);
    ensureOk(res);
    return Coupon.fromJson(res.data as Map<String, dynamic>);
  }

  /// POST /coupons/apply — siempre HTTP 200; la validez va en el body.
  static Future<CouponApplyResult> apply(String code, double orderSubtotal) async {
    final res = await _dio.post('/coupons/apply', data: {
      'code': code,
      'order_subtotal': orderSubtotal,
    });
    ensureOk(res);
    return CouponApplyResult.fromJson(res.data as Map<String, dynamic>);
  }
}
