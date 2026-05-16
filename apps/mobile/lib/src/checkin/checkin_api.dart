import 'package:unihub_mobile/src/checkin/queued_scan.dart';
import 'package:unihub_mobile/src/core/api_client.dart';

class CheckinApi {
  CheckinApi(this._apiClient);

  final ApiClient _apiClient;

  Future<String> checkInOnline({
    required String token,
    required String qrCode,
  }) async {
    final json = await _apiClient.postJson(
      '/api/checkin',
      token: token,
      body: {'qrCode': qrCode},
    );
    return (json['result'] as Map<String, dynamic>)['status'] as String;
  }

  Future<List<SyncResult>> sync({
    required String token,
    required List<QueuedScan> items,
  }) async {
    final json = await _apiClient.postJson(
      '/api/checkin/sync',
      token: token,
      body: {
        'items': items
            .map(
              (item) => {
                'localId': item.localId,
                'qrCode': item.qrCode,
                'scannedAt': item.scannedAt.toIso8601String(),
              },
            )
            .toList(),
      },
    );
    return (json['results'] as List<dynamic>)
        .map((item) => SyncResult.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}

class SyncResult {
  const SyncResult({
    required this.localId,
    required this.status,
    this.registrationId,
  });

  final String? localId;
  final String status;
  final String? registrationId;

  factory SyncResult.fromJson(Map<String, dynamic> json) => SyncResult(
    localId: json['localId'] as String?,
    status: json['status'] as String,
    registrationId: json['registrationId'] as String?,
  );
}
