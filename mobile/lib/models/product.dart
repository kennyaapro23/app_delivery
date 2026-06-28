class Category {
  Category({
    required this.id,
    required this.name,
    this.description,
    required this.icon,
    required this.isActive,
    required this.displayOrder,
  });

  final int id;
  final String name;
  final String? description;
  final String icon;
  final bool isActive;
  final int displayOrder;

  factory Category.fromJson(Map<String, dynamic> j) => Category(
        id: j['id'] as int,
        name: j['name'] as String? ?? '',
        description: j['description'] as String?,
        icon: j['icon'] as String? ?? '🍽️',
        isActive: j['is_active'] as bool? ?? true,
        displayOrder: (j['display_order'] as num?)?.toInt() ?? 0,
      );
}

class Product {
  Product({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    required this.categoryId,
    required this.icon,
    this.imageUrl,
    required this.isFeatured,
    required this.isAvailable,
    this.createdAt,
    this.category,
  });

  final int id;
  final String name;
  final String? description;
  final double price;
  final int categoryId;
  final String icon;
  final String? imageUrl;
  final bool isFeatured;
  final bool isAvailable;
  final DateTime? createdAt;
  final Category? category;

  factory Product.fromJson(Map<String, dynamic> j) => Product(
        id: j['id'] as int,
        name: j['name'] as String? ?? '',
        description: j['description'] as String?,
        price: (j['price'] as num?)?.toDouble() ?? 0,
        categoryId: (j['category_id'] as num?)?.toInt() ?? 0,
        icon: j['icon'] as String? ?? '🍗',
        imageUrl: j['image_url'] as String?,
        isFeatured: j['is_featured'] as bool? ?? false,
        isAvailable: j['is_available'] as bool? ?? true,
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? ''),
        category: j['category'] is Map<String, dynamic>
            ? Category.fromJson(j['category'] as Map<String, dynamic>)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'price': price,
        'category_id': categoryId,
        'icon': icon,
        'image_url': imageUrl,
        'is_featured': isFeatured,
        'is_available': isAvailable,
      };
}
