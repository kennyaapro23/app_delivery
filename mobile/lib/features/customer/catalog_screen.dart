import 'dart:async';

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

/// CatalogPage `/` — espejo de frontend/src/pages/CatalogPage.tsx.
/// Banner hero, búsqueda en vivo (debounced), chips de categoría,
/// destacados y grilla de productos con favoritos y "Añadir".
class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key});

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  final _searchController = TextEditingController();

  List<Category> _categories = const [];
  List<Product> _products = const [];
  int? _activeCategory;
  String _search = '';

  bool _loading = true;
  String? _error;

  Timer? _debounce;
  int _loadSeq = 0;

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _loadProducts();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    try {
      final cats = await ProductsService.categories();
      if (!mounted) return;
      setState(() => _categories = cats);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = getErrorMessage(e));
    }
  }

  Future<void> _loadProducts() async {
    final seq = ++_loadSeq;
    setState(() => _loading = true);
    try {
      final data = await ProductsService.products(
        categoryId: _activeCategory,
        search: _search.trim().isEmpty ? null : _search.trim(),
        limit: 100,
      );
      if (!mounted || seq != _loadSeq) return;
      setState(() {
        _products = data;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted || seq != _loadSeq) return;
      setState(() {
        _error = getErrorMessage(e);
        _loading = false;
      });
    }
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      setState(() => _search = value);
      _loadProducts();
    });
  }

  void _selectCategory(int? id) {
    if (_activeCategory == id) return;
    setState(() => _activeCategory = id);
    _loadProducts();
  }

  List<Product> get _featured =>
      _products.where((p) => p.isFeatured).take(3).toList();

  @override
  Widget build(BuildContext context) {
    final showFeatured =
        _featured.isNotEmpty && _search.trim().isEmpty && _activeCategory == null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('🍗 Chikenhot'),
        actions: [
          IconButton(
            tooltip: 'Mis favoritos',
            onPressed: () => context.push('/favorites'),
            icon: const Icon(Icons.favorite_border),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([_loadCategories(), _loadProducts()]);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            const _HeroBanner(),
            const SizedBox(height: 20),
            _SearchBox(
              controller: _searchController,
              onChanged: _onSearchChanged,
            ),
            const SizedBox(height: 16),
            _CategoryChips(
              categories: _categories,
              activeCategory: _activeCategory,
              onSelect: _selectCategory,
            ),
            const SizedBox(height: 20),
            if (_error != null) ...[
              _ErrorBox(message: _error!),
              const SizedBox(height: 20),
            ],
            if (showFeatured) ...[
              const _SectionTitle('⭐ Destacados'),
              const SizedBox(height: 12),
              _ProductGrid(
                products: _featured,
                featured: true,
              ),
              const SizedBox(height: 28),
            ],
            const _SectionTitle('Menú'),
            const SizedBox(height: 12),
            _MenuSection(
              loading: _loading,
              products: _products,
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroBanner extends StatelessWidget {
  const _HeroBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [BrandColors.c500, BrandColors.c700],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '🍗 Pollo crocante a tu puerta',
            style: TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w800,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Pide en minutos. Recíbelo calientito. Gana puntos y sube de nivel.',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.92),
              fontSize: 14,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchBox extends StatelessWidget {
  const _SearchBox({required this.controller, required this.onChanged});

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      decoration: const InputDecoration(
        hintText: 'Buscar productos...',
        prefixIcon: Icon(Icons.search, color: Neutral.n400),
      ),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({
    required this.categories,
    required this.activeCategory,
    required this.onSelect,
  });

  final List<Category> categories;
  final int? activeCategory;
  final ValueChanged<int?> onSelect;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _CategoryChip(
            label: 'Todos',
            icon: '✨',
            active: activeCategory == null,
            onTap: () => onSelect(null),
          ),
          for (final c in categories) ...[
            const SizedBox(width: 8),
            _CategoryChip(
              label: c.name,
              icon: c.icon,
              active: activeCategory == c.id,
              onTap: () => onSelect(c.id),
            ),
          ],
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });

  final String label;
  final String icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? BrandColors.c500 : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: active ? BrandColors.c500 : Neutral.n200,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(icon, style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: active ? Colors.white : Neutral.n700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        message,
        style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13),
      ),
    );
  }
}

class _MenuSection extends StatelessWidget {
  const _MenuSection({required this.loading, required this.products});

  final bool loading;
  final List<Product> products;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: LoadingView(),
      );
    }
    if (products.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 32),
        child: EmptyView(
          message: 'No se encontraron productos',
          icon: Icons.fastfood_outlined,
        ),
      );
    }
    return _ProductGrid(products: products);
  }
}

class _ProductGrid extends StatelessWidget {
  const _ProductGrid({required this.products, this.featured = false});

  final List<Product> products;
  final bool featured;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.62,
      ),
      itemCount: products.length,
      itemBuilder: (context, i) =>
          _ProductCard(product: products[i], featured: featured),
    );
  }
}

class _ProductCard extends ConsumerWidget {
  const _ProductCard({required this.product, this.featured = false});

  final Product product;
  final bool featured;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favorites = ref.watch(favoritesProvider);
    final isFav = favorites.any((p) => p.id == product.id);

    void openDetail() => context.push('/products/${product.id}');

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: featured ? BrandColors.c200 : Neutral.n200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Imagen / emoji + corazón favorito.
          Stack(
            children: [
              GestureDetector(
                onTap: openDetail,
                child: SizedBox(
                  height: 120,
                  width: double.infinity,
                  child: _ProductImage(product: product),
                ),
              ),
              Positioned(
                right: 8,
                top: 8,
                child: Material(
                  color: Colors.white.withValues(alpha: 0.9),
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: () =>
                        ref.read(favoritesProvider.notifier).toggle(product),
                    child: Padding(
                      padding: const EdgeInsets.all(6),
                      child: Icon(
                        isFav ? Icons.favorite : Icons.favorite_border,
                        size: 18,
                        color: isFav ? const Color(0xFFEF4444) : Neutral.n400,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          // Detalle.
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GestureDetector(
                    onTap: openDetail,
                    child: Text(
                      product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        height: 1.1,
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
                        height: 1.25,
                      ),
                    ),
                  ],
                  const Spacer(),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          Fmt.money(product.price),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: BrandColors.c600,
                          ),
                        ),
                      ),
                      _AddButton(product: product),
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
}

class _ProductImage extends StatelessWidget {
  const _ProductImage({required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    final url = product.imageUrl;
    if (url != null && url.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: url,
        fit: BoxFit.cover,
        placeholder: (context, _) => const _EmojiBackground(),
        errorWidget: (context, _, __) => _EmojiBackground(emoji: product.icon),
      );
    }
    return _EmojiBackground(emoji: product.icon);
  }
}

class _EmojiBackground extends StatelessWidget {
  const _EmojiBackground({this.emoji});
  final String? emoji;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [BrandColors.c50, BrandColors.c100],
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        emoji ?? '🍗',
        style: const TextStyle(fontSize: 48),
      ),
    );
  }
}

class _AddButton extends ConsumerWidget {
  const _AddButton({required this.product});
  final Product product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final available = product.isAvailable;
    return SizedBox(
      height: 32,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
        // No permitir añadir un producto no disponible: el backend lo rechaza
        // al crear el pedido (consistente con product_detail_screen).
        onPressed: available
            ? () {
                ref.read(cartProvider.notifier).add(product);
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(
                    SnackBar(
                      content: Text('${product.name} añadido al carrito'),
                      duration: const Duration(seconds: 2),
                    ),
                  );
              }
            : null,
        child: available
            ? const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.add, size: 16),
                  SizedBox(width: 2),
                  Text('Añadir'),
                ],
              )
            : const Text('No disponible'),
      ),
    );
  }
}
