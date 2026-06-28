import '../core/format.dart';

class Coupon {
  Coupon({
    required this.id,
    required this.code,
    this.description,
    this.discountPercent,
    this.discountAmount,
    required this.minOrderAmount,
    required this.maxUses,
    required this.currentUses,
    required this.isActive,
    this.expiresAt,
    this.createdAt,
  });

  final int id;
  final String code;
  final String? description;
  final double? discountPercent;
  final double? discountAmount;
  final double minOrderAmount;
  final int maxUses;
  final int currentUses;
  final bool isActive;
  final DateTime? expiresAt;
  final DateTime? createdAt;

  factory Coupon.fromJson(Map<String, dynamic> j) => Coupon(
        id: (j['id'] as num).toInt(),
        code: j['code'] as String? ?? '',
        description: j['description'] as String?,
        discountPercent: (j['discount_percent'] as num?)?.toDouble(),
        discountAmount: (j['discount_amount'] as num?)?.toDouble(),
        minOrderAmount: (j['min_order_amount'] as num?)?.toDouble() ?? 0,
        maxUses: (j['max_uses'] as num?)?.toInt() ?? 1,
        currentUses: (j['current_uses'] as num?)?.toInt() ?? 0,
        isActive: j['is_active'] as bool? ?? true,
        expiresAt: Fmt.parseUtc(j['expires_at'] as String?),
        createdAt: Fmt.parseUtc(j['created_at'] as String?),
      );
}

/// Respuesta de POST /coupons/apply (siempre HTTP 200).
class CouponApplyResult {
  CouponApplyResult({
    required this.valid,
    required this.discount,
    required this.message,
  });

  final bool valid;
  final double discount;
  final String message;

  factory CouponApplyResult.fromJson(Map<String, dynamic> j) => CouponApplyResult(
        valid: j['valid'] as bool? ?? false,
        discount: (j['discount'] as num?)?.toDouble() ?? 0,
        message: j['message'] as String? ?? '',
      );
}
