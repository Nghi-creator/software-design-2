import 'package:unihub_mobile/src/auth/session.dart';
import 'package:unihub_mobile/src/core/api_client.dart';

class AuthService {
  AuthService(this._apiClient);

  final ApiClient _apiClient;

  Future<Session> login({
    required String email,
    required String password,
  }) async {
    final session = Session.fromJson(
      await _apiClient.postJson(
        '/api/auth/login',
        body: {'email': email, 'password': password},
      ),
    );
    if (session.role != 'CHECKIN_STAFF') {
      throw ApiException('This account does not have check-in staff access.');
    }
    return session;
  }
}
