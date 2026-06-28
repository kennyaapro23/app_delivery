import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config.dart';
import '../../providers/tile_style_provider.dart';

/// Botón flotante para cambiar el estilo del mapa — espejo de TileStyleSwitcher.tsx.
class TileStyleSwitcher extends ConsumerWidget {
  const TileStyleSwitcher({super.key, this.alignment = Alignment.topLeft});

  final Alignment alignment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(tileStyleProvider);
    final cfg = kTileStyles[current]!;
    return Align(
      alignment: alignment,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Material(
          color: Colors.white,
          elevation: 2,
          borderRadius: BorderRadius.circular(10),
          child: PopupMenuButton<TileStyleId>(
            tooltip: 'Estilo del mapa',
            initialValue: current,
            onSelected: (id) => ref.read(tileStyleProvider.notifier).select(id),
            itemBuilder: (_) => kTileStyles.values
                .map((c) => PopupMenuItem(
                      value: c.id,
                      child: Row(
                        children: [
                          Text(c.emoji, style: const TextStyle(fontSize: 18)),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(c.label,
                                  style: const TextStyle(fontWeight: FontWeight.w600)),
                              Text(c.description,
                                  style: const TextStyle(
                                      fontSize: 11, color: Colors.black54)),
                            ],
                          ),
                        ],
                      ),
                    ))
                .toList(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(cfg.emoji, style: const TextStyle(fontSize: 16)),
                  const SizedBox(width: 6),
                  Text(cfg.label,
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600)),
                  const Icon(Icons.arrow_drop_down, size: 18),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
