import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/address.dart';
import 'package:chikenhot/services/addresses_service.dart';
import 'package:chikenhot/widgets/common.dart';
import 'package:chikenhot/widgets/map/location_picker.dart';

/// Iconos por tipo de etiqueta — espejo de LABEL_ICONS en AddressesPage.tsx.
const Map<String, String> _labelIcons = {
  'Casa': '🏠',
  'Trabajo': '💼',
  'Familia': '👨‍👩‍👧',
  'Otro': '📍',
};

const List<String> _labelTypes = ['Casa', 'Trabajo', 'Familia', 'Otro'];

/// Pantalla "Mis direcciones" — espejo de AddressesPage.tsx.
class AddressesScreen extends ConsumerStatefulWidget {
  const AddressesScreen({super.key});

  @override
  ConsumerState<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends ConsumerState<AddressesScreen> {
  bool _loading = true;
  String? _error;
  List<Address> _addresses = [];

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
      final list = await AddressesService.list();
      if (!mounted) return;
      setState(() {
        _addresses = list;
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

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _openForm({Address? edit}) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddressFormSheet(edit: edit),
    );
    if (saved == true) {
      await _load();
    }
  }

  Future<void> _delete(Address a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar dirección'),
        content: Text('¿Eliminar "${a.label}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: const Color(0xFFB91C1C)),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await AddressesService.delete(a.id);
      _snack('Dirección eliminada');
      if (!mounted) return;
      await _load();
    } catch (e) {
      _snack(getErrorMessage(e));
    }
  }

  Future<void> _makeDefault(Address a) async {
    try {
      await AddressesService.update(a.id, {'is_default': true});
      if (!mounted) return;
      await _load();
    } catch (e) {
      _snack(getErrorMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('📍 Mis direcciones'),
        actions: [
          if (!_loading && _error == null && _addresses.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: TextButton.icon(
                onPressed: () => _openForm(),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Nueva'),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView(message: 'Cargando direcciones…');
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }
    if (_addresses.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.18),
          EmptyView(
            icon: Icons.home_outlined,
            message: 'Aún no has guardado direcciones',
            action: ElevatedButton(
              onPressed: () => _openForm(),
              child: const Text('Añadir primera dirección'),
            ),
          ),
        ],
      );
    }
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      itemCount: _addresses.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _AddressCard(
        address: _addresses[i],
        onEdit: () => _openForm(edit: _addresses[i]),
        onDelete: () => _delete(_addresses[i]),
        onMakeDefault: () => _makeDefault(_addresses[i]),
      ),
    );
  }
}

class _AddressCard extends StatelessWidget {
  const _AddressCard({
    required this.address,
    required this.onEdit,
    required this.onDelete,
    required this.onMakeDefault,
  });

  final Address address;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onMakeDefault;

  @override
  Widget build(BuildContext context) {
    final a = address;
    final districtCity =
        [a.district, a.city].where((s) => s != null && s.isNotEmpty).join(', ');
    return SectionCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    Text(_labelIcons[a.label] ?? '📍',
                        style: const TextStyle(fontSize: 22)),
                    Text(a.label,
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700)),
                    if (a.isDefault) const _DefaultBadge(),
                  ],
                ),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                tooltip: 'Editar',
                onPressed: onEdit,
                icon: const Icon(Icons.edit_outlined, size: 20),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                tooltip: 'Eliminar',
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline,
                    size: 20, color: Color(0xFFB91C1C)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(a.fullAddress, style: const TextStyle(fontSize: 14)),
          if (a.reference != null && a.reference!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(a.reference!,
                style: const TextStyle(fontSize: 12, color: Neutral.n500)),
          ],
          if (districtCity.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(districtCity,
                style: const TextStyle(fontSize: 12, color: Neutral.n400)),
          ],
          if (!a.isDefault) ...[
            const SizedBox(height: 8),
            InkWell(
              onTap: onMakeDefault,
              child: const Text(
                'Marcar como predeterminada',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: BrandColors.c600,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DefaultBadge extends StatelessWidget {
  const _DefaultBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: BrandColors.c50,
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.star, size: 12, color: BrandColors.c700),
          SizedBox(width: 4),
          Text('Predeterminada',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: BrandColors.c700)),
        ],
      ),
    );
  }
}

/// Modal de creación/edición de dirección.
class _AddressFormSheet extends ConsumerStatefulWidget {
  const _AddressFormSheet({this.edit});
  final Address? edit;

  @override
  ConsumerState<_AddressFormSheet> createState() => _AddressFormSheetState();
}

class _AddressFormSheetState extends ConsumerState<_AddressFormSheet> {
  late String _label;
  late final TextEditingController _districtCtrl;
  late final TextEditingController _cityCtrl;
  late final TextEditingController _referenceCtrl;

  String _fullAddress = '';
  double? _latitude;
  double? _longitude;
  bool _isDefault = false;
  bool _saving = false;

  bool get _isEdit => widget.edit != null;

  @override
  void initState() {
    super.initState();
    final e = widget.edit;
    _label = e?.label ?? 'Casa';
    _fullAddress = e?.fullAddress ?? '';
    _latitude = e?.latitude;
    _longitude = e?.longitude;
    _isDefault = e?.isDefault ?? false;
    _districtCtrl = TextEditingController(text: e?.district ?? '');
    _cityCtrl = TextEditingController(text: e?.city ?? (e == null ? 'Lima' : ''));
    _referenceCtrl = TextEditingController(text: e?.reference ?? '');
  }

  @override
  void dispose() {
    _districtCtrl.dispose();
    _cityCtrl.dispose();
    _referenceCtrl.dispose();
    super.dispose();
  }

  void _onMapPick(PickedLocation loc) {
    setState(() {
      _fullAddress = loc.address;
      _latitude = loc.lat;
      _longitude = loc.lon;
    });
  }

  Future<void> _submit() async {
    if (_fullAddress.isEmpty) return;
    setState(() => _saving = true);
    try {
      final district = _districtCtrl.text.trim();
      final city = _cityCtrl.text.trim();
      final reference = _referenceCtrl.text.trim();
      final payload = <String, dynamic>{
        'label': _label,
        'full_address': _fullAddress,
        'reference': reference.isEmpty ? null : reference,
        'district': district.isEmpty ? null : district,
        'city': city.isEmpty ? null : city,
        'latitude': _latitude,
        'longitude': _longitude,
        'is_default': _isDefault,
      };
      if (_isEdit) {
        await AddressesService.update(widget.edit!.id, payload);
      } else {
        await AddressesService.create(payload);
      }
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(getErrorMessage(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSubmit = _fullAddress.isNotEmpty && !_saving;
    final initialLoc = (_latitude != null && _longitude != null)
        ? PickedLocation(
            lat: _latitude!, lon: _longitude!, address: _fullAddress)
        : null;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.92,
        minChildSize: 0.5,
        maxChildSize: 0.96,
        builder: (context, scrollController) {
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Neutral.n300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _isEdit ? 'Editar dirección' : 'Nueva dirección',
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context, false),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                  children: [
                    const _FieldLabel('Tipo'),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        for (final lbl in _labelTypes) ...[
                          Expanded(child: _typeButton(lbl)),
                          if (lbl != _labelTypes.last) const SizedBox(width: 8),
                        ],
                      ],
                    ),
                    const SizedBox(height: 16),
                    const _FieldLabel('Ubicación en el mapa'),
                    const SizedBox(height: 6),
                    LocationPicker(
                      initial: initialLoc,
                      onChanged: _onMapPick,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const _FieldLabel('Distrito'),
                              const SizedBox(height: 6),
                              TextField(
                                controller: _districtCtrl,
                                textInputAction: TextInputAction.next,
                                decoration: const InputDecoration(isDense: true),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const _FieldLabel('Ciudad'),
                              const SizedBox(height: 6),
                              TextField(
                                controller: _cityCtrl,
                                textInputAction: TextInputAction.next,
                                decoration: const InputDecoration(isDense: true),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const _FieldLabel('Referencia (Dpto, piso, color de puerta...)'),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _referenceCtrl,
                      decoration: const InputDecoration(isDense: true),
                    ),
                    const SizedBox(height: 12),
                    InkWell(
                      onTap: () => setState(() => _isDefault = !_isDefault),
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            Checkbox(
                              value: _isDefault,
                              onChanged: (v) =>
                                  setState(() => _isDefault = v ?? false),
                            ),
                            const Expanded(
                              child: Text('Establecer como predeterminada',
                                  style: TextStyle(fontSize: 14)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _saving
                              ? null
                              : () => Navigator.pop(context, false),
                          child: const Text('Cancelar'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: canSubmit ? _submit : null,
                          child: _saving
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white),
                                )
                              : Text(_isEdit
                                  ? 'Guardar cambios'
                                  : 'Guardar dirección'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _typeButton(String lbl) {
    final selected = _label == lbl;
    return OutlinedButton(
      onPressed: () => setState(() => _label = lbl),
      style: OutlinedButton.styleFrom(
        backgroundColor: selected ? BrandColors.c50 : Colors.white,
        foregroundColor: selected ? BrandColors.c700 : Neutral.n700,
        side: BorderSide(color: selected ? BrandColors.c500 : Neutral.n200),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
        textStyle:
            const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_labelIcons[lbl] ?? '📍', style: const TextStyle(fontSize: 18)),
          const SizedBox(height: 2),
          Text(lbl, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text,
        style: const TextStyle(
            fontSize: 12, fontWeight: FontWeight.w600, color: Neutral.n600));
  }
}
