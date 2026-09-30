import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class TestSessionDetailScreen extends StatefulWidget {
  final String sessionId;
  const TestSessionDetailScreen({super.key, required this.sessionId});

  @override
  State<TestSessionDetailScreen> createState() => _TestSessionDetailScreenState();
}

class _TestSessionDetailScreenState extends State<TestSessionDetailScreen> {
  Map<String, dynamic>? _session;
  List<dynamic> _results = [];
  List<dynamic> _modules = [];
  Map<String, dynamic>? _instrument;
  bool _loading = true;
  String? _activeModule;
  final Map<String, Map<String, TextEditingController>> _controllers = {};
  bool _submitting = false;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiService>();
      final [sessionData, rulesData] = await Future.wait([
        api.getTestSession(widget.sessionId),
        api.getRules(),
      ]);
      setState(() {
        _session = sessionData['session'] as Map<String, dynamic>?;
        _results = sessionData['results'] as List? ?? [];
        _instrument = sessionData['instrument'] as Map<String, dynamic>?;
        _modules = rulesData['modules'] as List? ?? [];
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _submit(String moduleId) async {
    setState(() => _submitting = true);
    final ctrls = _controllers[moduleId] ?? {};
    final obs = <String, dynamic>{};
    for (final e in ctrls.entries) {
      final v = e.value.text.trim();
      obs[e.key] = double.tryParse(v) ?? v;
    }
    try {
      await context.read<ApiService>().submitObservations(
        sessionId: widget.sessionId,
        testModuleId: moduleId,
        observations: obs,
      );
      await _load();
      setState(() { _activeModule = null; _submitting = false; });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✅ Observations submitted & calculated'), backgroundColor: Colors.green),
      );
    } catch (e) {
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Widget _statusChip(String s) {
    const colors = {'pass': Colors.green, 'fail': Colors.red, 'pending': Colors.orange,
      'not_applicable': Colors.grey, 'approved': Colors.green};
    final c = colors[s] ?? Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(20), border: Border.all(color: c.withOpacity(0.3))),
      child: Text(s.replaceAll('_', ' ').toUpperCase(), style: TextStyle(color: c, fontSize: 10, fontWeight: FontWeight.w800)),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return Scaffold(appBar: AppBar(title: const Text('Test Session')), body: const Center(child: CircularProgressIndicator()));

    final sess = _session;
    final inst = _instrument;
    final isLocked = ['approved', 'completed'].contains(sess?['status']);

    final passCount = _results.where((r) => (r as Map)['status'] == 'pass').length;
    final failCount = _results.where((r) => (r as Map)['status'] == 'fail').length;
    final pendingCount = _results.where((r) => (r as Map)['status'] == 'pending').length;

    return Scaffold(
      appBar: AppBar(
        title: Text(sess?['sessionId']?.toString() ?? 'Session', style: const TextStyle(fontFamily: 'monospace', fontSize: 14)),
        actions: [
          if (sess?['status'] == 'in_progress')
            TextButton.icon(
              onPressed: pendingCount > 0 ? null : () async {
                await context.read<ApiService>().sessionAction(widget.sessionId, 'submit');
                await _load();
              },
              icon: const Icon(Icons.send, color: Colors.white, size: 18),
              label: const Text('Submit', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: Column(
        children: [
          // Status bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                if (inst != null) Expanded(child: Text('${inst['manufacturer']} ${inst['model']} · ${inst['instrumentId']}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)))),
                _statusChip(sess?['status']?.toString() ?? ''),
                const SizedBox(width: 6),
                _statusChip(sess?['overallResult']?.toString() ?? 'pending'),
              ]),
              const SizedBox(height: 8),
              // Progress bar
              LinearProgressIndicator(
                value: _results.isEmpty ? 0 : (_results.length - pendingCount) / _results.length,
                backgroundColor: const Color(0xFFE2E8F0),
                color: failCount > 0 ? Colors.red : const Color(0xFFF59E0B),
                minHeight: 6,
                borderRadius: BorderRadius.circular(4),
              ),
              const SizedBox(height: 6),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('${_results.length - pendingCount}/${_results.length} complete', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                Row(children: [
                  Text('✓ $passCount', style: const TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 10),
                  Text('✗ $failCount', style: const TextStyle(fontSize: 11, color: Colors.red, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 10),
                  Text('◷ $pendingCount', style: const TextStyle(fontSize: 11, color: Colors.orange, fontWeight: FontWeight.bold)),
                ]),
              ]),
            ]),
          ),
          // Module list + form
          Expanded(
            child: Row(
              children: [
                // Left: module list
                SizedBox(
                  width: 160,
                  child: Container(
                    color: const Color(0xFFF8FAFC),
                    child: ListView.builder(
                      itemCount: _results.length,
                      itemBuilder: (_, i) {
                        final result = _results[i] as Map<String, dynamic>;
                        final moduleId = result['testModuleId'] as String;
                        final status = result['status'] as String;
                        final isActive = _activeModule == moduleId;
                        final dot = status == 'pass' ? Colors.green : status == 'fail' ? Colors.red : Colors.grey;
                        return InkWell(
                          onTap: () => setState(() => _activeModule = isActive ? null : moduleId),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: isActive ? const Color(0xFFFFF7ED) : null,
                              border: isActive ? const Border(left: BorderSide(color: Color(0xFFF59E0B), width: 3)) : null,
                            ),
                            child: Row(children: [
                              Container(width: 8, height: 8, decoration: BoxDecoration(color: dot, shape: BoxShape.circle)),
                              const SizedBox(width: 8),
                              Expanded(child: Text(
                                (result['testModuleName'] as String).replaceAll(' Test', '').replaceAll('General Examination', 'General'),
                                style: TextStyle(fontSize: 11, fontWeight: isActive ? FontWeight.bold : FontWeight.normal),
                                maxLines: 2,
                              )),
                            ]),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                const VerticalDivider(width: 1),
                // Right: observation form / results
                Expanded(
                  child: _activeModule == null
                      ? const Center(child: Text('Select a test module to enter observations', style: TextStyle(color: Color(0xFF94A3B8)), textAlign: TextAlign.center))
                      : Builder(builder: (_) {
                          final result = _results.firstWhere((r) => (r as Map)['testModuleId'] == _activeModule, orElse: () => <String, dynamic>{}) as Map<String, dynamic>;
                          final moduleDef = _modules.firstWhere((m) => (m as Map)['id'] == _activeModule, orElse: () => <String, dynamic>{}) as Map<String, dynamic>;
                          final fields = (moduleDef['observationFields'] as List? ?? []).cast<Map<String, dynamic>>();
                          final calcs = (result['calculations'] as List? ?? []).cast<Map<String, dynamic>>();
                          final obs = (result['observations'] as List? ?? []).cast<Map<String, dynamic>>();
                          if (!_controllers.containsKey(_activeModule)) {
                            _controllers[_activeModule!] = { for (final f in fields) f['key'] as String: TextEditingController() };
                          }
                          return SingleChildScrollView(
                            padding: const EdgeInsets.all(16),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(result['testModuleName']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              Text(result['standardReference']?.toString() ?? '', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                              const SizedBox(height: 4),
                              _statusChip(result['status']?.toString() ?? 'pending'),
                              const SizedBox(height: 16),

                              // Existing observations
                              if (obs.isNotEmpty) ...[
                                const Text('Recorded Observations', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF64748B))),
                                const SizedBox(height: 8),
                                Wrap(spacing: 8, runSpacing: 8, children: obs.map((o) => Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                                    Text(o['label']?.toString() ?? '', style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                                    Text('${o['value']} ${o['unit']}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 13)),
                                  ]),
                                )).toList()),
                                const SizedBox(height: 12),
                              ],

                              // Calculation results
                              if (calcs.isNotEmpty) ...[
                                const Text('Calculation Results', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF64748B))),
                                const SizedBox(height: 8),
                                ...calcs.map((c) {
                                  final pf = c['passFail'] as String? ?? 'pending';
                                  final isPass = pf == 'pass';
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: isPass ? Colors.green.withOpacity(0.05) : Colors.red.withOpacity(0.05),
                                      border: Border.all(color: (isPass ? Colors.green : Colors.red).withOpacity(0.3)),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                                        Expanded(child: Text(c['formula']?.toString() ?? '', style: const TextStyle(fontFamily: 'monospace', fontSize: 10, color: Color(0xFF64748B)))),
                                        _statusChip(pf),
                                      ]),
                                      const SizedBox(height: 8),
                                      Row(children: [
                                        _calcVal('Result', c['result']),
                                        if (c['permissibleError'] != null) _calcVal('MPE ±', c['permissibleError']),
                                        if (c['actualError'] != null) _calcVal('Error', c['actualError']),
                                      ]),
                                      if (c['notes'] != null && (c['notes'] as String).isNotEmpty)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 4),
                                          child: Text(c['notes'] as String, style: const TextStyle(fontSize: 9, color: Color(0xFFF59E0B), fontStyle: FontStyle.italic)),
                                        ),
                                    ]),
                                  );
                                }),
                                const SizedBox(height: 12),
                              ],

                              // Entry form
                              if (!isLocked && fields.isNotEmpty) ...[
                                const Text('Enter Observations', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF64748B))),
                                const SizedBox(height: 8),
                                ...fields.map((field) {
                                  final ctrl = _controllers[_activeModule]?[field['key'] as String] ?? TextEditingController();
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 10),
                                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                      Row(children: [
                                        Text(field['label'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                                        if (field['required'] == true) const Text(' *', style: TextStyle(color: Colors.red, fontSize: 12)),
                                        if (field['unit'] != null && (field['unit'] as String).isNotEmpty)
                                          Text('  (${field['unit']})', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                                      ]),
                                      if (field['description'] != null && (field['description'] as String).isNotEmpty)
                                        Text(field['description'] as String, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontStyle: FontStyle.italic)),
                                      const SizedBox(height: 4),
                                      TextField(
                                        controller: ctrl,
                                        keyboardType: field['type'] == 'number' ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
                                        style: const TextStyle(fontFamily: 'monospace'),
                                        decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                                      ),
                                    ]),
                                  );
                                }),
                                const SizedBox(height: 8),
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    onPressed: _submitting ? null : () => _submit(_activeModule!),
                                    icon: _submitting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.bolt),
                                    label: Text(_submitting ? 'Calculating...' : '⚡ Submit & Calculate'),
                                  ),
                                ),
                              ],
                            ]),
                          );
                        }),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _calcVal(String label, dynamic val) => Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: const TextStyle(fontSize: 9, color: Color(0xFF94A3B8))),
    Text(val is num ? val.toStringAsFixed(4) : val.toString(), style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 12)),
  ]));

  @override
  void dispose() {
    for (final m in _controllers.values) for (final c in m.values) c.dispose();
    super.dispose();
  }
}
