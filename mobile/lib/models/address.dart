import '../core/format.dart';

class Address {
  Address({
    required this.id,
    required this.userId,
    required this.label,
    required this.fullAddress,
    this.reference,
    this.district,
    this.city,
    this.latitude,
    this.longitude,
    required this.isDefault,
    this.createdAt,
  });

  final int id;
  final int userId;
  final String label;
  final String fullAddress;
  final String? reference;
  final String? district;
  final String? city;
  final double? latitude;
  final double? longitude;
  final bool isDefault;
  final DateTime? createdAt;

  bool get hasCoords => latitude != null && longitude != null;

  factory Address.fromJson(Map<String, dynamic> j) => Address(
        id: (j['id'] as num).toInt(),
        userId: (j['user_id'] as num?)?.toInt() ?? 0,
        label: j['label'] as String? ?? 'Casa',
        fullAddress: j['full_address'] as String? ?? '',
        reference: j['reference'] as String?,
        district: j['district'] as String?,
        city: j['city'] as String?,
        latitude: (j['latitude'] as num?)?.toDouble(),
        longitude: (j['longitude'] as num?)?.toDouble(),
        isDefault: j['is_default'] as bool? ?? false,
        createdAt: Fmt.parseUtc(j['created_at'] as String?),
      );
}
