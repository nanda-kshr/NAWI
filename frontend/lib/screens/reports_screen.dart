import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  List<dynamic> _reports = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiService>();
      final data = await api.getReports();
      setState(() { _reports = data['reports'] as List? ?? []; _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  Widget _conclusion(String c) {
    const colors = {'approved': Colors.green, 'rejected': Colors.red, 'conditional': Colors.orange};
    final color = colors[c] ?? Colors.grey;
    final icon = c == 'approved' ? '✅' : c == 'rejected' ? '❌' : '⚠️';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
      child: Text('$icon $c', style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const Center(child: CircularProgressIndicator())
        : _reports.isEmpty
            ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.description_outlined, size: 64, color: Color(0xFFCBD5E1)),
                const SizedBox(height: 12),
                const Text('No reports yet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                const SizedBox(height: 8),
                ElevatedButton(onPressed: _load, child: const Text('Refresh')),
              ]))
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _reports.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final r = _reports[i] as Map<String, dynamic>;
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                            Text(r['reportNumber']?.toString() ?? '', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFFF59E0B))),
                            Text('Rev. ${r['revisionNumber']}', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                          ]),
                          const SizedBox(height: 6),
                          Text('Instrument: ${r['instrumentId']}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontFamily: 'monospace')),
                          Text('By: ${r['technicianName'] ?? '—'}  ·  ${r['createdAt'] != null ? r['createdAt'].toString().substring(0, 10) : ''}', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                          const SizedBox(height: 10),
                          Row(children: [
                            if (r['overallConclusion'] != null) _conclusion(r['overallConclusion'] as String),
                            const SizedBox(width: 8),
                            if (r['status'] == 'finalized')
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                                child: const Text('FINALIZED', style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold)),
                              ),
                          ]),
                        ]),
                      ),
                    );
                  },
                ),
              );
  }
}
