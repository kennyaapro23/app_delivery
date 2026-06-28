import 'package:flutter/material.dart';

/// Paleta de marca — espejo de tailwind.config.js (brand.*).
class BrandColors {
  static const c50 = Color(0xFFFFF8EC);
  static const c100 = Color(0xFFFFEFD1);
  static const c200 = Color(0xFFFFDCA3);
  static const c300 = Color(0xFFFFC265);
  static const c400 = Color(0xFFFF9D2A);
  static const c500 = Color(0xFFFF7E0F);
  static const c600 = Color(0xFFF25F05);
  static const c700 = Color(0xFFC84808);
  static const c800 = Color(0xFF9E390E);
  static const c900 = Color(0xFF7F300F);
}

/// Colores neutrales (tailwind neutral-*).
class Neutral {
  static const n50 = Color(0xFFFAFAFA);
  static const n100 = Color(0xFFF5F5F5);
  static const n200 = Color(0xFFE5E5E5);
  static const n300 = Color(0xFFD4D4D4);
  static const n400 = Color(0xFFA3A3A3);
  static const n500 = Color(0xFF737373);
  static const n600 = Color(0xFF525252);
  static const n700 = Color(0xFF404040);
  static const n800 = Color(0xFF262626);
  static const n900 = Color(0xFF171717);
}

ThemeData buildAppTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: BrandColors.c500,
    primary: BrandColors.c500,
    secondary: BrandColors.c600,
    brightness: Brightness.light,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: Neutral.n50,
    fontFamily: 'Inter',
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: Neutral.n900,
      elevation: 0,
      scrolledUnderElevation: 1,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: Neutral.n900,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Neutral.n200),
      ),
      margin: EdgeInsets.zero,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: BrandColors.c500,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Neutral.n800,
        side: const BorderSide(color: Neutral.n300),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: BrandColors.c600),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Neutral.n300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Neutral.n300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: BrandColors.c500, width: 2),
      ),
      hintStyle: const TextStyle(color: Neutral.n400),
    ),
    chipTheme: const ChipThemeData(
      backgroundColor: Neutral.n100,
      labelStyle: TextStyle(color: Neutral.n700, fontWeight: FontWeight.w600),
      side: BorderSide.none,
    ),
    dividerTheme: const DividerThemeData(color: Neutral.n200, thickness: 1),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: Neutral.n900,
      contentTextStyle: const TextStyle(color: Colors.white),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}
