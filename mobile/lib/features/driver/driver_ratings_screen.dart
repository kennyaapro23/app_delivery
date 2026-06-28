import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/review.dart';
import 'package:chikenhot/providers/auth_provider.dart';
import 'package:chikenhot/services/reviews_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// DriverRatingsPage `/delivery/ratings` — "⭐ Mis calificaciones".
///
/// Espejo de `frontend/src/pages/driver/DriverRatingsPage.tsx`.
/// Carga las reseñas del repartidor (`ReviewsService.forDriver(userId)`),
/// calcula promedio / total / distribución 5→1 en el cliente, y muestra:
/// resumen (promedio grande, estrellas de solo lectura, barras de distribución)
/// + reseñas recientes (orden descendente). Maneja carga, vacío y error.
///
/// Se renderiza dentro de DriverShell (sin AppBar; el shell aporta el header).
class DriverRatingsScreen extends ConsumerStatefulWidget {
  const DriverRatingsScreen({super.key});

  @override
  ConsumerState<DriverRatingsScreen> createState() =>
      _DriverRatingsScreenState();
}

/// Estadísticas calculadas en el cliente a partir de las reseñas.
class _RatingStats {
  const _RatingStats({
    required this.avg,
    required this.total,
    required this.dist,
  });

  final double avg;
  final int total;
  final List<_DistBucket> dist;
}

/// Un nivel de la distribución de estrellas (5..1).
class _DistBucket {
  const _DistBucket({
    required this.stars,
    required this.count,
    required this.pct,
  });

  final int stars;
  final int count;
  final double pct;
}

class _DriverRatingsScreenState extends ConsumerState<DriverRatingsScreen> {
  bool _loading = true;
  String? _error;
  List<Review> _reviews = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final userId = ref.read(authProvider).userId;
    if (userId == null) {
      setState(() {
        _loading = false;
        _error = null;
        _reviews = const [];
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final reviews = await ReviewsService.forDriver(userId);
      if (!mounted) return;
      setState(() {
        _reviews = reviews;
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

  /// Promedio, total y distribución 5→1 (idéntico al `useMemo` web).
  _RatingStats? _computeStats() {
    if (_reviews.isEmpty) return null;
    final total = _reviews.length;
    final sum = _reviews.fold<double>(0, (acc, r) => acc + r.rating);
    final avg = sum / total;
    final dist = [5, 4, 3, 2, 1].map((stars) {
      final count = _reviews.where((r) => r.rating.round() == stars).length;
      return _DistBucket(
        stars: stars,
        count: count,
        pct: (count / total) * 100,
      );
    }).toList();
    return _RatingStats(avg: avg, total: total, dist: dist);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox(
        height: 280,
        child: LoadingView(message: 'Cargando tus calificaciones…'),
      );
    }

    final stats = _computeStats();

    return RefreshIndicator(
      onRefresh: _load,
      color: BrandColors.c500,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            '⭐ Mis calificaciones',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 16),

          // Caja de error en línea (no bloquea el resto de la pantalla).
          if (_error != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _error!,
                style: const TextStyle(
                  color: Color(0xFFB91C1C),
                  fontSize: 13,
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],

          if (stats == null)
            const _RatingsEmptyState()
          else ...[
            _SummaryCard(stats: stats),
            const SizedBox(height: 16),
            const Text(
              'Reseñas recientes',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Neutral.n600,
              ),
            ),
            const SizedBox(height: 8),
            ..._recentReviews().map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _ReviewCard(review: r),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Reseñas ordenadas por fecha descendente (más recientes primero).
  List<Review> _recentReviews() {
    final sorted = [..._reviews];
    sorted.sort((a, b) {
      final da = a.createdAt;
      final db = b.createdAt;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return db.compareTo(da);
    });
    return sorted;
  }
}

/// Estado vacío: sin calificaciones todavía.
class _RatingsEmptyState extends StatelessWidget {
  const _RatingsEmptyState();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Neutral.n300),
      ),
      child: const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.star_border, size: 48, color: Neutral.n300),
          SizedBox(height: 12),
          Text(
            'Aún no has recibido calificaciones',
            textAlign: TextAlign.center,
            style: TextStyle(color: Neutral.n500),
          ),
        ],
      ),
    );
  }
}

/// Tarjeta de resumen: promedio grande, estrellas de solo lectura y barras.
class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.stats});

  final _RatingStats stats;

  @override
  Widget build(BuildContext context) {
    final total = stats.total;
    final resena = total == 1 ? 'reseña' : 'reseñas';

    return SectionCard(
      padding: const EdgeInsets.all(20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Promedio + estrellas + conteo.
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                stats.avg.toStringAsFixed(1),
                style: const TextStyle(
                  fontSize: 40,
                  fontWeight: FontWeight.w800,
                  height: 1.1,
                ),
              ),
              StarRating(value: stats.avg.roundToDouble(), size: 16),
              const SizedBox(height: 4),
              Text(
                '$total $resena',
                style: const TextStyle(fontSize: 12, color: Neutral.n500),
              ),
            ],
          ),
          const SizedBox(width: 16),
          // Barras de distribución 5→1.
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final d in stats.dist) ...[
                  _DistRow(bucket: d),
                  if (d.stars != 1) const SizedBox(height: 4),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Una fila de la distribución: "N ★  [========]  count".
class _DistRow extends StatelessWidget {
  const _DistRow({required this.bucket});

  final _DistBucket bucket;

  static const _amber = Color(0xFFF59E0B);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 28,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${bucket.stars}',
                style: const TextStyle(fontSize: 11, color: Neutral.n600),
              ),
              const SizedBox(width: 2),
              const Icon(Icons.star, size: 12, color: _amber),
            ],
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: (bucket.pct / 100).clamp(0.0, 1.0),
              minHeight: 8,
              backgroundColor: Neutral.n100,
              valueColor: const AlwaysStoppedAnimation<Color>(_amber),
            ),
          ),
        ),
        const SizedBox(width: 6),
        SizedBox(
          width: 24,
          child: Text(
            '${bucket.count}',
            textAlign: TextAlign.right,
            style: const TextStyle(fontSize: 11, color: Neutral.n500),
          ),
        ),
      ],
    );
  }
}

/// Tarjeta de una reseña: estrellas + fecha, comentario, "Pedido #id".
class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review});

  final Review review;

  @override
  Widget build(BuildContext context) {
    final createdAt = review.createdAt;
    final comment = review.comment;

    return SectionCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              StarRating(value: review.rating, size: 16),
              if (createdAt != null)
                Text(
                  Fmt.date(createdAt),
                  style: const TextStyle(fontSize: 12, color: Neutral.n500),
                ),
            ],
          ),
          if (comment != null && comment.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              comment,
              style: const TextStyle(fontSize: 14, color: Neutral.n700),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            'Pedido #${review.orderId}',
            style: const TextStyle(fontSize: 12, color: Neutral.n400),
          ),
        ],
      ),
    );
  }
}
