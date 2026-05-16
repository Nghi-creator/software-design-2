import 'package:flutter/material.dart';

abstract final class UniHubColors {
  static const pageBackground = Color(0xFF090812);
  static const subtleBackground = Color(0xFF100E1D);
  static const raisedBackground = Color(0xFF171329);
  static const overlayBackground = Color(0xFF211A38);
  static const surfaceBase = Color(0xFF12101F);
  static const surfaceCard = Color(0xFF1A162B);
  static const surfaceCardHover = Color(0xFF211B36);
  static const textPrimary = Color(0xFFF7F4FF);
  static const textSecondary = Color(0xFFC9C1DD);
  static const textMuted = Color(0xFF948AAA);
  static const borderSubtle = Color(0xFF2D2642);
  static const borderStrong = Color(0xFF4A3C67);
  static const borderFocus = Color(0xFFA879FF);
  static const brandPrimary = Color(0xFF8B5CF6);
  static const brandPrimaryHover = Color(0xFFA879FF);
  static const brandPressed = Color(0xFF6D3FE0);
  static const brandSecondary = Color(0xFFC084FC);
  static const success = Color(0xFF3DDC97);
  static const successBackground = Color(0xFF113326);
  static const warning = Color(0xFFF6C85F);
  static const warningBackground = Color(0xFF3A2A12);
  static const danger = Color(0xFFFF6B81);
  static const dangerBackground = Color(0xFF3A1620);
  static const info = Color(0xFF7DD3FC);
  static const infoBackground = Color(0xFF102A3A);
}

abstract final class UniHubTheme {
  static ThemeData build() {
    final colorScheme =
        ColorScheme.fromSeed(
          seedColor: UniHubColors.brandPrimary,
          brightness: Brightness.dark,
          surface: UniHubColors.surfaceCard,
        ).copyWith(
          primary: UniHubColors.brandPrimary,
          secondary: UniHubColors.brandSecondary,
          surface: UniHubColors.surfaceCard,
          error: UniHubColors.danger,
          onPrimary: UniHubColors.textPrimary,
          onSecondary: UniHubColors.textPrimary,
          onSurface: UniHubColors.textPrimary,
          onError: UniHubColors.textPrimary,
        );

    final baseTextTheme = ThemeData.dark().textTheme.apply(
      bodyColor: UniHubColors.textSecondary,
      displayColor: UniHubColors.textPrimary,
      fontFamily: 'Inter',
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: UniHubColors.pageBackground,
      textTheme: baseTextTheme.copyWith(
        headlineMedium: baseTextTheme.headlineMedium?.copyWith(
          color: UniHubColors.textPrimary,
          fontWeight: FontWeight.w700,
        ),
        headlineSmall: baseTextTheme.headlineSmall?.copyWith(
          color: UniHubColors.textPrimary,
          fontWeight: FontWeight.w700,
        ),
        titleLarge: baseTextTheme.titleLarge?.copyWith(
          color: UniHubColors.textPrimary,
          fontWeight: FontWeight.w700,
        ),
        titleMedium: baseTextTheme.titleMedium?.copyWith(
          color: UniHubColors.textPrimary,
          fontWeight: FontWeight.w600,
        ),
        bodyMedium: baseTextTheme.bodyMedium?.copyWith(
          color: UniHubColors.textSecondary,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: UniHubColors.raisedBackground,
        foregroundColor: UniHubColors.textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: UniHubColors.surfaceCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: UniHubColors.borderSubtle),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: UniHubColors.surfaceBase,
        labelStyle: const TextStyle(color: UniHubColors.textMuted),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: UniHubColors.borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: UniHubColors.borderFocus),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: UniHubColors.brandPrimary,
          foregroundColor: UniHubColors.textPrimary,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: UniHubColors.brandSecondary,
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: UniHubColors.overlayBackground,
        labelStyle: const TextStyle(
          color: UniHubColors.textSecondary,
          fontWeight: FontWeight.w700,
        ),
        side: const BorderSide(color: UniHubColors.borderSubtle),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: UniHubColors.raisedBackground,
        indicatorColor: UniHubColors.overlayBackground,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            color: states.contains(WidgetState.selected)
                ? UniHubColors.textPrimary
                : UniHubColors.textMuted,
            fontWeight: FontWeight.w700,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected)
                ? UniHubColors.brandSecondary
                : UniHubColors.textMuted,
          ),
        ),
      ),
      dividerColor: UniHubColors.borderSubtle,
    );
  }
}
