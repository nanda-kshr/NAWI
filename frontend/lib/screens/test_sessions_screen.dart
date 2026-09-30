import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import 'test_session_detail_screen.dart';

class TestSessionsScreen extends StatefulWidget {
  const TestSessionsScreen({super.key});

  @override
  State<TestSessionsScreen> createState() => _TestSessionsScreenState();
}

class _TestSessionsScreenState extends State<TestSessionsScreen> {
  List<dynamic> _sessions = [];
  bool _loading = true;
  String _statusFilter = '';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiService>();
      final data = await api.getInstruments(); // We'll use test sessions endpoint
      // Use the sessions data from API
      setState(() { _sessions = []; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Widget _chip(String s) {
    const colors = {'pass': Colors.green, 'fail': Colors.red, 'pending': Colors.orange,
      'approved': Colors.green, 'in_progress': Colors.blue, 'pending_review': Colors.amber,
      'under_review': Colors.purple, 'rejected': Colors.red, 'draft': Colors.grey};
    final c = colors[s] ?? Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
      child: Text(s.replaceAll('_', ' '), style: TextStyle(color: c, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Demo session shortcut
        Container(
          color: const Color(0xFFFFF7ED),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(children: [
            const Text('🔬', style: TextStyle(fontSize: 18)),
            const SizedBox(width: 10),
            const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Demo Session Available', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              Text('SES-2024-DEMO01 · Mettler Toledo ICS445', style: TextStyle(fontSize: 11, color: Color(0xFF92400E))),
            ])),
            TextButton(
              onPressed: () => Navigator.push(context, MaterialPageRoute(
                builder: (_) => const TestSessionDetailScreen(sessionId: 'SES-2024-DEMO01'),
              )),
              child: const Text('Open →', style: TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold)),
            ),
          ]),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.science_outlined, size: 64, color: Color(0xFFCBD5E1)),
                    const SizedBox(height: 12),
                    const Text('Test Sessions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    const Text('Open the demo session above or scan an instrument QR to start a test', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF64748B))),
                  ]),
                ),
        ),
      ],
    );
  }
}
