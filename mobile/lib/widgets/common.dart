import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../models/order.dart';
import '../models/user.dart';

/// Badge de estado de pedido.
class StatusBadge extends StatelessWidget {
  const StatusBadge(this.status, {super.key, this.small = false});
  final OrderStatus status;
  final bool small;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: small ? 8 : 10, vertical: small ? 3 : 5),
      decoration: BoxDecoration(
        color: status.bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(status.icon, size: small ? 12 : 14, color: status.color),
          SizedBox(width: small ? 4 : 6),
          Text(status.label,
              style: TextStyle(
                  color: status.color,
                  fontSize: small ? 11 : 12,
                  fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

/// Estrellas de calificación (lectura o interactivo).
class StarRating extends StatelessWidget {
  const StarRating({
    super.key,
    required this.value,
    this.size = 20,
    this.onChanged,
    this.color = const Color(0xFFF59E0B),
  });

  final double value;
  final double size;
  final ValueChanged<int>? onChanged;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final filled = i < value.round();
        final star = Icon(
          filled ? Icons.star : Icons.star_border,
          size: size,
          color: filled ? color : const Color(0xFFD4D4D4),
        );
        if (onChanged == null) return star;
        return GestureDetector(
          onTap: () => onChanged!(i + 1),
          child: Padding(padding: const EdgeInsets.all(2), child: star),
        );
      }),
    );
  }
}

/// Tarjeta de estadística.
class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.hint,
    this.color = BrandColors.c500,
    this.trend,
  });

  final String label;
  final String value;
  final IconData? icon;
  final String? hint;
  final Color color;
  final int? trend;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Neutral.n200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10)),
                  child: Icon(icon, color: color, size: 18),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: Text(label,
                    style: const TextStyle(
                        fontSize: 12, color: Neutral.n500, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(value,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          if (trend != null)
            Text('${trend! >= 0 ? '+' : ''}$trend% vs ayer',
                style: TextStyle(
                    fontSize: 11,
                    color: trend! >= 0 ? const Color(0xFF15803D) : const Color(0xFFB91C1C))),
          if (hint != null)
            Text(hint!, style: const TextStyle(fontSize: 11, color: Neutral.n400)),
        ],
      ),
    );
  }
}

/// Badge de nivel de membresía.
class MembershipBadge extends StatelessWidget {
  const MembershipBadge(this.level, {super.key});
  final MembershipLevel level;

  Color get _color => switch (level) {
        MembershipLevel.bronce => const Color(0xFFB45309),
        MembershipLevel.plata => const Color(0xFF6B7280),
        MembershipLevel.oro => const Color(0xFFD97706),
        MembershipLevel.platino => const Color(0xFF7C3AED),
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _color.withValues(alpha: 0.4)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.workspace_premium, size: 16, color: _color),
        const SizedBox(width: 6),
        Text(level.label,
            style: TextStyle(color: _color, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

/// Stepper de cantidad +/-.
class QtyStepper extends StatelessWidget {
  const QtyStepper({
    super.key,
    required this.value,
    required this.onChanged,
    this.min = 1,
  });
  final int value;
  final ValueChanged<int> onChanged;
  final int min;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Neutral.n300),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        IconButton(
          visualDensity: VisualDensity.compact,
          onPressed: value > min ? () => onChanged(value - 1) : null,
          icon: const Icon(Icons.remove, size: 18),
        ),
        Text('$value',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        IconButton(
          visualDensity: VisualDensity.compact,
          onPressed: () => onChanged(value + 1),
          icon: const Icon(Icons.add, size: 18),
        ),
      ]),
    );
  }
}

/// Vistas de estado reutilizables.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message});
  final String? message;
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 12),
            Text(message!, style: const TextStyle(color: Neutral.n500)),
          ],
        ],
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 40, color: Color(0xFFB91C1C)),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Reintentar')),
            ],
          ],
        ),
      ),
    );
  }
}

class EmptyView extends StatelessWidget {
  const EmptyView({super.key, required this.message, this.icon = Icons.inbox_outlined, this.action});
  final String message;
  final IconData icon;
  final Widget? action;
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: Neutral.n300),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Neutral.n500)),
            if (action != null) ...[const SizedBox(height: 16), action!],
          ],
        ),
      ),
    );
  }
}

/// Tarjeta blanca con borde y padding estándar.
class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.child, this.padding = const EdgeInsets.all(16)});
  final Widget child;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Neutral.n200),
      ),
      child: child,
    );
  }
}
