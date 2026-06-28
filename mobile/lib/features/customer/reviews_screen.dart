import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/format.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/models/review.dart';
import 'package:chikenhot/services/reviews_service.dart';
import 'package:chikenhot/widgets/common.dart';

/// Pantalla "Mis reseñas" — lista de reseñas escritas por el cliente.
class ReviewsScreen extends ConsumerStatefulWidget {
  const ReviewsScreen({super.key});

  @override
  ConsumerState<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends ConsumerState<ReviewsScreen> {
  bool _loading = true;
  String? _error;
  List<Review> _reviews = const [];

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
      final reviews = await ReviewsService.mine();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Neutral.n50,
      appBar: AppBar(title: const Text('Mis reseñas')),
      body: RefreshIndicator(
        onRefresh: _load,
        color: BrandColors.c500,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView(message: 'Cargando reseñas…');
    }
    if (_error != null) {
      return ListView(
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.7,
            child: ErrorView(message: _error!, onRetry: _load),
          ),
        ],
      );
    }
    if (_reviews.isEmpty) {
      return ListView(
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.7,
            child: EmptyView(
              icon: Icons.rate_review_outlined,
              message: 'Aún no has escrito reseñas',
              action: FilledButton(
                onPressed: () => context.go('/orders'),
                child: const Text('Ver mis pedidos para reseñar'),
              ),
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _reviews.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, i) => _ReviewCard(review: _reviews[i]),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review});

  final Review review;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => context.push('/orders/${review.orderId}'),
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text(
                      'Pedido #${review.orderId}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: BrandColors.c600,
                      ),
                    ),
                  ),
                ),
              ),
              if (review.createdAt != null)
                Text(
                  Fmt.date(review.createdAt!),
                  style: const TextStyle(fontSize: 12, color: Neutral.n500),
                ),
            ],
          ),
          const SizedBox(height: 8),
          StarRating(value: review.rating, size: 18),
          if (review.comment != null && review.comment!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              review.comment!,
              style: const TextStyle(fontSize: 14, color: Neutral.n700, height: 1.4),
            ),
          ],
        ],
      ),
    );
  }
}
