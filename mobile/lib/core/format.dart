import 'package:intl/intl.dart';

import 'config.dart';

/// Formateadores compartidos (moneda S/, fechas, etc.).
class Fmt {
  Fmt._();

  // Locale unificado con la inicialización de fechas en main.dart
  // (initializeDateFormatting('es')) para evitar separadores/formatos
  // divergentes entre dispositivos.
  static final _money = NumberFormat('#,##0.00', 'es');

  /// S/ 12.50
  static String money(num value) =>
      '${AppConfig.currencySymbol} ${_money.format(value)}';

  /// 25 jun 2026, 14:30
  static String dateTime(DateTime dt) =>
      DateFormat("d MMM y, HH:mm", 'es').format(dt.toLocal());

  static String date(DateTime dt) =>
      DateFormat("d MMM y", 'es').format(dt.toLocal());

  static String time(DateTime dt) =>
      DateFormat("HH:mm", 'es').format(dt.toLocal());

  /// "hace 5 min", "ahora", etc.
  static String timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt.toLocal());
    final sec = diff.inSeconds;
    // Fechas futuras (desfase de reloj/zona horaria) -> evitar textos
    // negativos ("hace -5 min") mostrando "ahora".
    if (sec < 5) return 'ahora';
    if (sec < 60) return 'hace ${sec}s';
    final min = diff.inMinutes;
    if (min < 60) return 'hace $min min';
    final h = diff.inHours;
    if (h < 24) return 'hace $h h';
    return 'hace ${diff.inDays} d';
  }

  static DateTime? tryParse(String? iso) {
    if (iso == null || iso.isEmpty) return null;
    return DateTime.tryParse(iso);
  }

  /// Parsea timestamps del backend. El backend genera fechas en UTC pero las
  /// serializa como cadenas naive (sin 'Z' ni offset). `DateTime.tryParse`
  /// interpreta esas cadenas como hora LOCAL; aquí las normalizamos a UTC para
  /// que `toLocal()` aplique el offset correcto.
  static DateTime? parseUtc(String? s) {
    if (s == null || s.isEmpty) return null;
    final hasTz = s.endsWith('Z') || RegExp(r'[+-]\d\d:?\d\d$').hasMatch(s);
    return DateTime.tryParse(hasTz ? s : '${s}Z')?.toUtc();
  }
}
