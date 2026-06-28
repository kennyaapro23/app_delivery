import 'package:flutter/material.dart';

import '../core/format.dart';
import '../core/theme.dart';

enum OrderStatus {
  pending,
  accepted,
  preparing,
  ready,
  onTheWay,
  delivered,
  canceled;

  String get api => switch (this) {
        OrderStatus.onTheWay => 'on_the_way',
        _ => name,
      };

  static OrderStatus fromApi(String? v) => switch (v) {
        'accepted' => OrderStatus.accepted,
        'preparing' => OrderStatus.preparing,
        'ready' => OrderStatus.ready,
        'on_the_way' => OrderStatus.onTheWay,
        'delivered' => OrderStatus.delivered,
        'canceled' => OrderStatus.canceled,
        _ => OrderStatus.pending,
      };

  String get label => switch (this) {
        OrderStatus.pending => 'Pendiente',
        OrderStatus.accepted => 'Aceptado',
        OrderStatus.preparing => 'En Preparación',
        OrderStatus.ready => 'Listo para Entrega',
        OrderStatus.onTheWay => 'En Ruta',
        OrderStatus.delivered => 'Entregado',
        OrderStatus.canceled => 'Cancelado',
      };

  Color get color => switch (this) {
        OrderStatus.pending => const Color(0xFFB45309),
        OrderStatus.accepted => const Color(0xFF1D4ED8),
        OrderStatus.preparing => const Color(0xFF7C3AED),
        OrderStatus.ready => const Color(0xFF0891B2),
        OrderStatus.onTheWay => const Color(0xFF15803D),
        OrderStatus.delivered => Neutral.n600,
        OrderStatus.canceled => const Color(0xFFB91C1C),
      };

  Color get bg => switch (this) {
        OrderStatus.pending => const Color(0xFFFEF3C7),
        OrderStatus.accepted => const Color(0xFFDBEAFE),
        OrderStatus.preparing => const Color(0xFFEDE9FE),
        OrderStatus.ready => const Color(0xFFCFFAFE),
        OrderStatus.onTheWay => const Color(0xFFDCFCE7),
        OrderStatus.delivered => Neutral.n100,
        OrderStatus.canceled => const Color(0xFFFEE2E2),
      };

  IconData get icon => switch (this) {
        OrderStatus.pending => Icons.schedule,
        OrderStatus.accepted => Icons.check_circle_outline,
        OrderStatus.preparing => Icons.restaurant,
        OrderStatus.ready => Icons.shopping_bag_outlined,
        OrderStatus.onTheWay => Icons.delivery_dining,
        OrderStatus.delivered => Icons.done_all,
        OrderStatus.canceled => Icons.cancel_outlined,
      };

  bool get isActive =>
      this != OrderStatus.delivered && this != OrderStatus.canceled;
}

enum PaymentMethod {
  efectivo,
  yape,
  tarjeta;

  String get api => name;

  static PaymentMethod fromApi(String? v) => switch (v) {
        'yape' => PaymentMethod.yape,
        'tarjeta' => PaymentMethod.tarjeta,
        _ => PaymentMethod.efectivo,
      };

  String get label => switch (this) {
        PaymentMethod.efectivo => 'Efectivo',
        PaymentMethod.yape => 'Yape',
        PaymentMethod.tarjeta => 'Tarjeta',
      };

  IconData get icon => switch (this) {
        PaymentMethod.efectivo => Icons.payments_outlined,
        PaymentMethod.yape => Icons.phone_android,
        PaymentMethod.tarjeta => Icons.credit_card,
      };
}

class OrderItem {
  OrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
  });

  final int id;
  final int productId;
  final String productName;
  final int quantity;
  final double unitPrice;
  final double subtotal;

  factory OrderItem.fromJson(Map<String, dynamic> j) => OrderItem(
        id: (j['id'] as num?)?.toInt() ?? 0,
        productId: (j['product_id'] as num?)?.toInt() ?? 0,
        productName: j['product_name'] as String? ?? '',
        quantity: (j['quantity'] as num?)?.toInt() ?? 0,
        unitPrice: (j['unit_price'] as num?)?.toDouble() ?? 0,
        subtotal: (j['subtotal'] as num?)?.toDouble() ?? 0,
      );
}

class OrderTimelineEvent {
  OrderTimelineEvent({
    required this.id,
    required this.status,
    required this.title,
    this.description,
    this.timestamp,
  });

  final int id;
  final String status;
  final String title;
  final String? description;
  final DateTime? timestamp;

  factory OrderTimelineEvent.fromJson(Map<String, dynamic> j) =>
      OrderTimelineEvent(
        id: (j['id'] as num?)?.toInt() ?? 0,
        status: j['status'] as String? ?? '',
        title: j['title'] as String? ?? '',
        description: j['description'] as String?,
        timestamp: Fmt.parseUtc(j['timestamp'] as String?),
      );
}

class Order {
  Order({
    required this.id,
    required this.orderNumber,
    required this.customerId,
    this.deliveryDriverId,
    required this.status,
    required this.subtotal,
    required this.deliveryFee,
    required this.tax,
    required this.total,
    required this.paymentMethod,
    required this.deliveryAddress,
    this.notes,
    this.createdAt,
    this.updatedAt,
    required this.items,
    required this.timeline,
    this.customerName,
    this.customerPhone,
    this.driverName,
    this.driverPhone,
  });

  final int id;
  final String orderNumber;
  final int customerId;
  final int? deliveryDriverId;
  final OrderStatus status;
  final double subtotal;
  final double deliveryFee;
  final double tax;
  final double total;
  final PaymentMethod paymentMethod;
  final String deliveryAddress;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<OrderItem> items;
  final List<OrderTimelineEvent> timeline;
  final String? customerName;
  final String? customerPhone;
  final String? driverName;
  final String? driverPhone;

  factory Order.fromJson(Map<String, dynamic> j) => Order(
        id: (j['id'] as num).toInt(),
        orderNumber: j['order_number'] as String? ?? '',
        customerId: (j['customer_id'] as num?)?.toInt() ?? 0,
        deliveryDriverId: (j['delivery_driver_id'] as num?)?.toInt(),
        status: OrderStatus.fromApi(j['status'] as String?),
        subtotal: (j['subtotal'] as num?)?.toDouble() ?? 0,
        deliveryFee: (j['delivery_fee'] as num?)?.toDouble() ?? 0,
        tax: (j['tax'] as num?)?.toDouble() ?? 0,
        total: (j['total'] as num?)?.toDouble() ?? 0,
        paymentMethod: PaymentMethod.fromApi(j['payment_method'] as String?),
        deliveryAddress: j['delivery_address'] as String? ?? '',
        notes: j['notes'] as String?,
        createdAt: Fmt.parseUtc(j['created_at'] as String?),
        updatedAt: Fmt.parseUtc(j['updated_at'] as String?),
        items: (j['items'] as List<dynamic>? ?? [])
            .map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        timeline: (j['timeline'] as List<dynamic>? ?? [])
            .map((e) => OrderTimelineEvent.fromJson(e as Map<String, dynamic>))
            .toList(),
        customerName: j['customer_name'] as String?,
        customerPhone: j['customer_phone'] as String?,
        driverName: j['driver_name'] as String?,
        driverPhone: j['driver_phone'] as String?,
      );
}
