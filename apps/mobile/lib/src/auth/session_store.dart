import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:unihub_mobile/src/auth/session.dart';

class SessionStore {
  SessionStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  Future<void> save(Session session) async {
    await _storage.write(key: 'accessToken', value: session.accessToken);
    await _storage.write(key: 'userId', value: session.userId);
    await _storage.write(key: 'email', value: session.email);
    await _storage.write(key: 'name', value: session.name);
    await _storage.write(key: 'role', value: session.role);
  }

  Future<Session?> load() async {
    final values = await Future.wait([
      _storage.read(key: 'accessToken'),
      _storage.read(key: 'userId'),
      _storage.read(key: 'email'),
      _storage.read(key: 'name'),
      _storage.read(key: 'role'),
    ]);
    if (values.any((value) => value == null)) return null;
    return Session(
      accessToken: values[0]!,
      userId: values[1]!,
      email: values[2]!,
      name: values[3]!,
      role: values[4]!,
    );
  }

  Future<void> clear() => _storage.deleteAll();
}
