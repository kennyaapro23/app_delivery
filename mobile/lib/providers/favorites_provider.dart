import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/storage.dart';
import '../models/product.dart';

/// Favoritos persistentes (local) — espejo de store/favorites.ts.
class FavoritesNotifier extends Notifier<List<Product>> {
  static const _key = 'chikenhot-favorites';

  @override
  List<Product> build() {
    _load();
    return const [];
  }

  Future<void> _load() async {
    final raw = await Storage.getString(_key);
    if (raw == null) return;
    try {
      final stored = (jsonDecode(raw) as List)
          .map((e) => Product.fromJson(e as Map<String, dynamic>))
          .toList();
      // Si el usuario ya agregó favoritos antes de terminar la carga, fusiona
      // (unión por id) en vez de pisar el estado y perder lo recién agregado.
      if (state.isEmpty) {
        state = stored;
        return;
      }
      final ids = state.map((p) => p.id).toSet();
      final merged = [
        ...state,
        for (final p in stored)
          if (ids.add(p.id)) p,
      ];
      state = merged;
      _persist();
    } catch (_) {}
  }

  void _persist() {
    Storage.setString(_key, jsonEncode(state.map((e) => e.toJson()).toList()));
  }

  bool isFavorite(int productId) => state.any((p) => p.id == productId);

  void toggle(Product product) {
    if (isFavorite(product.id)) {
      remove(product.id);
    } else {
      state = [...state, product];
      _persist();
    }
  }

  void remove(int productId) {
    state = state.where((p) => p.id != productId).toList();
    _persist();
  }

  void clear() {
    state = const [];
    _persist();
  }
}

final favoritesProvider =
    NotifierProvider<FavoritesNotifier, List<Product>>(FavoritesNotifier.new);
