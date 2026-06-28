import '../core/format.dart';

class Review {
  Review({
    required this.id,
    required this.orderId,
    required this.customerId,
    this.driverId,
    required this.rating,
    this.comment,
    this.createdAt,
    this.customerName,
  });

  final int id;
  final int orderId;
  final int customerId;
  final int? driverId;
  final double rating;
  final String? comment;
  final DateTime? createdAt;
  final String? customerName;

  factory Review.fromJson(Map<String, dynamic> j) => Review(
        id: (j['id'] as num).toInt(),
        orderId: (j['order_id'] as num?)?.toInt() ?? 0,
        customerId: (j['customer_id'] as num?)?.toInt() ?? 0,
        driverId: (j['driver_id'] as num?)?.toInt(),
        rating: (j['rating'] as num?)?.toDouble() ?? 0,
        comment: j['comment'] as String?,
        createdAt: Fmt.parseUtc(j['created_at'] as String?),
        customerName: j['customer_name'] as String?,
      );
}
