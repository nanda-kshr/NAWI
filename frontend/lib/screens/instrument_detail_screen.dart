import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import 'test_session_detail_screen.dart';
import 'ar_assistant_screen.dart';

class InstrumentDetailScreen extends StatefulWidget {
  final String instrumentId;
  const InstrumentDetailScreen({super.key, required this.instrumentId});

  @override
  State<InstrumentDetailScreen> createState() => _InstrumentDetailScreenState();
}

class _InstrumentDetailScreenState extends State<InstrumentDetailScreen> {
  Map<String, dynamic>? _instrument;
  List<dynamic> _sessions = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final api = context.read<ApiService>();
      final data = await api.getInstrument(widget.instrumentId);
      setState(() {
        _instrument = data['instrument'] as Map<String, dynamic>?;
        _sessions = data['sessions'] as List? ?? [];
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(children: [
      SizedBox(width: 160, child: Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w500))),
      Expanded(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
    ]),
  );

  Widget _statusChip(String s) {
    const colors = {'pass': Colors.green, 'fail': Colors.red, 'pending': Colors.orange, 'approved': Colors.green, 'in_progress': Colors.blue, 'rejected': Colors.red};
    final c = colors[s] ?? Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(20), border: Border.all(color: c.withOpacity(0.3))),
      child: Text(s.replaceAll('_', ' '), style: TextStyle(color: c, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final inst = _instrument;
    return Scaffold(
      appBar: AppBar(
        title: Text(inst != null ? '${inst['manufacturer']} ${inst['model']}' : 'Instrument'),
        actions: [
          if (inst != null)
            IconButton(
              icon: const Icon(Icons.view_in_ar),
              tooltip: 'AR Assistant',
              onPressed: () => Navigator.push(context, MaterialPageRoute(
                builder: (_) => ArAssistantScreen(instrument: inst),
              )),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : inst == null
              ? const Center(child: Text('Instrument not found'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // QR Code card
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(children: [
                          if (inst['qrCode'] != null)
                            Image.network(inst['qrCode'] as String, width: 90, height: 90, errorBuilder: (_, __, ___) => const Icon(Icons.qr_code, size: 90, color: Color(0xFFCBD5E1)))
                          else
                            const Icon(Icons.qr_code, size: 90, color: Color(0xFFCBD5E1)),
                          const SizedBox(width: 16),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(inst['instrumentId'] as String? ?? '', style: const TextStyle(fontFamily: 'monospace', fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFFF59E0B))),
                            const SizedBox(height: 4),
                            Text(inst['serialNumber'] as String? ?? '', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                            const SizedBox(height: 8),
                            Wrap(spacing: 6, children: [
                              _statusChip(inst['status'] as String? ?? ''),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(color: Colors.blue.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                                child: Text('Class ${inst['accuracyClass']}', style: const TextStyle(color: Colors.blue, fontSize: 10, fontWeight: FontWeight.bold)),
                              ),
                            ]),
                          ])),
                        ]),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Metrological
                    _section('Metrological Characteristics', [
                      _row('Max Capacity', '${inst['maxCapacity']} kg'),
                      _row('Min Capacity', '${inst['minCapacity']} kg'),
                      _row('Scale Interval (e)', '${inst['verificationScaleInterval']} kg'),
                      _row('Display Resolution (d)', '${inst['displayResolution']} kg'),
                      _row('Intervals (n)', '${inst['numberOfIntervals']}'),
                    ]),
                    const SizedBox(height: 8),

                    // Specs
                    _section('Technical Specifications', [
                      _row('Instrument Type', inst['instrumentType']?.toString() ?? '—'),
                      _row('Load Cell', inst['loadCellInfo']?.toString() ?? '—'),
                      _row('Software Version', inst['softwareVersion']?.toString() ?? '—'),
                      _row('Firmware Version', inst['firmwareVersion']?.toString() ?? '—'),
                      _row('Power Supply', inst['powerSupply']?.toString() ?? '—'),
                      _row('Temp Range', '${inst['temperatureMin']}°C to ${inst['temperatureMax']}°C'),
                      _row('Humidity Range', '${inst['humidityMin']}%RH to ${inst['humidityMax']}%RH'),
                    ]),
                    const SizedBox(height: 16),

                    // Test History
                    Text('Test Session History (${_sessions.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 8),
                    if (_sessions.isEmpty)
                      const Card(child: Padding(padding: EdgeInsets.all(24), child: Center(child: Text('No test sessions yet', style: TextStyle(color: Color(0xFF94A3B8))))))
                    else
                      ...(_sessions.map((s) {
                        final session = s as Map<String, dynamic>;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(session['sessionId'] as String? ?? '', style: const TextStyle(fontFamily: 'monospace', fontSize: 13, fontWeight: FontWeight.bold)),
                            subtitle: Text(session['standardVersionId']?.toString() ?? '', style: const TextStyle(fontSize: 11)),
                            trailing: _statusChip(session['overallResult']?.toString() ?? 'pending'),
                            onTap: () => Navigator.push(context, MaterialPageRoute(
                              builder: (_) => TestSessionDetailScreen(sessionId: session['sessionId'] as String),
                            )),
                          ),
                        );
                      })),
                  ]),
                ),
      floatingActionButton: inst != null ? FloatingActionButton.extended(
        onPressed: () {
          // Navigate to new test session with this instrument pre-selected
          Navigator.push(context, MaterialPageRoute(
            builder: (_) => TestSessionDetailScreen(sessionId: 'SES-2024-DEMO01'),
          ));
        },
        icon: const Icon(Icons.science),
        label: const Text('Start Test'),
        backgroundColor: const Color(0xFFF59E0B),
      ) : null,
    );
  }

  Widget _section(String title, List<Widget> children) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F3460))),
        const SizedBox(height: 8),
        const Divider(height: 1),
        const SizedBox(height: 8),
        ...children,
      ]),
    ),
  );
}
