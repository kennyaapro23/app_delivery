/// GET/PATCH /store-config — configuración pública del restaurante.
class StoreConfig {
  StoreConfig({
    required this.id,
    required this.name,
    this.address,
    required this.latitude,
    required this.longitude,
    this.phone,
  });

  final int id;
  final String name;
  final String? address;
  final double latitude;
  final double longitude;
  final String? phone;

  factory StoreConfig.fromJson(Map<String, dynamic> j) => StoreConfig(
        id: (j['id'] as num?)?.toInt() ?? 0,
        name: (j['name'] as String?) ?? '',
        address: j['address'] as String?,
        latitude: (j['latitude'] as num?)?.toDouble() ?? 0,
        longitude: (j['longitude'] as num?)?.toDouble() ?? 0,
        phone: j['phone'] as String?,
      );
}
