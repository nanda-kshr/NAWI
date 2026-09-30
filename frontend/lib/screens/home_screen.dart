import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/sync_service.dart';
import 'instruments_screen.dart';
import 'scan_screen.dart';
import 'test_sessions_screen.dart';
import 'reports_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;

  final _tabs = const [
    NavigationDestination(icon: Icon(Icons.scale_outlined), selectedIcon: Icon(Icons.scale), label: 'Instruments'),
    NavigationDestination(icon: Icon(Icons.qr_code_scanner_outlined), selectedIcon: Icon(Icons.qr_code_scanner), label: 'Scan'),
    NavigationDestination(icon: Icon(Icons.science_outlined), selectedIcon: Icon(Icons.science), label: 'Tests'),
    NavigationDestination(icon: Icon(Icons.description_outlined), selectedIcon: Icon(Icons.description), label: 'Reports'),
  ];

  final _screens = const [
    InstrumentsScreen(),
    ScanScreen(),
    TestSessionsScreen(),
    ReportsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final sync = context.watch<SyncService>();

    return Scaffold(
      appBar: AppBar(
        title: const Row(children: [
          Text('N', style: TextStyle(backgroundColor: Color(0xFFF59E0B), color: Colors.white, fontWeight: FontWeight.bold)),
          SizedBox(width: 10),
          Text('NAWI Platform'),
        ]),
        actions: [
          // Sync status indicator
          if (!sync.isOnline)
            const Padding(
              padding: EdgeInsets.only(right: 8),
              child: Chip(
                label: Text('OFFLINE', style: TextStyle(fontSize: 10, color: Colors.white)),
                backgroundColor: Colors.orange,
                padding: EdgeInsets.zero,
              ),
            ),
          if (sync.status == SyncStatus.syncing)
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
            ),
          // Role badge
          Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(auth.role, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
          ),
          PopupMenuButton<void>(
            icon: const Icon(Icons.account_circle_outlined),
            itemBuilder: (_) => <PopupMenuEntry<void>>[
              PopupMenuItem<void>(enabled: false, child: Text(auth.name)),
              PopupMenuItem<void>(enabled: false, child: Text(auth.role)),
              const PopupMenuDivider(),
              PopupMenuItem<void>(
                onTap: () => auth.logout(),
                child: const Row(children: [Icon(Icons.logout, size: 18), SizedBox(width: 8), Text('Sign out')]),
              ),
            ],
          ),
        ],
      ),
      body: _screens[_tab],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: _tabs,
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFF59E0B).withOpacity(0.15),
      ),
    );
  }
}
