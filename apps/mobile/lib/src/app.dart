import 'package:flutter/material.dart';
import 'package:unihub_mobile/src/auth/auth_gate.dart';
import 'package:unihub_mobile/src/core/unihub_theme.dart';

class UniHubApp extends StatelessWidget {
  const UniHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'UniHub Check-in',
      theme: UniHubTheme.build(),
      home: const AuthGate(),
    );
  }
}
