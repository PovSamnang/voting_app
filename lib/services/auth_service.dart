import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  final String _baseUrl = 'http://172.20.10.5:3000/api';

  Future<String> _imageToBase64(XFile imageFile) async {
    final bytes = await imageFile.readAsBytes();
    return base64Encode(bytes);
  }

  // QR resolve
  Future<Map<String, dynamic>?> resolveQrToken(String token) async {
    try {
      final response = await http.get(Uri.parse('$_baseUrl/lookup-qr/$token'));
      if (response.statusCode == 200) return json.decode(response.body);
      return null;
    } catch (e) {
      return null;
    }
  }

  // ✅ call backend liveness
  Future<bool> verifyLivenessFromBackendBase64(String faceBase64) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/face/liveness'),
        headers: {'Content-Type': 'application/json'},
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

  // ✅ Login with face + liveness flag
  Future<String?> loginAndVerify({
    required String identificationValue,
    required String faceImagePath,
    required bool livenessPassed,
  }) async {
    final bytes = await File(faceImagePath).readAsBytes();
    final faceBase64 = base64Encode(bytes);

    final response = await http.post(
      Uri.parse('$_baseUrl/login'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'identifier': identificationValue,
        'face_base64': faceBase64,
        'liveness_passed': livenessPassed, // ✅ FIX
      }),
    );

    if (response.statusCode == 200) {
      final body = json.decode(response.body);
      final token = body['token'];

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('authToken', token);

      return null;
    }

    final body = json.decode(response.body);
    return body['message'] ?? 'Login failed.';
  }
}
