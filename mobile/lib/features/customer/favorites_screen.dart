import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/theme.dart';
import '../../models/product.dart';
import '../../providers/cart_provider.dart';
import '../../providers/favorites_provider.dart';
import '../../widgets/common.dart';

/// Pantalla de favoritos del cliente — espejo de frontend/src/pages/FavoritesPage.tsx.
/// Lista local persistida vía [favoritesProvider]. Permite añadir al carrito y quitar.
class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(favoritesProvider);

    return Scaffold(
      backgroundColor: Neutral.n50,
      appBar: AppBar(
        title: Text('❤️ Mis favoritos (${items.length})'),
      ),
      body: items.isEmpty
          ? _EmptyFavorites(onBrowse: () => context.go('/'))
          : _FavoritesGrid(items: items),
    );
  }
}

/// Estado vacío — sin favoritos guardados.
class _EmptyFavorites extends StatelessWidget {
  const _EmptyFavorites({required this.onBrowse});
  final VoidCallback onBrowse;

  @override
  Widget build(BuildContext context) {
    return EmptyView(
      icon: Icons.favorite_border,
      message:
          'No tienes favoritos\nMarca productos con ❤️ para guardarlos aquí',
      action: ElevatedButton(
        onPressed: onBrowse,
        child: const Text('Ver menú'),
      ),
    );
  }
}

/// Grilla responsiva de tarjetas de producto favorito.
class _FavoritesGrid extends StatelessWidget {
  const _FavoritesGrid({required this.items});
  final List<Product> items;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final crossAxisCount = width >= 900
        ? 4
        : width >= 600
            ? 3
            : 2;

    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        mainAxisSpacing: 14,
        crossAxisSpacing: 14,
        childAspectRatio: 0.66,
      ),
      itemCount: items.length,
      itemBuilder: (context, i) => _FavoriteCard(product: items[i]),
    );
  }
}

/// Tarjeta de un producto favorito: imagen/emoji, nombre, descripción, precio y acciones.
class _FavoriteCard extends ConsumerWidget {
  const _FavoriteCard({required this.product});
  final Product product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Neutral.n200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Imagen o emoji (toca → detalle).
          InkWell(
            onTap: () => context.push('/products/${product.id}'),
            child: _ProductImage(product: product),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  InkWell(
                    onTap: () => context.push('/products/${product.id}'),
                    child: Text(
                      product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  if (product.description != null &&
                      product.description!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      product.description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Neutral.n500,
                        height: 1.3,
                      ),
                    ),
                  ],
                  const Spacer(),
                  Text(
                    Fmt.money(product.price),
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: BrandColors.c600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      // Añadir al carrito (+).
                      Expanded(
                        child: SizedBox(
                          height: 38,
                          child: ElevatedButton(
                            onPressed: () => _addToCart(context, ref),
                            style: ElevatedButton.styleFrom(
                              padding: EdgeInsets.zero,
                            ),
                            child: const Icon(Icons.add, size: 18),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Quitar de favoritos (papelera).
                      SizedBox(
                        height: 38,
                        width: 42,
                        child: OutlinedButton(
                          onPressed: () => _removeFavorite(context, ref),
                          style: OutlinedButton.styleFrom(
                            padding: EdgeInsets.zero,
                            foregroundColor: const Color(0xFFDC2626),
                            backgroundColor: const Color(0xFFFEF2F2),
                            side: const BorderSide(color: Color(0xFFFECACA)),
                          ),
                          child: const Icon(Icons.delete_outline, size: 18),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _addToCart(BuildContext context, WidgetRef ref) {
    ref.read(cartProvider.notifier).add(product);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text('${product.name} añadido al carrito')),
      );
  }

  void _removeFavorite(BuildContext context, WidgetRef ref) {
    ref.read(favoritesProvider.notifier).remove(product.id);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text('${product.name} quitado de favoritos')),
      );
  }
}

/// Cabecera de imagen del producto con degradado de marca y fallback a emoji.
class _ProductImage extends StatelessWidget {
  const _ProductImage({required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    final emoji = Center(
      child: Text(product.icon, style: const TextStyle(fontSize: 52)),
    );

    return Container(
      height: 120,
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [BrandColors.c50, BrandColors.c100],
        ),
      ),
      child: (product.imageUrl != null && product.imageUrl!.isNotEmpty)
          ? CachedNetworkImage(
              imageUrl: product.imageUrl!,
              fit: BoxFit.cover,
              width: double.infinity,
              height: 120,
              placeholder: (_, __) =>
                  const Center(child: CircularProgressIndicator(strokeWidth: 2)),
              errorWidget: (_, __, ___) => emoji,
            )
          : emoji,
    );
  }
}
