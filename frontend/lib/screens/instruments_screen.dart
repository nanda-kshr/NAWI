import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/local_db_service.dart';
import '../services/sync_service.dart';
import 'instrument_detail_screen.dart';

class InstrumentsScreen extends StatefulWidget {
  const InstrumentsScreen({super.key});

  @override
  State<InstrumentsScreen> createState() => _InstrumentsScreenState();
}

class _InstrumentsScreenState extends State<InstrumentsScreen> {
  List<Map<String, dynamic>> _instruments = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final sync = context.read<SyncService>();
    if (sync.isOnline) {
      try {
        final api = context.read<ApiService>();
        final data = await api.getInstruments(search: _search.isEmpty ? null : _search);
        final list = (data['instruments'] as List).cast<Map<String, dynamic>>();
        for (final inst in list) await LocalDbService.instance.upsertInstrument(inst);
        setState(() { _instruments = list; _loading = false; });
        return;
      } catch (_) {}
    }
    // Fallback to local
    final local = await LocalDbService.instance.getInstruments();
    setState(() { _instruments = local; _loading = false; });
  }

  Widget _statusBadge(String status) {
    final colors = {'active': Colors.green, 'under_test': Colors.orange, 'archived': Colors.grey};
    final c = colors[status] ?? Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(status.replaceAll('_', ' '), style: TextStyle(color: c, fontSize: 10, fontWeight: FontWeight.w600)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: TextField(
            onChanged: (v) { _search = v; _load(); },
            decoration: const InputDecoration(
              hintText: 'Search by ID, serial, manufacturer...',
              prefixIcon: Icon(Icons.search, size: 20),
              isDense: true,
              contentPadding: EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _instruments.isEmpty
                  ? Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.scale_outlined, size: 64, color: Color(0xFFCBD5E1)),
                        const SizedBox(height: 12),
                        const Text('No instruments found', style: TextStyle(color: Color(0xFF64748B), fontSize: 16)),
                        const SizedBox(height: 8),
                        ElevatedButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Refresh')),
                      ]),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _instruments.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final inst = _instruments[i];
                          return Card(
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () => Navigator.push(context, MaterialPageRoute(
                                builder: (_) => InstrumentDetailScreen(instrumentId: inst['instrumentId'] as String),
                              )).then((_) => _load()),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 44, height: 44,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF59E0B).withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Center(child: Icon(Icons.scale, color: Color(0xFFF59E0B), size: 22)),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                        Row(children: [
                                          Text(inst['instrumentId'] as String? ?? '', style: const TextStyle(fontFamily: 'monospace', fontSize: 12, color: Color(0xFFF59E0B), fontWeight: FontWeight.bold)),
                                          const SizedBox(width: 8),
                                          _statusBadge(inst['status'] as String? ?? 'active'),
                                        ]),
                                        const SizedBox(height: 3),
                                        Text('${inst['manufacturer']} ${inst['model']}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                        Text('SN: ${inst['serialNumber']}  ·  Class ${inst['accuracyClass']}  ·  Max ${inst['maxCapacity']} kg', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                                      ]),
                                    ),
                                    const Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }
}
