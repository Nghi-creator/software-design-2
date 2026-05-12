import 'package:flutter/material.dart';

void main() {
  runApp(const UniHubMobileApp());
}

class UniHubMobileApp extends StatelessWidget {
  const UniHubMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFFCB5A29);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'UniHub Check-in',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: seed,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF6F1EA),
        useMaterial3: true,
        textTheme: ThemeData.light().textTheme.apply(
          bodyColor: const Color(0xFF233044),
          displayColor: const Color(0xFF152033),
        ),
      ),
      home: const MobileHomePage(),
    );
  }
}

class MobileHomePage extends StatefulWidget {
  const MobileHomePage({super.key});

  @override
  State<MobileHomePage> createState() => _MobileHomePageState();
}

class _MobileHomePageState extends State<MobileHomePage> {
  int _selectedIndex = 0;

  static const _titles = ['Scanner', 'Queue', 'History', 'Profile'];

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final pages = [
      const ScannerTab(),
      const QueueTab(),
      const HistoryTab(),
      const ProfileTab(),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _titles[_selectedIndex],
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 2),
            Text(
              'UniHub Workshop Check-in',
              style: TextStyle(
                fontSize: 12,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: FilledButton.tonalIcon(
              onPressed: () {},
              icon: const Icon(Icons.wifi_off_rounded, size: 18),
              label: const Text('Offline'),
              style: FilledButton.styleFrom(
                foregroundColor: const Color(0xFF8D4F07),
                backgroundColor: const Color(0xFFFFE4BF),
              ),
            ),
          ),
        ],
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 250),
        child: pages[_selectedIndex],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (value) {
          setState(() {
            _selectedIndex = value;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner_rounded),
            label: 'Scanner',
          ),
          NavigationDestination(
            icon: Icon(Icons.cloud_upload_rounded),
            label: 'Queue',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_rounded),
            label: 'History',
          ),
          NavigationDestination(
            icon: Icon(Icons.badge_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class ScannerTab extends StatelessWidget {
  const ScannerTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      key: const ValueKey('scanner'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: const [
        ScannerStatusCard(),
        SizedBox(height: 18),
        ScannerViewfinder(),
        SizedBox(height: 18),
        QuickActionRow(),
        SizedBox(height: 18),
        RecentCheckinsCard(),
      ],
    );
  }
}

class QueueTab extends StatelessWidget {
  const QueueTab({super.key});

  @override
  Widget build(BuildContext context) {
    final queueItems = [
      (
        'SV10231 - Synced',
        'Workshop: Design Systems for Student Builders',
        Icons.check_circle_rounded,
        const Color(0xFF247046),
      ),
      (
        'SV18442 - Waiting for network',
        'Workshop: AI for Internships',
        Icons.schedule_rounded,
        const Color(0xFF8D4F07),
      ),
      (
        'SV22015 - Duplicate blocked',
        'Workshop: Career Launchpad',
        Icons.block_rounded,
        const Color(0xFF8A2D2B),
      ),
    ];

    return ListView(
      key: const ValueKey('queue'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        _SectionHeader(
          title: 'Offline sync queue',
          subtitle:
              'Locally stored scans remain visible until the app confirms server sync.',
        ),
        const SizedBox(height: 14),
        const SummaryStrip(),
        const SizedBox(height: 18),
        ...queueItems.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _InfoTile(
              leadingIcon: item.$3,
              iconColor: item.$4,
              title: item.$1,
              subtitle: item.$2,
              trailing: item.$1.contains('Waiting') ? 'Retrying' : 'Resolved',
            ),
          ),
        ),
      ],
    );
  }
}

class HistoryTab extends StatelessWidget {
  const HistoryTab({super.key});

  @override
  Widget build(BuildContext context) {
    final sessions = [
      (
        'Room B3',
        '74 students checked in',
        '09:00 - 10:30',
      ),
      (
        'Innovation Hub',
        '61 students checked in',
        '10:00 - 11:30',
      ),
      (
        'Hall A1',
        '112 students checked in',
        '13:30 - 15:00',
      ),
    ];

    return ListView(
      key: const ValueKey('history'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        _SectionHeader(
          title: 'Attendance history',
          subtitle:
              'Useful for staff after a session closes or when organizers need reconciliation.',
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: _panelDecoration(),
          child: Column(
            children: sessions
                .map(
                  (session) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _InfoTile(
                      leadingIcon: Icons.event_available_rounded,
                      iconColor: const Color(0xFF25496F),
                      title: session.$1,
                      subtitle: '${session.$2}\n${session.$3}',
                      trailing: 'Export',
                    ),
                  ),
                )
                .toList(),
          ),
        ),
      ],
    );
  }
}

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      key: const ValueKey('profile'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: _panelDecoration(),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: Color(0xFFFFE2D4),
                child: Icon(Icons.badge_rounded, color: Color(0xFFCB5A29)),
              ),
              SizedBox(height: 16),
              Text(
                'Nguyen Bao Linh',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF152033),
                ),
              ),
              SizedBox(height: 4),
              Text('Check-in Staff · Skill Week 2026'),
              SizedBox(height: 18),
              _ProfileMetricRow(
                label: 'Assigned zone',
                value: 'Lab B3 and overflow queue',
              ),
              _ProfileMetricRow(
                label: 'Device mode',
                value: 'Offline capture enabled',
              ),
              _ProfileMetricRow(
                label: 'Permissions',
                value: 'Scanner, sync queue, attendance history',
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        const _SectionHeader(
          title: 'Why this mobile UI fits the project',
          subtitle:
              'It keeps the scanning path fast, makes network state obvious and leaves room for camera and local database integration later.',
        ),
      ],
    );
  }
}

class ScannerStatusCard extends StatelessWidget {
  const ScannerStatusCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: _panelDecoration(
        background: const LinearGradient(
          colors: [Color(0xFF162138), Color(0xFF243554)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Room B3 · Design Systems for Student Builders',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Chip(
                label: Text('14 queued'),
                avatar: Icon(Icons.cloud_off_rounded, size: 18),
              ),
            ],
          ),
          SizedBox(height: 12),
          Text(
            'Staff can continue scanning while offline. Once connectivity returns, the app syncs unsent check-ins automatically and keeps duplicate protection visible.',
            style: TextStyle(color: Color(0xFFD9E2F3), height: 1.5),
          ),
        ],
      ),
    );
  }
}

class ScannerViewfinder extends StatelessWidget {
  const ScannerViewfinder({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: _panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Scan student QR',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF152033),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Camera preview placeholder for now. Later, this panel can host a real QR scanner widget.',
            style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 18),
          AspectRatio(
            aspectRatio: 1,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(30),
                gradient: const LinearGradient(
                  colors: [Color(0xFFF8FBFE), Color(0xFFE8EEF7)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                border: Border.all(color: const Color(0xFFD4DCE8)),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Positioned.fill(
                    child: CustomPaint(painter: GridPainter()),
                  ),
                  Container(
                    width: 210,
                    height: 210,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(26),
                      border: Border.all(
                        color: const Color(0xFFCB5A29),
                        width: 3,
                      ),
                    ),
                  ),
                  const Positioned(
                    bottom: 22,
                    child: Text(
                      'Align QR code inside the frame',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF233044),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class QuickActionRow extends StatelessWidget {
  const QuickActionRow({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: FilledButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.qr_code_scanner_rounded),
            label: const Text('Start scan'),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.person_search_rounded),
            label: const Text('Manual lookup'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        ),
      ],
    );
  }
}

class RecentCheckinsCard extends StatelessWidget {
  const RecentCheckinsCard({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      ('SV10352 · Tran Minh Chau', 'Checked in locally at 09:02', Icons.check),
      ('SV12885 · Le Bao Ngoc', 'Duplicate QR detected at 09:05', Icons.block),
      ('SV14922 · Pham Quoc Hung', 'Awaiting sync confirmation', Icons.schedule),
    ];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: _panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Recent scan results',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF152033),
            ),
          ),
          const SizedBox(height: 16),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _InfoTile(
                leadingIcon: item.$3,
                iconColor: item.$3 == Icons.block
                    ? const Color(0xFF8A2D2B)
                    : item.$3 == Icons.schedule
                        ? const Color(0xFF8D4F07)
                        : const Color(0xFF247046),
                title: item.$1,
                subtitle: item.$2,
                trailing: 'View',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SummaryStrip extends StatelessWidget {
  const SummaryStrip({super.key});

  @override
  Widget build(BuildContext context) {
    final cards = [
      ('Queued', '14', const Color(0xFFFFE4BF)),
      ('Synced today', '286', const Color(0xFFDDF3E4)),
      ('Blocked duplicates', '9', const Color(0xFFF9D7D4)),
    ];

    return Row(
      children: cards
          .map(
            (card) => Expanded(
              child: Container(
                margin: EdgeInsets.only(right: card == cards.last ? 0 : 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: card.$3,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(card.$1, style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Text(
                      card.$2,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF152033),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: Color(0xFF152033),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          subtitle,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.leadingIcon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.trailing,
  });

  final IconData leadingIcon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final String trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE0E5EC)),
        color: Colors.white.withValues(alpha: 0.72),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(leadingIcon, color: iconColor),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF152033),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            trailing,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: Color(0xFFCB5A29),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileMetricRow extends StatelessWidget {
  const _ProfileMetricRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: Color(0xFF6A7587),
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Color(0xFF152033),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFC8D3E1)
      ..strokeWidth = 1;

    const spacing = 24.0;
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

BoxDecoration _panelDecoration({Gradient? background}) {
  return BoxDecoration(
    gradient: background,
    color: background == null ? Colors.white.withValues(alpha: 0.72) : null,
    borderRadius: BorderRadius.circular(28),
    border: Border.all(color: const Color(0xFFE0E5EC)),
    boxShadow: const [
      BoxShadow(
        color: Color(0x12000000),
        blurRadius: 22,
        offset: Offset(0, 14),
      ),
    ],
  );
}
