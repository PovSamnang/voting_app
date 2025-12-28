
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  // IP yok tam computer bos yg p'tol
  final String _baseUrl = 'http://172.20.10.5:3000/api';

  Future<String> _imageToBase64(XFile imageFile) async {
    List<int> imageBytes = await imageFile.readAsBytes();
    return base64Encode(imageBytes);
  }

  // resolve pi qr tv jea user info
  Future<Map<String, dynamic>?> resolveQrToken(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/lookup-qr/$token'),
      );

      if (response.statusCode == 200) {
        // return id, name...
        return json.decode(response.body);
      } else {
        return null;
      }
    } catch (e) {
      print('QR Lookup error: $e');
      return null;
    }
  }

  // Login with Face Verify 
  Future<String?> loginAndVerify({
    required String identificationValue, 
    required XFile faceImage,
  }) async {
    try {
      final String faceBase64 = await _imageToBase64(faceImage);

      final response = await http.post(
        Uri.parse('$_baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'identifier': identificationValue,
          'face_base64': faceBase64,
        }),
      );

      if (response.statusCode == 200) {
        final responseBody = json.decode(response.body);
        final String token = responseBody['token'];
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('authToken', token);
        
        return null; // Success
      } else {
        final responseBody = json.decode(response.body);
        return responseBody['message'] ?? 'Login failed.';
      }
    } catch (e) {
      print('Error during login: $e');
      return 'Network or server error.';
    }
  }
}