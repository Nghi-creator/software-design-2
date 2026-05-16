import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:unihub_mobile/src/auth/session.dart';
import 'package:unihub_mobile/src/checkin/checkin_api.dart';
import 'package:unihub_mobile/src/checkin/checkin_controller.dart';
import 'package:unihub_mobile/src/checkin/queued_scan.dart';
import 'package:unihub_mobile/src/core/api_client.dart';
import 'package:unihub_mobile/src/core/unihub_theme.dart';

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
                child: _ConnectionChip(isOnline: _controller.isOnline),
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
        Text('Scanner', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        const Text('Point the camera at a student QR ticket to check them in.'),
        const SizedBox(height: 16),
        if (controller.lastMessage != null) ...[
          _StatusCard(message: controller.lastMessage!),
          const SizedBox(height: 12),
        ],
        Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              AspectRatio(
                aspectRatio: 1,
                child: MobileScanner(
                  controller: scannerController,
                  onDetect: onDetect,
                ),
              ),
              Container(
                width: double.infinity,
                color: UniHubColors.overlayBackground,
                padding: const EdgeInsets.all(16),
                child: const Text(
                  'Scans are stored locally when the network drops, then synced later.',
                ),
              ),
            ],
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

class _ConnectionChip extends StatelessWidget {
  const _ConnectionChip({required this.isOnline});

  final bool isOnline;

  @override
  Widget build(BuildContext context) {
    final color = isOnline ? UniHubColors.success : UniHubColors.warning;
    final background = isOnline
        ? UniHubColors.successBackground
        : UniHubColors.warningBackground;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(isOnline ? Icons.wifi : Icons.wifi_off, color: color, size: 16),
          const SizedBox(width: 8),
          Text(
            isOnline ? 'Online' : 'Offline',
            style: TextStyle(color: color, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.info_outline, color: UniHubColors.info),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
      ),
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
        if (controller.scans.isEmpty) const _EmptyQueueCard(),
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
        leading: CircleAvatar(
          backgroundColor: _backgroundFor(scan.status),
          foregroundColor: _colorFor(scan.status),
          child: Icon(_iconFor(scan.status)),
        ),
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

  Color _colorFor(QueueStatus status) {
    switch (status) {
      case QueueStatus.pending:
        return UniHubColors.warning;
      case QueueStatus.synced:
        return UniHubColors.success;
      case QueueStatus.invalid:
      case QueueStatus.failed:
        return UniHubColors.danger;
    }
  }

  Color _backgroundFor(QueueStatus status) {
    switch (status) {
      case QueueStatus.pending:
        return UniHubColors.warningBackground;
      case QueueStatus.synced:
        return UniHubColors.successBackground;
      case QueueStatus.invalid:
      case QueueStatus.failed:
        return UniHubColors.dangerBackground;
    }
  }
}

class _EmptyQueueCard extends StatelessWidget {
  const _EmptyQueueCard();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Text('No scans stored on this device yet.'),
      ),
    );
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
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerLeft,
                child: Chip(label: Text(session.role.replaceAll('_', ' '))),
              ),
              const SizedBox(height: 20),
              FilledButton(onPressed: onLogout, child: const Text('Sign out')),
            ],
          ),
        ),
      ),
    );
  }
}
