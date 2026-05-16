import 'package:flutter/material.dart';
import 'package:unihub_mobile/src/auth/auth_gate.dart';

class UniHubApp extends StatelessWidget {
  const UniHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFFCB5A29);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'UniHub Check-in',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: seed),
        scaffoldBackgroundColor: const Color(0xFFF6F1EA),
        useMaterial3: true,
      ),
      home: const AuthGate(),
    );
  }
}
