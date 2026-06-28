import '../core/format.dart';
import '../models/order.dart';

/// Espejo del dict devuelto por GET /orders/{id}/tracking.
class OrderTracking {
  OrderTracking({
    required this.orderId,
    required this.orderNumber,
    required this.status,
    this.driverId,
    this.driverName,
    this.driverPhone,
    this.driverLatitude,
    this.driverLongitude,
    this.driverZone,
    this.driverVehicleType,
    this.driverUpdatedAt,
    required this.deliveryAddress,
    required this.isActive,
  });

  final int orderId;
  final String orderNumber;
  final OrderStatus status;
  final int? driverId;
  final String? driverName;
  final String? driverPhone;
  final double? driverLatitude;
  final double? driverLongitude;
  final String? driverZone;
  final String? driverVehicleType;
  final DateTime? driverUpdatedAt;
  final String deliveryAddress;
  final bool isActive;

  bool get hasDriverLocation =>
      driverLatitude != null && driverLongitude != null;

  factory OrderTracking.fromJson(Map<String, dynamic> j) => OrderTracking(
        orderId: (j['order_id'] as num).toInt(),
        orderNumber: j['order_number'] as String? ?? '',
        status: OrderStatus.fromApi(j['status'] as String?),
        driverId: (j['driver_id'] as num?)?.toInt(),
        driverName: j['driver_name'] as String?,
        driverPhone: j['driver_phone'] as String?,
        driverLatitude: (j['driver_latitude'] as num?)?.toDouble(),
        driverLongitude: (j['driver_longitude'] as num?)?.toDouble(),
        driverZone: j['driver_zone'] as String?,
        driverVehicleType: j['driver_vehicle_type'] as String?,
        driverUpdatedAt: Fmt.parseUtc(j['driver_updated_at'] as String?),
        deliveryAddress: j['delivery_address'] as String? ?? '',
        isActive: j['is_active'] as bool? ?? false,
      );
}
