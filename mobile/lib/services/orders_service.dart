import 'package:dio/dio.dart';

import '../core/api_client.dart';
import '../models/delivery.dart';
import '../models/order.dart';

class OrdersService {
  static final _dio = ApiClient.instance.dio;

  static Future<CalculateFeeResult> calculateFee({
    double? latitude,
    double? longitude,
    String? address,
  }) async {
    final res = await _dio.post('/orders/calculate-fee', data: {
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (address != null) 'address': address,
    });
    ensureOk(res);
    return CalculateFeeResult.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<Order> create({
    required List<Map<String, dynamic>> items,
    required String deliveryAddress,
    required String paymentMethod,
    String? notes,
    String? couponCode,
  }) async {
    final res = await _dio.post('/orders', data: {
      'items': items,
      'delivery_address': deliveryAddress,
      'payment_method': paymentMethod,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
      if (couponCode != null && couponCode.isNotEmpty) 'coupon_code': couponCode,
    });
    ensureOk(res);
    return Order.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<List<Order>> list({String? status, int limit = 50, int skip = 0}) async {
    final res = await _dio.get('/orders', queryParameters: {
      if (status != null && status.isNotEmpty) 'status': status,
      'skip': skip,
      'limit': limit,
    });
    ensureOk(res);
    final data = res.data is Map ? res.data as Map<String, dynamic> : const {};
    return (data['orders'] as List? ?? [])
        .map((e) => Order.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<Order> get(int id) async {
    final res = await _dio.get('/orders/$id');
    ensureOk(res);
    return Order.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<Order> updateStatus(int id, OrderStatus status) async {
    final res = await _dio.patch('/orders/$id/status', data: {'status': status.api});
    ensureOk(res);
    return Order.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<Order> cancel(int id) async {
    final res = await _dio.patch('/orders/$id/cancel');
    ensureOk(res);
    return Order.fromJson(res.data as Map<String, dynamic>);
  }

  /// Devuelve los bytes del PDF de la factura.
  static Future<List<int>> invoicePdf(int id) async {
    final res = await _dio.get<List<int>>(
      '/orders/$id/invoice',
      options: Options(responseType: ResponseType.bytes),
    );
    if ((res.statusCode ?? 0) >= 300) {
      throw ApiException('No se pudo generar la factura', res.statusCode ?? 0);
    }
    return res.data ?? const [];
  }
}
