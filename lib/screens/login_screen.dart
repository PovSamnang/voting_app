
import 'package:flutter/material.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart'; 
import 'package:mobile_scanner/mobile_scanner.dart'; 
import 'package:voting_app/services/auth_service.dart';
import 'package:voting_app/screens/home_screen.dart'; 

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _idController = TextEditingController();
  final AuthService _authService = AuthService();
  
  XFile? _capturedFace;
  bool _isLoading = false;
  String? _errorMessage;
  String? _scannedName; // store name nak scan 

  @override
  void dispose() {
    _idController.dispose();
    super.dispose();
  }

  //QR Scanner 
  void _openQrScanner() {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    enableDrag: false,
    useSafeArea: false,
    backgroundColor: Colors.black,
    builder: (context) {
      return SizedBox(
        height: MediaQuery.of(context).size.height,
        child: Stack(
          children: [
            MobileScanner(
              fit: BoxFit.cover,
              onDetect: (capture) {
                final barcode = capture.barcodes.first;
                if (barcode.rawValue != null) {
                  Navigator.pop(context);
                  _processQrToken(barcode.rawValue!);
                }
              },
            ),

            //scan frame
            Center(
              child: Container(
                width: 260,
                height: 260,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.white, width: 5),
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),

            // 🔝 Close button
            Positioned(
              top: 40,
              left: 16,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 28),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      );
    },
  );
}

  Future<void> _processQrToken(String token) async {
    setState(() => _isLoading = true);

    // hav api who is this qr
    final userData = await _authService.resolveQrToken(token);

    setState(() => _isLoading = false);

    if (userData != null) {
      // ber sucess vea fill ID  automatic
      _idController.text = userData['id_number'];
      setState(() {
        _scannedName = userData['name'];
        _errorMessage = null;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Welcome ${userData['name']}! Please verify your face."),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      setState(() => _errorMessage = "Invalid or Unknown QR Code.");
    }
  }

  // camera face
  Future<void> _takeLivePhoto() async {
    final ImagePicker picker = ImagePicker();
    final XFile? photo = await picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.front,
      imageQuality: 40,
      maxWidth: 400,
      maxHeight: 400,
    );
    
    if (photo != null) {
      setState(() {
        _capturedFace = photo;
        _errorMessage = null; 
      });
    }
  }

  // ber ot torn input id or qr te need to alert 
  Future<void> _handleLogin() async {
    if (_idController.text.isEmpty) {
      setState(() => _errorMessage = 'Please enter ID or Scan QR Code.');
      return;
    }
    if (_capturedFace == null) {
      setState(() => _errorMessage = 'Please take a live photo first.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final resultMessage = await _authService.loginAndVerify(
      identificationValue: _idController.text,
      faceImage: _capturedFace!,
    );

    setState(() {
      _isLoading = false;
    });

    if (resultMessage == null) {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const HomeScreen()),
        );
      }
    } else {
      setState(() => _errorMessage = resultMessage);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Voter Login'),
        backgroundColor: Colors.blue.shade800,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            // qr button
            ElevatedButton.icon(
              onPressed: _openQrScanner,
              icon: const Icon(Icons.qr_code_scanner, size: 28),
              label: const Text("SCAN VOTER CARD"),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.indigo,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),

            const SizedBox(height: 20),
            Row(children: [
              Expanded(child: Divider(color: Colors.grey[400])),
              const Padding(padding: EdgeInsets.symmetric(horizontal: 10), child: Text("OR ENTER ID")),
              Expanded(child: Divider(color: Colors.grey[400])),
            ]),
            const SizedBox(height: 20),

            // it input
            TextField(
              controller: _idController,
              decoration: InputDecoration(
                labelText: 'National ID Number',
                helperText: _scannedName != null ? "Voter found: $_scannedName" : null,
                helperStyle: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                prefixIcon: const Icon(Icons.badge),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                filled: true,
                fillColor: Colors.grey.shade100,
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 25),

            // fae capture ui
            const Text(
              'Verify Face',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            
            Center(
              child: GestureDetector(
                onTap: _takeLivePhoto,
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: _capturedFace != null ? Colors.green : Colors.grey, 
                      width: 3
                    ),
                  ),
                  child: _capturedFace == null
                      ? const Icon(Icons.camera_alt, size: 60, color: Colors.grey)
                      : ClipOval(
                          child: Image.file(
                            File(_capturedFace!.path),
                            fit: BoxFit.cover,
                          ),
                        ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            const Center(child: Text("Tap circle to take photo", style: TextStyle(color: Colors.grey))),
            
            const SizedBox(height: 30),

            // Error Message
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              ),

            // login button
            SizedBox(
              height: 55,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton(
                      onPressed: _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green.shade700,
                        foregroundColor: Colors.white,
                        elevation: 5,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text(
                        'LOGIN',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}