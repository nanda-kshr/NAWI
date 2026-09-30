import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'dart:async';

/// AR-assisted test guidance screen.
/// Uses camera as background with AR-style overlays to guide the technician.
/// Full AR object recognition requires platform-specific plugins;
/// this implements the robust fallback (camera + contextual overlays).
class ArAssistantScreen extends StatefulWidget {
  final Map<String, dynamic> instrument;
  const ArAssistantScreen({super.key, required this.instrument});

  @override
  State<ArAssistantScreen> createState() => _ArAssistantScreenState();
}

class _ArAssistantScreenState extends State<ArAssistantScreen> with TickerProviderStateMixin {
  CameraController? _cam;
  bool _camReady = false;
  int _step = 0;
  late AnimationController _pulseCtrl;
  late Animation<double> _pulse;
  late List<Map<String, dynamic>> _steps;



  double _getTestLoad() {
    final max = (widget.instrument['maxCapacity'] as num?)?.toDouble() ?? 150;
    return max * 0.5; // 50% of max as typical test load
  }

  @override
  void initState() {
    super.initState();
    _steps = [
      { 'icon': '🔍', 'instruction': 'GENERAL EXAMINATION', 'detail': 'Inspect markings, nameplate, construction', 'color': 0xFF3B82F6, 'action': 'Proceed when complete' },
      { 'icon': '⚖️', 'instruction': 'ZERO INDICATION', 'detail': 'Ensure platform is clear and stable', 'color': 0xFF8B5CF6, 'action': 'Record zero display reading' },
      { 'icon': '🏋️', 'instruction': 'PLACE TEST LOAD', 'detail': 'Expected: ${_getTestLoad().toStringAsFixed(2)} kg\nPosition centrally on platform', 'color': 0xFFF59E0B, 'action': 'Record indicated weight' },
      { 'icon': '🔄', 'instruction': 'REPEATABILITY', 'detail': 'Remove and re-apply the same load 6 times', 'color': 0xFF10B981, 'action': 'Record each indication' },
      { 'icon': '↗️', 'instruction': 'ECCENTRICITY TEST', 'detail': 'Move load to front / back / left / right positions', 'color': 0xFFEC4899, 'action': 'Record indication per position' },
      { 'icon': '✅', 'instruction': 'TESTS COMPLETE', 'detail': 'All required observations recorded.\nReturn to app to submit for review.', 'color': 0xFF16A34A, 'action': 'Done' },
    ];
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);
    _pulse = Tween(begin: 0.85, end: 1.15).animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) return;
      _cam = CameraController(cameras.first, ResolutionPreset.medium);
      await _cam!.initialize();
      if (mounted) setState(() => _camReady = true);
    } catch (_) {
      // Camera unavailable — show without camera background
    }
  }

  @override
  Widget build(BuildContext context) {
    final step = _steps[_step.clamp(0, _steps.length - 1)];
    final color = Color(step['color'] as int);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Camera background
          if (_camReady && _cam != null)
            CameraPreview(_cam!)
          else
            Container(color: const Color(0xFF0F1729)),

          // Dark overlay
          Container(color: Colors.black.withOpacity(0.4)),

          // Main content
          SafeArea(
            child: Column(
              children: [
                // Top bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(children: [
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                        child: const Icon(Icons.close, color: Colors.white, size: 20),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('AR TEST ASSISTANT', style: TextStyle(color: Colors.white, fontSize: 11, letterSpacing: 2, fontWeight: FontWeight.bold)),
                      Text('${widget.instrument['manufacturer']} ${widget.instrument['model']}', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
                    ])),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: color.withOpacity(0.2), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withOpacity(0.5))),
                      child: Text('Step ${_step + 1}/${_steps.length}', style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ]),
                ),

                const Spacer(),

                // Central pulsing target
                ScaleTransition(
                  scale: _pulse,
                  child: Container(
                    width: 160, height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: color, width: 3),
                      color: color.withOpacity(0.1),
                    ),
                    child: Center(child: Text(step['icon'] as String, style: const TextStyle(fontSize: 64))),
                  ),
                ),

                const SizedBox(height: 24),

                // Corner crosshairs
                ..._buildCrosshairs(color),

                const Spacer(),

                // Instruction card
                Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.75),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: color.withOpacity(0.5), width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(step['instruction'] as String, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1)),
                      const SizedBox(height: 8),
                      Text(step['detail'] as String, style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.5)),
                      const SizedBox(height: 16),

                      // Progress dots
                      Row(children: List.generate(_steps.length, (i) => Container(
                        width: i == _step ? 20 : 6, height: 6,
                        margin: const EdgeInsets.only(right: 4),
                        decoration: BoxDecoration(
                          color: i <= _step ? color : Colors.white.withOpacity(0.3),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ))),
                      const SizedBox(height: 16),

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _step < _steps.length - 1
                              ? () => setState(() => _step++)
                              : () => Navigator.pop(context),
                          style: ElevatedButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white),
                          child: Text(step['action'] as String),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildCrosshairs(Color color) => []; // Simplified for brevity

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _cam?.dispose();
    super.dispose();
  }
}
