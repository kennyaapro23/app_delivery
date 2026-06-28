import '../core/format.dart';
import 'order.dart';

/// GET /delivery/earnings
class EarningsSummary {
  EarningsSummary({
    required this.today,
    required this.thisWeek,
    required this.thisMonth,
    required this.total,
    required this.deliveriesToday,
    required this.deliveriesTotal,
  });

  final double today;
  final double thisWeek;
  final double thisMonth;
  final double total;
  final int deliveriesToday;
  final int deliveriesTotal;

  factory EarningsSummary.fromJson(Map<String, dynamic> j) => EarningsSummary(
        today: (j['today'] as num?)?.toDouble() ?? 0,
        thisWeek: (j['this_week'] as num?)?.toDouble() ?? 0,
        thisMonth: (j['this_month'] as num?)?.toDouble() ?? 0,
        total: (j['total'] as num?)?.toDouble() ?? 0,
        deliveriesToday: (j['deliveries_today'] as num?)?.toInt() ?? 0,
        deliveriesTotal: (j['deliveries_total'] as num?)?.toInt() ?? 0,
      );
}

/// GET /delivery/stats y /dashboard/driver
class DriverStats {
  DriverStats({
    required this.deliveriesToday,
    required this.deliveriesCompleted,
    required this.earningsToday,
    required this.averageRating,
    required this.punctuality,
    required this.satisfaction,
    required this.efficiency,
  });

  final int deliveriesToday;
  final int deliveriesCompleted;
  final double earningsToday;
  final double averageRating;
  final double punctuality;
  final double satisfaction;
  final double efficiency;

  factory DriverStats.fromJson(Map<String, dynamic> j) => DriverStats(
        deliveriesToday: (j['deliveries_today'] as num?)?.toInt() ?? 0,
        deliveriesCompleted: (j['deliveries_completed'] as num?)?.toInt() ?? 0,
        earningsToday: (j['earnings_today'] as num?)?.toDouble() ?? 0,
        averageRating: (j['average_rating'] as num?)?.toDouble() ?? 0,
        punctuality: (j['punctuality'] as num?)?.toDouble() ?? 0,
        satisfaction: (j['satisfaction'] as num?)?.toDouble() ?? 0,
        efficiency: (j['efficiency'] as num?)?.toDouble() ?? 0,
      );
}

/// Item de GET /delivery/nearby-orders
class NearbyOrder {
  NearbyOrder({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.deliveryAddress,
    required this.total,
    required this.deliveryFee,
    required this.paymentMethod,
    this.createdAt,
  });

  final int id;
  final String orderNumber;
  final OrderStatus status;
  final String deliveryAddress;
  final double total;
  final double deliveryFee;
  final PaymentMethod paymentMethod;
  final DateTime? createdAt;

  factory NearbyOrder.fromJson(Map<String, dynamic> j) => NearbyOrder(
        id: (j['id'] as num).toInt(),
        orderNumber: j['order_number'] as String? ?? '',
        status: OrderStatus.fromApi(j['status'] as String?),
        deliveryAddress: j['delivery_address'] as String? ?? '',
        total: (j['total'] as num?)?.toDouble() ?? 0,
        deliveryFee: (j['delivery_fee'] as num?)?.toDouble() ?? 0,
        paymentMethod: PaymentMethod.fromApi(j['payment_method'] as String?),
        createdAt: Fmt.parseUtc(j['created_at'] as String?),
      );
}

/// POST /orders/calculate-fee
class CalculateFeeResult {
  CalculateFeeResult({
    required this.fee,
    this.distanceKm,
    required this.base,
    required this.perKm,
    required this.min,
    required this.max,
    this.rawFee,
    this.note,
  });

  final double fee;
  final double? distanceKm;
  final double base;
  final double perKm;
  final double min;
  final double max;
  final double? rawFee;
  final String? note;

  factory CalculateFeeResult.fromJson(Map<String, dynamic> j) => CalculateFeeResult(
        fee: (j['fee'] as num?)?.toDouble() ?? 5,
        distanceKm: (j['distance_km'] as num?)?.toDouble(),
        base: (j['base'] as num?)?.toDouble() ?? 3,
        perKm: (j['per_km'] as num?)?.toDouble() ?? 1.5,
        min: (j['min'] as num?)?.toDouble() ?? 5,
        max: (j['max'] as num?)?.toDouble() ?? 25,
        rawFee: (j['raw_fee'] as num?)?.toDouble(),
        note: j['note'] as String?,
      );
}

/// GET /delivery/drivers (admin) — perfil completo del repartidor.
class DriverProfile {
  DriverProfile(this.raw);
  final Map<String, dynamic> raw;

  T? _get<T>(String k) => raw[k] as T?;

  int get id => (raw['id'] as num?)?.toInt() ?? 0;
  int get userId => (raw['user_id'] as num?)?.toInt() ?? 0;
  String? get fullName => _get<String>('full_name');
  String? get email => _get<String>('email');
  String? get phone => _get<String>('phone');
  String? get documentId => _get<String>('document_id');
  String? get birthDate => _get<String>('birth_date');
  String? get gender => _get<String>('gender');
  String? get homeAddress => _get<String>('home_address');
  String? get homeDistrict => _get<String>('home_district');
  String? get emergencyContactName => _get<String>('emergency_contact_name');
  String? get emergencyContactPhone => _get<String>('emergency_contact_phone');
  String? get emergencyContactRelation => _get<String>('emergency_contact_relation');
  String? get vehicleType => _get<String>('vehicle_type');
  String? get vehicleBrand => _get<String>('vehicle_brand');
  String? get vehicleModel => _get<String>('vehicle_model');
  int? get vehicleYear => (raw['vehicle_year'] as num?)?.toInt();
  String? get vehicleColor => _get<String>('vehicle_color');
  String? get vehiclePlate => _get<String>('vehicle_plate');
  String? get licenseNumber => _get<String>('license_number');
  String? get licenseExpiry => _get<String>('license_expiry');
  String? get insuranceNumber => _get<String>('insurance_number');
  String? get insuranceExpiry => _get<String>('insurance_expiry');
  String? get bankName => _get<String>('bank_name');
  String? get bankAccountType => _get<String>('bank_account_type');
  String? get bankAccount => _get<String>('bank_account');
  String? get bankCci => _get<String>('bank_cci');
  String? get bankAccountHolder => _get<String>('bank_account_holder');
  bool get isAvailable => raw['is_available'] as bool? ?? false;
  double? get latitude => (raw['latitude'] as num?)?.toDouble();
  double? get longitude => (raw['longitude'] as num?)?.toDouble();
  String? get currentZone => _get<String>('current_zone');
  int get totalDeliveries => (raw['total_deliveries'] as num?)?.toInt() ?? 0;
  double get averageRating => (raw['average_rating'] as num?)?.toDouble() ?? 0;
  double get totalEarnings => (raw['total_earnings'] as num?)?.toDouble() ?? 0;

  bool get hasLocation => latitude != null && longitude != null;

  String get vehicleEmoji => switch (vehicleType) {
        'moto' => '🏍️',
        'bicicleta' => '🚲',
        'auto' => '🚗',
        _ => '🛵',
      };

  factory DriverProfile.fromJson(Map<String, dynamic> j) => DriverProfile(j);
}
