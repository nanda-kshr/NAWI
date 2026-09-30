import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  void _fillDemo(String role) {
    final map = {
      'admin': ['admin@nawi.demo', 'demo1234'],
      'technician': ['tech@nawi.demo', 'demo1234'],
      'reviewer': ['reviewer@nawi.demo', 'demo1234'],
      'approver': ['approver@nawi.demo', 'demo1234'],
    };
    _emailCtrl.text = map[role]![0];
    _passCtrl.text = map[role]![1];
  }

  Future<void> _login() async {
    setState(() { _loading = true; _error = null; });
    try {
      final api = context.read<ApiService>();
      final auth = context.read<AuthService>();
      final data = await api.login(_emailCtrl.text.trim(), _passCtrl.text.trim());
      auth.setUser(data['user'] as Map<String, dynamic>, data['token'] as String);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F3460),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),
              // Logo
              Row(children: [
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(color: const Color(0xFFF59E0B), borderRadius: BorderRadius.circular(12)),
                  child: const Center(child: Text('N', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold))),
                ),
                const SizedBox(width: 14),
                const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('NAWI Platform', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                  Text('OIML R76 Type Evaluation', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                ]),
              ]),
              const SizedBox(height: 40),
              const Text('Sign in', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text('Access your evaluation workspace', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 15)),
              const SizedBox(height: 32),

              // Demo quick login
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withOpacity(0.1),
                  border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.3)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(children: [
                      Text('🔬', style: TextStyle(fontSize: 16)),
                      SizedBox(width: 8),
                      Text('DEMO MODE', style: TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1)),
                    ]),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8, runSpacing: 8,
                      children: ['admin', 'technician', 'reviewer', 'approver'].map((role) => GestureDetector(
                        onTap: () { setState(() => _fillDemo(role)); },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(8)),
                          child: Text(role, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                        ),
                      )).toList(),
                    ),
                    const SizedBox(height: 8),
                    const Text('Password: demo1234', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Form
              _fieldLabel('Email address'),
              const SizedBox(height: 6),
              _darkField(controller: _emailCtrl, hint: 'user@nawi.demo', keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 16),
              _fieldLabel('Password'),
              const SizedBox(height: 6),
              _darkField(controller: _passCtrl, hint: '••••••••', obscure: true),
              const SizedBox(height: 16),

              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.red.withOpacity(0.1), border: Border.all(color: Colors.red.withOpacity(0.3)), borderRadius: BorderRadius.circular(8)),
                  child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                ),
              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _login,
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Sign in to NAWI Platform'),
                ),
              ),
              const SizedBox(height: 24),
              const Center(child: Text('NAWI Platform v1.0 · OIML R 76-1:2006', style: TextStyle(color: Color(0xFF475569), fontSize: 11))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _fieldLabel(String label) => Text(label, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, fontWeight: FontWeight.w500));

  Widget _darkField({required TextEditingController controller, required String hint, bool obscure = false, TextInputType? keyboardType}) =>
    TextField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF64748B)),
        fillColor: const Color(0xFF1E293B),
        filled: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF334155))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF334155))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFF59E0B), width: 2)),
      ),
    );

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }
}
