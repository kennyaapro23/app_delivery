import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/storage.dart';
import '../models/cart.dart';
import '../models/product.dart';

/// Carrito persistente — espejo de frontend/src/store/cart.ts.
class CartNotifier extends Notifier<List<CartItem>> {
  static const _key = 'chikenhot-cart';

  @override
  List<CartItem> build() {
    _load();
    return const [];
  }

  Future<void> _load() async {
    final raw = await Storage.getString(_key);
    if (raw == null) return;
    try {
      final stored = (jsonDecode(raw) as List)
          .map((e) => CartItem.fromJson(e as Map<String, dynamic>))
          .toList();
      // Fusiona lo guardado con lo que el usuario haya agregado antes de que
      // terminara la carga, evitando pisar items recién añadidos (race).
      // Si no hubo mutaciones (estado vacío) el merge equivale a cargar tal cual.
      if (state.isEmpty) {
        state = stored;
        return;
      }
      final merged = <CartItem>[...state];
      for (final s in stored) {
        final idx = merged.indexWhere((i) => i.product.id == s.product.id);
        if (idx >= 0) {
          merged[idx] =
              merged[idx].copyWith(quantity: merged[idx].quantity + s.quantity);
        } else {
          merged.add(s);
        }
      }
      state = merged;
      // Hubo items agregados durante la carga: persiste el carrito fusionado
      // para que el snapshot en disco quede consistente.
      _persist();
    } catch (_) {}
  }

  void _persist() {
    Storage.setString(_key, jsonEncode(state.map((e) => e.toJson()).toList()));
  }

  void add(Product product, [int quantity = 1]) {
    final existing = state.indexWhere((i) => i.product.id == product.id);
    if (existing >= 0) {
      state = [
        for (final i in state)
          i.product.id == product.id
              ? i.copyWith(quantity: i.quantity + quantity)
              : i,
      ];
    } else {
      state = [...state, CartItem(product: product, quantity: quantity)];
    }
    _persist();
  }

  void remove(int productId) {
    state = state.where((i) => i.product.id != productId).toList();
    _persist();
  }

  void updateQuantity(int productId, int quantity) {
    if (quantity <= 0) {
      remove(productId);
      return;
    }
    state = [
      for (final i in state)
        i.product.id == productId ? i.copyWith(quantity: quantity) : i,
    ];
    _persist();
  }

  /// Refresca el snapshot de producto (precio/disponibilidad) sin tocar cantidad.
  void replaceProducts(List<Product> fresh) {
    final byId = {for (final p in fresh) p.id: p};
    state = [
      for (final i in state)
        byId[i.product.id] != null ? i.copyWith(product: byId[i.product.id]) : i,
    ];
    _persist();
  }

  void clear() {
    state = const [];
    _persist();
  }
}

final cartProvider =
    NotifierProvider<CartNotifier, List<CartItem>>(CartNotifier.new);

final cartSubtotalProvider = Provider<double>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0.0, (acc, i) => acc + i.product.price * i.quantity);
});

final cartCountProvider = Provider<int>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0, (acc, i) => acc + i.quantity);
});
