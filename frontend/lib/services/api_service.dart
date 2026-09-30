import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Default to localhost for dev; override via env/config
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.74.204.48:3000',
  );

  final SharedPreferences _prefs;
  ApiService(this._prefs);

  String? get token => _prefs.getString('nawi_token');

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) throw Exception(data['error'] ?? 'Login failed');
    await _prefs.setString('nawi_token', data['token'] as String);
    await _prefs.setString('nawi_user', jsonEncode(data['user']));
    return data;
  }

  Future<Map<String, dynamic>> getInstrument(String id) async {
    final res = await http.get(Uri.parse('$baseUrl/api/instruments/$id'), headers: _headers);
    if (res.statusCode != 200) throw Exception('Instrument not found');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getInstruments({String? search}) async {
    final uri = Uri.parse('$baseUrl/api/instruments').replace(
      queryParameters: {if (search != null && search.isNotEmpty) 'search': search},
    );
    final res = await http.get(uri, headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createTestSession({
    required String instrumentId,
    required Map<String, dynamic> environmentalConditions,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/test-sessions'),
      headers: _headers,
      body: jsonEncode({
        'instrumentId': instrumentId,
        'environmentalConditions': environmentalConditions,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 201) throw Exception(data['error'] ?? 'Failed to create session');
    return data;
  }

  Future<Map<String, dynamic>> getTestSession(String sessionId) async {
    final res = await http.get(Uri.parse('$baseUrl/api/test-sessions/$sessionId'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> submitObservations({
    required String sessionId,
    required String testModuleId,
    required Map<String, dynamic> observations,
    String? notes,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/test-sessions/$sessionId'),
      headers: _headers,
      body: jsonEncode({
        'testModuleId': testModuleId,
        'observations': observations,
        if (notes != null) 'notes': notes,
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) throw Exception(data['error'] ?? 'Submission failed');
    return data;
  }

  Future<Map<String, dynamic>> sessionAction(String sessionId, String action) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/api/test-sessions/$sessionId'),
      headers: _headers,
      body: jsonEncode({'action': action}),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) throw Exception(data['error'] ?? 'Action failed');
    return data;
  }

  Future<Map<String, dynamic>> getRules() async {
    final res = await http.get(Uri.parse('$baseUrl/api/rules'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getDashboard() async {
    final res = await http.get(Uri.parse('$baseUrl/api/dashboard'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getReports() async {
    final res = await http.get(Uri.parse('$baseUrl/api/reports'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
