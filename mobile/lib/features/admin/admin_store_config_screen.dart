import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/services/store_config_service.dart';
import 'package:chikenhot/widgets/common.dart';
import 'package:chikenhot/widgets/map/location_picker.dart';

/// `/admin/store-config` — el admin fija la ubicación y datos del restaurante.
/// Se renderiza dentro de [AdminShell] (el shell provee AppBar/drawer/Scaffold);
/// esta pantalla sólo aporta el cuerpo.
class AdminStoreConfigScreen extends ConsumerStatefulWidget {
  const AdminStoreConfigScreen({super.key});

  @override
  ConsumerState<AdminStoreConfigScreen> createState() =>
      _AdminStoreConfigScreenState();
}

class _AdminStoreConfigScreenState
    extends ConsumerState<AdminStoreConfigScreen> {
  final _nameCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  bool _loading = true;
  bool _saving = false;
  String? _error;

  double? _lat;
  double? _lng;
  PickedLocation? _initialPick;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _addressCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final cfg = await StoreConfigService.get();
      if (!mounted) return;
      setState(() {
        _nameCtrl.text = cfg.name;
        _addressCtrl.text = cfg.address ?? '';
        _phoneCtrl.text = cfg.phone ?? '';
        _lat = cfg.latitude;
        _lng = cfg.longitude;
        _initialPick = PickedLocation(
          lat: cfg.latitude,
          lon: cfg.longitude,
          address: cfg.address ?? '',
        );
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

  void _onLocationChanged(PickedLocation p) {
    setState(() {
      _lat = p.lat;
      _lng = p.lon;
      // Si el campo dirección está vacío, autocompleta con la del mapa.
      if (_addressCtrl.text.trim().isEmpty && p.address.isNotEmpty) {
        _addressCtrl.text = p.address;
      }
    });
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      _snack('El nombre del restaurante es obligatorio');
      return;
    }
    final lat = _lat;
    final lng = _lng;
    if (lat == null || lng == null) {
      _snack('Fija la ubicación del restaurante en el mapa');
      return;
    }
    setState(() => _saving = true);
    try {
      final updated = await StoreConfigService.update(
        name: name,
        address: _addressCtrl.text.trim(),
        latitude: lat,
        longitude: lng,
        phone: _phoneCtrl.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _lat = updated.latitude;
        _lng = updated.longitude;
      });
      _snack('Ubicación del restaurante guardada');
    } catch (e) {
      if (!mounted) return;
      _snack(getErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const LoadingView(message: 'Cargando configuración…');
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Ubicación del restaurante',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        const Text(
          'Estos datos se muestran a los clientes y repartidores. '
          'El pin marca el punto de despacho en los mapas.',
          style: TextStyle(fontSize: 13, color: Neutral.n500),
        ),
        const SizedBox(height: 16),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _Label('Nombre del restaurante'),
              const SizedBox(height: 6),
              TextField(
                controller: _nameCtrl,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  hintText: 'Chikenhot Lima Centro',
                  prefixIcon: Icon(Icons.storefront_outlined, size: 20),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 14),
              const _Label('Dirección'),
              const SizedBox(height: 6),
              TextField(
                controller: _addressCtrl,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  hintText: 'Av. Ejemplo 123, Lima',
                  prefixIcon: Icon(Icons.place_outlined, size: 20),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 14),
              const _Label('Teléfono'),
              const SizedBox(height: 6),
              TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  hintText: '+51 999 999 999',
                  prefixIcon: Icon(Icons.phone_outlined, size: 20),
                  isDense: true,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _Label('Fija la ubicación en el mapa'),
              const SizedBox(height: 6),
              const Text(
                'Toca el mapa, busca una dirección o usa tu ubicación actual.',
                style: TextStyle(fontSize: 12, color: Neutral.n500),
              ),
              const SizedBox(height: 10),
              LocationPicker(
                initial: _initialPick,
                onChanged: _onLocationChanged,
                height: 300,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        ElevatedButton.icon(
          onPressed: _saving ? null : _save,
          icon: _saving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : const Icon(Icons.save_outlined, size: 20),
          label: Text(_saving ? 'Guardando…' : 'Guardar ubicación'),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: Neutral.n700,
      ),
    );
  }
}
