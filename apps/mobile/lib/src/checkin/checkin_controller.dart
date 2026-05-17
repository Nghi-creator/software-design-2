import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:unihub_mobile/src/checkin/checkin_api.dart';
import 'package:unihub_mobile/src/checkin/offline_queue_repository.dart';
import 'package:unihub_mobile/src/checkin/queued_scan.dart';
import 'package:uuid/uuid.dart';

class CheckinController extends ChangeNotifier {
  CheckinController({
    required this.token,
    required CheckinApi api,
    OfflineQueueRepository? repository,
    Connectivity? connectivity,
  }) : _api = api,
       _repository = repository ?? OfflineQueueRepository(),
       _connectivity = connectivity ?? Connectivity();

  final String token;
  final CheckinApi _api;
  final OfflineQueueRepository _repository;
  final Connectivity _connectivity;
  final _uuid = const Uuid();

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  List<QueuedScan> scans = [];
  bool isOnline = false;
  bool isSyncing = false;
  String? lastMessage;

  Future<void> initialize() async {
    scans = await _repository.listAll();
    isOnline = await _hasConnectivity();
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen((
      results,
    ) async {
      isOnline = results.any((result) => result != ConnectivityResult.none);
      notifyListeners();
      if (isOnline) await syncPending();
    });
    notifyListeners();
    if (isOnline) await syncPending();
  }

  Future<ScanOutcome?> handleScan(String qrCode) async {
    if (qrCode.trim().isEmpty) return null;
    if (await _hasConnectivity()) {
      try {
        final status = await _api.checkInOnline(token: token, qrCode: qrCode);
        lastMessage = _messageFor(status);
        scans = await _repository.listAll();
        notifyListeners();
        return ScanOutcome(status: status, message: lastMessage!);
      } catch (_) {
        await _queueOffline(qrCode, error: 'Online check-in failed; queued.');
        scans = await _repository.listAll();
        notifyListeners();
        return ScanOutcome(status: 'queued', message: lastMessage!);
      }
    } else {
      await _queueOffline(qrCode);
      scans = await _repository.listAll();
      notifyListeners();
      return ScanOutcome(status: 'queued', message: lastMessage!);
    }
  }

  Future<void> syncPending() async {
    if (isSyncing || !await _hasConnectivity()) return;
    final pending = await _repository.listPending();
    if (pending.isEmpty) return;
    isSyncing = true;
    notifyListeners();
    try {
      final results = await _api.sync(token: token, items: pending);
      for (final item in pending) {
        final result = results.firstWhere(
          (candidate) => candidate.localId == item.localId,
          orElse: () => const SyncResult(localId: null, status: 'failed'),
        );
        await _repository.upsert(
          item.copyWith(
            status: _statusFor(result.status),
            registrationId: result.registrationId,
            lastError: result.status == 'failed' ? 'Sync failed' : null,
          ),
        );
      }
      lastMessage = 'Queue synchronized.';
    } catch (_) {
      for (final item in pending) {
        await _repository.upsert(
          item.copyWith(status: QueueStatus.failed, lastError: 'Sync failed'),
        );
      }
      lastMessage = 'Sync failed. Items kept for retry.';
    } finally {
      scans = await _repository.listAll();
      isSyncing = false;
      notifyListeners();
    }
  }

  Future<void> clearResolved() async {
    await _repository.deleteResolved();
    scans = await _repository.listAll();
    notifyListeners();
  }

  Future<void> _queueOffline(String qrCode, {String? error}) async {
    await _repository.upsert(
      QueuedScan(
        localId: _uuid.v4(),
        qrCode: qrCode,
        scannedAt: DateTime.now().toUtc(),
        status: QueueStatus.pending,
        lastError: error,
      ),
    );
    lastMessage =
        error ?? 'Saved offline. It will sync when the network returns.';
  }

  Future<bool> _hasConnectivity() async {
    final results = await _connectivity.checkConnectivity();
    isOnline = results.any((result) => result != ConnectivityResult.none);
    return isOnline;
  }

  QueueStatus _statusFor(String status) {
    switch (status) {
      case 'checked_in':
      case 'already_checked_in':
        return QueueStatus.synced;
      case 'invalid':
        return QueueStatus.invalid;
      default:
        return QueueStatus.failed;
    }
  }

  String _messageFor(String status) {
    switch (status) {
      case 'checked_in':
        return 'Check-in recorded.';
      case 'already_checked_in':
        return 'Student was already checked in.';
      default:
        return 'QR code is invalid.';
    }
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }
}

class ScanOutcome {
  const ScanOutcome({required this.status, required this.message});

  final String status;
  final String message;

  bool get isSuccess => status == 'checked_in';
}
