import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/product.dart';
import 'package:chikenhot/providers/cart_provider.dart';
import 'package:chikenhot/providers/favorites_provider.dart';
import 'package:chikenhot/services/products_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// Detalle de producto — espejo de frontend ProductDetailPage.tsx.
/// Carga el producto, permite elegir cantidad, alternar favorito y añadir al
/// carrito (navega a /cart). Maneja estados de carga / error / no encontrado.
class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final int productId;

  @override
  ConsumerState<ProductDetailScreen> createState() =>
      _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  Product? _product;
  int _quantity = 1;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final product = await ProductsService.product(widget.productId);
      if (!mounted) return;
      setState(() {
        _product = product;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = getErrorMessage(e);
        _loading = false;
      });
    }
  }

  void _handleAdd() {
    final product = _product;
    if (product == null) return;
    // Revalida disponibilidad sobre el snapshot actual: si el producto dejó de
    // estar disponible mientras la pantalla estaba abierta, evita añadir un item
    // que el backend rechazaría al crear el pedido.
    if (!product.isAvailable) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(content: Text('${product.name} ya no está disponible')),
        );
      return;
    }
    ref.read(cartProvider.notifier).add(product, _quantity);
    context.push('/cart');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
        ),
        title: const Text('Volver al menú'),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView(message: 'Cargando producto…');
    }

    final product = _product;
    if (_error != null || product == null) {
      return ErrorView(
        message: _error ?? 'Producto no encontrado',
        onRetry: _load,
      );
    }

    final isFavorite = ref.watch(
      favoritesProvider.select((favs) => favs.any((p) => p.id == product.id)),
    );

    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _ProductImage(product: product),
            const SizedBox(height: 16),
            SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (product.category != null)
                        Expanded(child: _CategoryBadge(category: product.category!))
                      else
                        const Spacer(),
                      IconButton(
                        onPressed: () => ref
                            .read(favoritesProvider.notifier)
                            .toggle(product),
                        tooltip: isFavorite
                            ? 'Quitar de favoritos'
                            : 'Añadir a favoritos',
                        icon: Icon(
                          isFavorite ? Icons.favorite : Icons.favorite_border,
                          color: isFavorite ? BrandColors.c600 : Neutral.n400,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    product.name,
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: Neutral.n900,
                    ),
                  ),
                  if (product.description != null &&
                      product.description!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      product.description!,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.4,
                        color: Neutral.n600,
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Text(
                    Fmt.money(product.price),
                    style: const TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      color: BrandColors.c600,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      const Text(
                        'Cantidad:',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Neutral.n700,
                        ),
                      ),
                      const SizedBox(width: 12),
                      QtyStepper(
                        value: _quantity,
                        min: 1,
                        onChanged: (q) => setState(() => _quantity = q),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: product.isAvailable ? _handleAdd : null,
                child: Text(
                  product.isAvailable
                      ? 'Añadir al carrito · '
                          '${Fmt.money(product.price * _quantity)}'
                      : 'No disponible',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Imagen grande del producto (foto o emoji sobre degradado de marca).
class _ProductImage extends StatelessWidget {
  const _ProductImage({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final hasImage = product.imageUrl != null && product.imageUrl!.isNotEmpty;
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Container(
        height: 260,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [BrandColors.c50, BrandColors.c100],
          ),
        ),
        alignment: Alignment.center,
        child: hasImage
            ? CachedNetworkImage(
                imageUrl: product.imageUrl!,
                fit: BoxFit.cover,
                width: double.infinity,
                height: double.infinity,
                placeholder: (_, __) =>
                    const Center(child: CircularProgressIndicator()),
                errorWidget: (_, __, ___) =>
                    Text(product.icon, style: const TextStyle(fontSize: 96)),
              )
            : Text(product.icon, style: const TextStyle(fontSize: 96)),
      ),
    );
  }
}

/// Etiqueta de categoría (icono + nombre).
class _CategoryBadge extends StatelessWidget {
  const _CategoryBadge({required this.category});

  final Category category;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: BrandColors.c50,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          '${category.icon} ${category.name}',
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: BrandColors.c700,
          ),
        ),
      ),
    );
  }
}
