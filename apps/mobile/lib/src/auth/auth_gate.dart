import 'package:flutter/material.dart';
import 'package:unihub_mobile/src/auth/auth_service.dart';
import 'package:unihub_mobile/src/auth/login_screen.dart';
import 'package:unihub_mobile/src/auth/session.dart';
import 'package:unihub_mobile/src/auth/session_store.dart';
import 'package:unihub_mobile/src/checkin/checkin_home_screen.dart';
import 'package:unihub_mobile/src/core/api_client.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final _sessionStore = SessionStore();
  final _apiClient = ApiClient();
  Session? _session;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSession();
  }

  Future<void> _loadSession() async {
    final session = await _sessionStore.load();
    if (!mounted) return;
    setState(() {
      _session = session;
      _isLoading = false;
    });
  }

  Future<void> _handleLogin(String email, String password) async {
    final session = await AuthService(
      _apiClient,
    ).login(email: email, password: password);
    await _sessionStore.save(session);
    if (!mounted) return;
    setState(() => _session = session);
  }

  Future<void> _handleLogout() async {
    await _sessionStore.clear();
    if (!mounted) return;
    setState(() => _session = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_session == null) {
      return LoginScreen(onLogin: _handleLogin);
    }
    return CheckinHomeScreen(
      session: _session!,
      apiClient: _apiClient,
      onLogout: _handleLogout,
    );
  }
}
