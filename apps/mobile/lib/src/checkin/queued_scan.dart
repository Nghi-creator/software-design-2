enum QueueStatus { pending, synced, invalid, failed }

class QueuedScan {
  const QueuedScan({
    required this.localId,
    required this.qrCode,
    required this.scannedAt,
    required this.status,
    this.registrationId,
    this.lastError,
  });

  final String localId;
  final String qrCode;
  final DateTime scannedAt;
  final QueueStatus status;
  final String? registrationId;
  final String? lastError;

  QueuedScan copyWith({
    QueueStatus? status,
    String? registrationId,
    String? lastError,
  }) {
    return QueuedScan(
      localId: localId,
      qrCode: qrCode,
      scannedAt: scannedAt,
      status: status ?? this.status,
      registrationId: registrationId ?? this.registrationId,
      lastError: lastError,
    );
  }
}
