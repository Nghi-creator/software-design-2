import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:unihub_mobile/src/auth/session.dart';
import 'package:unihub_mobile/src/checkin/checkin_api.dart';
import 'package:unihub_mobile/src/checkin/checkin_controller.dart';
import 'package:unihub_mobile/src/checkin/queued_scan.dart';
import 'package:unihub_mobile/src/core/api_client.dart';

class CheckinHomeScreen extends StatefulWidget {
  const CheckinHomeScreen({
    super.key,
    required this.session,
    required this.apiClient,
    required this.onLogout,
  });

  final Session session;
  final ApiClient apiClient;
  final Future<void> Function() onLogout;

  @override
  State<CheckinHomeScreen> createState() => _CheckinHomeScreenState();
}

class _CheckinHomeScreenState extends State<CheckinHomeScreen> {
  late final CheckinController _controller;
  final _scannerController = MobileScannerController();
  int _selectedIndex = 0;
  String? _lastQrCode;

  @override
  void initState() {
    super.initState();
    _controller = CheckinController(
      token: widget.session.accessToken,
      api: CheckinApi(widget.apiClient),
    )..initialize();
  }

  @override
  void dispose() {
    _scannerController.dispose();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    final qrCode = capture.barcodes.isEmpty
        ? null
        : capture.barcodes.first.rawValue;
    if (qrCode == null || qrCode == _lastQrCode) return;
    _lastQrCode = qrCode;
    await _controller.handleScan(qrCode);
    await Future<void>.delayed(const Duration(seconds: 2));
    _lastQrCode = null;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final pages = [
          _ScannerPage(
            controller: _controller,
            scannerController: _scannerController,
            onDetect: _onDetect,
          ),
          _QueuePage(controller: _controller),
          _ProfilePage(session: widget.session, onLogout: widget.onLogout),
        ];

        return Scaffold(
          appBar: AppBar(
            title: const Text('UniHub Check-in'),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Chip(
                  avatar: Icon(
                    _controller.isOnline ? Icons.wifi : Icons.wifi_off,
                    size: 18,
                  ),
                  label: Text(_controller.isOnline ? 'Online' : 'Offline'),
                ),
              ),
            ],
          ),
          body: pages[_selectedIndex],
          bottomNavigationBar: NavigationBar(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (value) =>
                setState(() => _selectedIndex = value),
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.qr_code_scanner),
                label: 'Scanner',
              ),
              NavigationDestination(
                icon: Icon(Icons.cloud_upload),
                label: 'Queue',
              ),
              NavigationDestination(icon: Icon(Icons.badge), label: 'Profile'),
            ],
          ),
        );
      },
    );
  }
}

class _ScannerPage extends StatelessWidget {
  const _ScannerPage({
    required this.controller,
    required this.scannerController,
    required this.onDetect,
  });

  final CheckinController controller;
  final MobileScannerController scannerController;
  final Future<void> Function(BarcodeCapture capture) onDetect;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        if (controller.lastMessage != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(controller.lastMessage!),
            ),
          ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: AspectRatio(
            aspectRatio: 1,
            child: MobileScanner(
              controller: scannerController,
              onDetect: onDetect,
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: controller.isSyncing ? null : controller.syncPending,
          icon: const Icon(Icons.sync),
          label: Text(
            controller.isSyncing ? 'Syncing...' : 'Sync queued scans',
          ),
        ),
      ],
    );
  }
}

class _QueuePage extends StatelessWidget {
  const _QueuePage({required this.controller});

  final CheckinController controller;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Offline queue',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            TextButton(
              onPressed: controller.clearResolved,
              child: const Text('Clear resolved'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (controller.scans.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Text('No scans stored on this device yet.'),
            ),
          ),
        ...controller.scans.map((scan) => _QueueTile(scan: scan)),
      ],
    );
  }
}

class _QueueTile extends StatelessWidget {
  const _QueueTile({required this.scan});

  final QueuedScan scan;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(_iconFor(scan.status)),
        title: Text(scan.qrCode),
        subtitle: Text(
          '${scan.status.name} · ${scan.scannedAt.toLocal()}'
          '${scan.lastError == null ? '' : '\n${scan.lastError}'}',
        ),
      ),
    );
  }

  IconData _iconFor(QueueStatus status) {
    switch (status) {
      case QueueStatus.pending:
        return Icons.schedule;
      case QueueStatus.synced:
        return Icons.check_circle;
      case QueueStatus.invalid:
        return Icons.block;
      case QueueStatus.failed:
        return Icons.error;
    }
  }
}

class _ProfilePage extends StatelessWidget {
  const _ProfilePage({required this.session, required this.onLogout});

  final Session session;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                session.name,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(session.email),
              Text(session.role),
              const SizedBox(height: 20),
              FilledButton.tonal(
                onPressed: onLogout,
                child: const Text('Sign out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
