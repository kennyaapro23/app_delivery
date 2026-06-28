import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/product.dart';
import 'package:chikenhot/services/products_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// Pantalla de administración de Catálogo (productos + categorías).
///
/// Se renderiza dentro de [AdminShell] (el shell aporta AppBar + drawer), por lo
/// que aquí sólo construimos el cuerpo: dos pestañas (Productos / Categorías)
/// con CRUD vía modales, toggle de disponibilidad en línea y borrado de
/// categorías con confirmación. Espejo de `AdminProductsPage.tsx`.
class AdminProductsScreen extends ConsumerStatefulWidget {
  const AdminProductsScreen({super.key});

  @override
  ConsumerState<AdminProductsScreen> createState() => _AdminProductsScreenState();
}

class _AdminProductsScreenState extends ConsumerState<AdminProductsScreen> {
  bool _loading = true;
  String? _error;
  List<Product> _products = const [];
  List<Category> _categories = const [];

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
      final results = await Future.wait([
        ProductsService.products(includeInactive: true, limit: 500),
        ProductsService.categories(includeInactive: true),
      ]);
      if (!mounted) return;
      setState(() {
        _products = results[0] as List<Product>;
        _categories = results[1] as List<Category>;
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

  String? _categoryName(int id) {
    for (final c in _categories) {
      if (c.id == id) return c.name;
    }
    return null;
  }

  int _productCount(int categoryId) =>
      _products.where((p) => p.categoryId == categoryId).length;

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  // ── Productos ───────────────────────────────────────────────────────────
  Future<void> _openProductForm({Product? product}) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProductForm(
        product: product,
        categories: _categories,
      ),
    );
    if (saved == true) await _load();
  }

  Future<void> _toggleProduct(Product p) async {
    try {
      await ProductsService.update(p.id, {'is_available': !p.isAvailable});
      await _load();
      _snack(p.isAvailable ? 'Producto desactivado' : 'Producto activado');
    } catch (e) {
      _snack(getErrorMessage(e));
    }
  }

  // ── Categorías ──────────────────────────────────────────────────────────
  Future<void> _openCategoryForm({Category? category}) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CategoryForm(
        category: category,
        defaultOrder: _categories.length + 1,
      ),
    );
    if (saved == true) await _load();
  }

  Future<void> _deleteCategory(Category c) async {
    final count = _productCount(c.id);
    final msg = count > 0
        ? '¿Desactivar "${c.name}"? Esto también desactivará $count producto(s).'
        : '¿Desactivar "${c.name}"?';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Desactivar categoría'),
        content: Text(msg),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Desactivar'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ProductsService.deleteCategory(c.id);
      await _load();
      _snack('Categoría desactivada');
    } catch (e) {
      _snack(getErrorMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Container(
            color: Colors.white,
            child: TabBar(
              labelColor: BrandColors.c600,
              unselectedLabelColor: Neutral.n500,
              indicatorColor: BrandColors.c500,
              indicatorWeight: 3,
              labelStyle: const TextStyle(fontWeight: FontWeight.w700),
              tabs: [
                Tab(
                  icon: const Icon(Icons.fastfood_outlined, size: 20),
                  text: 'Productos (${_products.length})',
                ),
                Tab(
                  icon: const Icon(Icons.layers_outlined, size: 20),
                  text: 'Categorías (${_categories.length})',
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: TabBarView(
              children: [
                _buildProductsTab(),
                _buildCategoriesTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Tab: Productos ──────────────────────────────────────────────────────
  Widget _buildProductsTab() {
    if (_loading) return const LoadingView(message: 'Cargando catálogo...');
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    final fab = Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Row(
        children: [
          const Spacer(),
          ElevatedButton.icon(
            onPressed: () => _openProductForm(),
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Nuevo producto'),
          ),
        ],
      ),
    );

    if (_products.isEmpty) {
      return Column(
        children: [
          fab,
          const Expanded(
            child: EmptyView(
              message: 'No hay productos. Crea el primero.',
              icon: Icons.fastfood_outlined,
            ),
          ),
        ],
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        itemCount: _products.length + 1,
        separatorBuilder: (_, i) => SizedBox(height: i == 0 ? 16 : 10),
        itemBuilder: (context, index) {
          if (index == 0) {
            return Row(
              children: [
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: () => _openProductForm(),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Nuevo producto'),
                ),
              ],
            );
          }
          final p = _products[index - 1];
          return _productCard(p);
        },
      ),
    );
  }

  Widget _productCard(Product p) {
    return Opacity(
      opacity: p.isAvailable ? 1 : 0.6,
      child: SectionCard(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(p.icon, style: const TextStyle(fontSize: 30)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          p.name,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                        ),
                      ),
                      if (p.isFeatured) ...[
                        const SizedBox(width: 8),
                        _pill('⭐ Destacado', const Color(0xFFFEF3C7), const Color(0xFF92400E)),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _categoryName(p.categoryId) ?? '—',
                    style: const TextStyle(fontSize: 12, color: Neutral.n500),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        Fmt.money(p.price),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                      ),
                      const SizedBox(width: 10),
                      p.isAvailable
                          ? _pill('Activo', const Color(0xFFDCFCE7), const Color(0xFF15803D))
                          : _pill('Inactivo', Neutral.n200, Neutral.n700),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 4),
            IconButton(
              tooltip: 'Editar',
              visualDensity: VisualDensity.compact,
              icon: const Icon(Icons.edit_outlined, size: 20),
              onPressed: () => _openProductForm(product: p),
            ),
            IconButton(
              tooltip: p.isAvailable ? 'Desactivar' : 'Activar',
              visualDensity: VisualDensity.compact,
              icon: Icon(
                Icons.power_settings_new,
                size: 20,
                color: p.isAvailable ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
              ),
              onPressed: () => _toggleProduct(p),
            ),
          ],
        ),
      ),
    );
  }

  // ── Tab: Categorías ─────────────────────────────────────────────────────
  Widget _buildCategoriesTab() {
    if (_loading) return const LoadingView(message: 'Cargando categorías...');
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    final header = Row(
      children: [
        const Spacer(),
        ElevatedButton.icon(
          onPressed: () => _openCategoryForm(),
          icon: const Icon(Icons.add, size: 18),
          label: const Text('Nueva categoría'),
        ),
      ],
    );

    if (_categories.isEmpty) {
      return Column(
        children: [
          Padding(padding: const EdgeInsets.fromLTRB(16, 16, 16, 0), child: header),
          const Expanded(
            child: EmptyView(
              message: 'No hay categorías. Crea la primera.',
              icon: Icons.layers_outlined,
            ),
          ),
        ],
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          header,
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              final cols = constraints.maxWidth >= 640 ? 2 : 1;
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _categories.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: cols,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  mainAxisExtent: 178,
                ),
                itemBuilder: (context, i) => _categoryCard(_categories[i]),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _categoryCard(Category c) {
    final count = _productCount(c.id);
    return Opacity(
      opacity: c.isActive ? 1 : 0.6,
      child: SectionCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(c.icon, style: const TextStyle(fontSize: 30)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(c.name,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      const SizedBox(height: 2),
                      Text(
                        '$count producto${count == 1 ? '' : 's'} · Orden #${c.displayOrder}',
                        style: const TextStyle(fontSize: 12, color: Neutral.n500),
                      ),
                    ],
                  ),
                ),
                if (!c.isActive) _pill('Inactiva', Neutral.n200, Neutral.n700),
              ],
            ),
            if (c.description != null && c.description!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                c.description!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, color: Neutral.n600),
              ),
            ],
            const Spacer(),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _openCategoryForm(category: c),
                    icon: const Icon(Icons.edit_outlined, size: 16),
                    label: const Text('Editar'),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: c.isActive ? () => _deleteCategory(c) : null,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                  ),
                  child: const Icon(Icons.delete_outline, size: 18),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ── Helpers de UI ───────────────────────────────────────────────────────
  Widget _pill(String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(
        text,
        style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}

// ── Modal: crear / editar producto ─────────────────────────────────────────
class _ProductForm extends StatefulWidget {
  const _ProductForm({required this.product, required this.categories});
  final Product? product;
  final List<Category> categories;

  @override
  State<_ProductForm> createState() => _ProductFormState();
}

class _ProductFormState extends State<_ProductForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _price;
  late final TextEditingController _icon;
  late final TextEditingController _description;
  late final TextEditingController _imageUrl;
  int? _categoryId;
  late bool _isFeatured;
  late bool _isAvailable;
  bool _saving = false;
  String? _error;

  List<Category> get _activeCategories =>
      widget.categories.where((c) => c.isActive).toList();

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _name = TextEditingController(text: p?.name ?? '');
    _price = TextEditingController(text: p != null ? p.price.toString() : '');
    _icon = TextEditingController(text: p?.icon ?? '🍗');
    _description = TextEditingController(text: p?.description ?? '');
    _imageUrl = TextEditingController(text: p?.imageUrl ?? '');
    _isFeatured = p?.isFeatured ?? false;
    _isAvailable = p?.isAvailable ?? true;
    if (p != null) {
      _categoryId = p.categoryId;
    } else {
      _categoryId = _activeCategories.isNotEmpty ? _activeCategories.first.id : null;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    _icon.dispose();
    _description.dispose();
    _imageUrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_categoryId == null) {
      setState(() => _error = 'Selecciona una categoría');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final desc = _description.text.trim();
    final img = _imageUrl.text.trim();
    final payload = <String, dynamic>{
      'name': _name.text.trim(),
      'description': desc.isEmpty ? null : desc,
      'price': double.tryParse(_price.text.trim().replaceAll(',', '.')) ?? 0,
      'category_id': _categoryId,
      'icon': _icon.text.trim().isEmpty ? '🍗' : _icon.text.trim(),
      'image_url': img.isEmpty ? null : img,
      'is_featured': _isFeatured,
      'is_available': _isAvailable,
    };
    try {
      if (widget.product != null) {
        await ProductsService.update(widget.product!.id, payload);
      } else {
        await ProductsService.create(payload);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = getErrorMessage(e);
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.product != null;
    return _ModalScaffold(
      title: isEdit ? 'Editar producto' : 'Nuevo producto',
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null) ...[
              _ErrorBox(_error!),
              const SizedBox(height: 12),
            ],
            _label('Nombre'),
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(hintText: 'Pollo a la brasa'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _label('Precio (S/)'),
                      TextFormField(
                        controller: _price,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(hintText: '0.00'),
                        validator: (v) {
                          final n = double.tryParse((v ?? '').trim().replaceAll(',', '.'));
                          if (n == null || n < 0) return 'Inválido';
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 96,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _label('Icono'),
                      TextFormField(
                        controller: _icon,
                        textAlign: TextAlign.center,
                        decoration: const InputDecoration(hintText: '🍗'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _label('Categoría'),
            DropdownButtonFormField<int>(
              initialValue: _categoryId,
              isExpanded: true,
              decoration: const InputDecoration(hintText: 'Selecciona...'),
              items: _activeCategories
                  .map((c) => DropdownMenuItem(
                        value: c.id,
                        child: Text('${c.icon} ${c.name}', overflow: TextOverflow.ellipsis),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _categoryId = v),
              validator: (v) => v == null ? 'Selecciona una categoría' : null,
            ),
            const SizedBox(height: 12),
            _label('Descripción'),
            TextFormField(
              controller: _description,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(hintText: 'Opcional'),
            ),
            const SizedBox(height: 12),
            _label('URL de imagen (opcional)'),
            TextFormField(
              controller: _imageUrl,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(hintText: 'https://...'),
            ),
            const SizedBox(height: 8),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              activeThumbColor: BrandColors.c500,
              title: const Text('Destacado'),
              value: _isFeatured,
              onChanged: (v) => setState(() => _isFeatured = v),
            ),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              activeThumbColor: BrandColors.c500,
              title: const Text('Disponible (activo)'),
              value: _isAvailable,
              onChanged: (v) => setState(() => _isAvailable = v),
            ),
            const SizedBox(height: 16),
            _SaveBar(
              saving: _saving,
              label: isEdit ? 'Guardar' : 'Crear producto',
              onCancel: () => Navigator.pop(context, false),
              onSave: _save,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Modal: crear / editar categoría ────────────────────────────────────────
class _CategoryForm extends StatefulWidget {
  const _CategoryForm({required this.category, required this.defaultOrder});
  final Category? category;
  final int defaultOrder;

  @override
  State<_CategoryForm> createState() => _CategoryFormState();
}

class _CategoryFormState extends State<_CategoryForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _icon;
  late final TextEditingController _displayOrder;
  late final TextEditingController _description;
  late bool _isActive;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final c = widget.category;
    _name = TextEditingController(text: c?.name ?? '');
    _icon = TextEditingController(text: c?.icon ?? '🍗');
    _displayOrder =
        TextEditingController(text: (c?.displayOrder ?? widget.defaultOrder).toString());
    _description = TextEditingController(text: c?.description ?? '');
    _isActive = c?.isActive ?? true;
  }

  @override
  void dispose() {
    _name.dispose();
    _icon.dispose();
    _displayOrder.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final desc = _description.text.trim();
    final payload = <String, dynamic>{
      'name': _name.text.trim(),
      'description': desc.isEmpty ? null : desc,
      'icon': _icon.text.trim().isEmpty ? '🍗' : _icon.text.trim(),
      'display_order': int.tryParse(_displayOrder.text.trim()) ?? 0,
      'is_active': _isActive,
    };
    try {
      if (widget.category != null) {
        await ProductsService.updateCategory(widget.category!.id, payload);
      } else {
        await ProductsService.createCategory(payload);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = getErrorMessage(e);
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.category != null;
    return _ModalScaffold(
      title: isEdit ? 'Editar categoría' : 'Nueva categoría',
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null) ...[
              _ErrorBox(_error!),
              const SizedBox(height: 12),
            ],
            _label('Nombre'),
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(hintText: 'Pollos'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 96,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _label('Icono'),
                      TextFormField(
                        controller: _icon,
                        textAlign: TextAlign.center,
                        decoration: const InputDecoration(hintText: '🍗'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _label('Orden de display'),
                      TextFormField(
                        controller: _displayOrder,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(hintText: '0'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _label('Descripción (opcional)'),
            TextFormField(
              controller: _description,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(hintText: 'Opcional'),
            ),
            const SizedBox(height: 8),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              activeThumbColor: BrandColors.c500,
              title: const Text('Activa'),
              value: _isActive,
              onChanged: (v) => setState(() => _isActive = v),
            ),
            const SizedBox(height: 16),
            _SaveBar(
              saving: _saving,
              label: isEdit ? 'Guardar' : 'Crear categoría',
              onCancel: () => Navigator.pop(context, false),
              onSave: _save,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Piezas compartidas de los modales ──────────────────────────────────────
class _ModalScaffold extends StatelessWidget {
  const _ModalScaffold({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(title,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.pop(context, false),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: child,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SaveBar extends StatelessWidget {
  const _SaveBar({
    required this.saving,
    required this.label,
    required this.onCancel,
    required this.onSave,
  });
  final bool saving;
  final String label;
  final VoidCallback onCancel;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: saving ? null : onCancel,
            child: const Text('Cancelar'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton(
            onPressed: saving ? null : onSave,
            child: saving
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : Text(label),
          ),
        ),
      ],
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox(this.message);
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(message, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13)),
    );
  }
}

Widget _label(String text) => Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text,
          style: const TextStyle(
              fontSize: 12, fontWeight: FontWeight.w600, color: Neutral.n600)),
    );
