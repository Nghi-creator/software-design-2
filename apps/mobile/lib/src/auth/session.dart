class Session {
  const Session({
    required this.accessToken,
    required this.userId,
    required this.email,
    required this.name,
    required this.role,
  });

  final String accessToken;
  final String userId;
  final String email;
  final String name;
  final String role;

  factory Session.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>;
    return Session(
      accessToken: json['accessToken'] as String,
      userId: user['id'] as String,
      email: user['email'] as String,
      name: user['name'] as String,
      role: user['role'] as String,
    );
  }
}
