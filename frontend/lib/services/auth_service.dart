import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService extends ChangeNotifier {
  final SharedPreferences _prefs;
  Map<String, dynamic>? _user;

  AuthService(this._prefs) {
    final raw = _prefs.getString('nawi_user');
    if (raw != null) {
      try { _user = jsonDecode(raw) as Map<String, dynamic>; } catch (_) {}
    }
  }

  bool get isLoggedIn => _user != null && _prefs.containsKey('nawi_token');
  Map<String, dynamic>? get user => _user;
  String? get token => _prefs.getString('nawi_token');
  String get role => (_user?['role'] as String?) ?? '';
  String get name => (_user?['name'] as String?) ?? '';

  void setUser(Map<String, dynamic> userData, String token) {
    _user = userData;
    _prefs.setString('nawi_user', jsonEncode(userData));
    _prefs.setString('nawi_token', token);
    notifyListeners();
  }

  Future<void> logout() async {
    _user = null;
    await _prefs.remove('nawi_user');
    await _prefs.remove('nawi_token');
    notifyListeners();
  }
}
