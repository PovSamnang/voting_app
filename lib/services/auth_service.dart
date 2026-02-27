import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  final String _baseUrl = 'http://172.20.10.5:3000/api';

  // =========================
  // Existing helper (keep)
  // =========================
  Future<String> _imageToBase64(XFile imageFile) async {
    final bytes = await imageFile.readAsBytes();
    return base64Encode(bytes);
  }

  // ✅ NEW: get saved JWT
  Future<String?> _getAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('authToken');
  }

  // ✅ NEW: common JSON headers (with optional JWT)
  Future<Map<String, String>> _headers({bool withAuth = false}) async {
    final h = <String, String>{'Content-Type': 'application/json'};
    if (withAuth) {
      final token = await _getAuthToken();
      if (token != null && token.isNotEmpty) {
        h['Authorization'] = 'Bearer $token';
      }
    }
    return h;
  }

  // =========================
  // QR resolve (keep)
  // =========================
  Future<Map<String, dynamic>?> resolveQrToken(String token) async {
    try {
      final response = await http.get(Uri.parse('$_baseUrl/lookup-qr/$token'));
      if (response.statusCode == 200) return json.decode(response.body);
      return null;
    } catch (_) {
      return null;
    }
  }

  // =========================
  // Liveness (keep)
  // =========================
  Future<bool> verifyLivenessFromBackendBase64(String faceBase64) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/face/liveness'),
        headers: await _headers(withAuth: false),
        body: json.encode({'face_base64': faceBase64}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['is_live'] == true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  // =========================
  // ✅ Login flow (DO NOT CHANGE)
  // =========================
  Future<String?> loginAndVerify({
    required String identificationValue,
    required String faceImagePath,
    required bool livenessPassed,
  }) async {
    final bytes = await File(faceImagePath).readAsBytes();
    final faceBase64 = base64Encode(bytes);

    final response = await http.post(
      Uri.parse('$_baseUrl/login'),
      headers: await _headers(withAuth: false),
      body: json.encode({
        'identifier': identificationValue,
        'face_base64': faceBase64,
        'liveness_passed': livenessPassed,
      }),
    );

    if (response.statusCode == 200) {
      final body = json.decode(response.body);
      final token = body['token'];

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('authToken', token);

      return null;
    }

    // safe decode (backend always returns json but just in case)
    try {
      final body = json.decode(response.body);
      return body['message'] ?? 'Login failed.';
    } catch (_) {
      return 'Login failed.';
    }
  }

  // =========================
  // ✅ NEW: Fetch candidates (auto show)
  // Backend route: GET /api/candidates (requires JWT)
  // =========================
  Future<List<dynamic>> getCandidates() async {
    try {
      final jwt = await _getAuthToken();
      if (jwt == null || jwt.isEmpty) return [];

      final response = await http.get(
        Uri.parse('$_baseUrl/candidates'),
        headers: await _headers(withAuth: true),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List) return data;
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  // =========================
  // ✅ NEW: Vote with Gmail token
  // Backend route: POST /api/vote (requires JWT)
  // Body: { token: "0x...", candidate_id: 1 }
  // Returns null if success, otherwise error message
  // =========================
  Future<String?> vote({
    required String votingTokenFromEmail,
    required int candidateId,
  }) async {
    try {
      final jwt = await _getAuthToken();
      if (jwt == null || jwt.isEmpty) return "Not logged in";

      final response = await http.post(
        Uri.parse('$_baseUrl/vote'),
        headers: await _headers(withAuth: true),
        body: json.encode({
          'token': votingTokenFromEmail.trim(),
          'candidate_id': candidateId,
        }),
      );

      if (response.statusCode == 200) return null;

      // backend sends json {message: "..."}
      try {
        final body = json.decode(response.body);
        return body['message'] ?? 'Vote failed.';
      } catch (_) {
        return 'Vote failed.';
      }
    } catch (_) {
      return "Vote failed (network error)";
    }
  }

  // ✅ Optional helper: logout (doesn't affect login flow)
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('authToken');
  }
}