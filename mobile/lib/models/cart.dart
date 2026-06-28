import 'product.dart';

class CartItem {
  CartItem({required this.product, required this.quantity});

  final Product product;
  final int quantity;

  double get lineTotal => product.price * quantity;

  CartItem copyWith({Product? product, int? quantity}) =>
      CartItem(product: product ?? this.product, quantity: quantity ?? this.quantity);

  Map<String, dynamic> toJson() => {
        'product': product.toJson(),
        'quantity': quantity,
      };

  factory CartItem.fromJson(Map<String, dynamic> j) => CartItem(
        product: Product.fromJson(j['product'] as Map<String, dynamic>),
        quantity: (j['quantity'] as num?)?.toInt() ?? 1,
      );
}
