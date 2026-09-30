import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'dart:convert';
import 'instrument_detail_screen.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final _controller = MobileScannerController();
  bool _scanned = false;

  void _onDetect(BarcodeCapture capture) {
    if (_scanned) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;
    _scanned = true;

    try {
      final data = jsonDecode(barcode!.rawValue!) as Map<String, dynamic>;
      final instrumentId = data['instrumentId'] as String?;
      if (instrumentId != null && mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => InstrumentDetailScreen(instrumentId: instrumentId)),
        ).then((_) => setState(() => _scanned = false));
        return;
      }
    } catch (_) {}

    // Raw text fallback — treat as instrumentId
    final raw = barcode!.rawValue!;
    if (raw.startsWith('NAWI-') && mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => InstrumentDetailScreen(instrumentId: raw)),
      ).then((_) => setState(() => _scanned = false));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unrecognized QR: $raw'), backgroundColor: Colors.orange),
      );
      Future.delayed(const Duration(seconds: 2), () => setState(() => _scanned = false));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        MobileScanner(controller: _controller, onDetect: _onDetect),
        // Overlay
        Positioned.fill(
          child: Column(
            children: [
              // Top info bar
              Container(
                color: const Color(0xFF0F3460).withOpacity(0.85),
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
                child: const Column(children: [
                  Icon(Icons.qr_code_scanner, color: Colors.white, size: 32),
                  SizedBox(height: 8),
                  Text('Scan NAWI Instrument QR', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                  Text('Point camera at the QR label on the instrument', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                ]),
              ),
              const Spacer(),
              // Scan frame guide
              Center(
                child: Container(
                  width: 240, height: 240,
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFF59E0B), width: 3),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
              const Spacer(),
              Container(
                color: const Color(0xFF0F3460).withOpacity(0.85),
                padding: const EdgeInsets.all(20),
                width: double.infinity,
                child: const Text(
                  'Scanning will automatically open instrument profile\nand show complete test history',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
              ),
            ],
          ),
        ),
        // Scanned indicator
        if (_scanned)
          const Center(child: CircularProgressIndicator(color: Color(0xFFF59E0B))),
      ],
    );
  }

  @override
  void dispose() { _controller.dispose(); super.dispose(); }
}
