import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config.dart';
import '../core/storage.dart';

/// Estilo de tile seleccionado, persistido en shared_preferences.
/// Espejo de loadTileStyle/saveTileStyle en mapTiles.ts.
class TileStyleNotifier extends Notifier<TileStyleId> {
  static const _key = 'chikenhot-map-style';

  /// Marca si el usuario ya eligió un estilo antes de terminar la hidratación,
  /// para que `_load` no pise su selección con el valor persistido.
  bool _userSelected = false;

  @override
  TileStyleId build() {
    _load();
    return kDefaultTileStyle;
  }

  Future<void> _load() async {
    final raw = await Storage.getString(_key);
    if (raw == null) return;
    if (_userSelected) return;
    final match = TileStyleId.values.where((e) => e.name == raw);
    if (match.isNotEmpty) state = match.first;
  }

  void select(TileStyleId id) {
    _userSelected = true;
    state = id;
    Storage.setString(_key, id.name);
  }
}

final tileStyleProvider =
    NotifierProvider<TileStyleNotifier, TileStyleId>(TileStyleNotifier.new);
