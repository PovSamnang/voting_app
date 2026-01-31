import 'dart:io';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:voting_app/screens/face_liveness_screen.dart';
import 'package:voting_app/screens/home_screen.dart';
import 'package:voting_app/services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _idController = TextEditingController();
  final AuthService _authService = AuthService();

  // Face
  File? _capturedFace;
  bool _livenessPassed = false;
  bool get _isFaceVerified => _capturedFace != null && _livenessPassed;

  // UI
  bool _isLoading = false;
  String? _errorMessage;
  String? _scannedName;

  // QR
  late final MobileScannerController _qrController;
  bool _isHandlingScan = false;

  @override
  void initState() {
    super.initState();

    _qrController = MobileScannerController(
      facing: CameraFacing.back,
      detectionSpeed: DetectionSpeed.noDuplicates,
      autoStart: false,
      torchEnabled: false,
    );
  }

  @override
  void dispose() {
    _idController.dispose();
    _qrController.dispose();
    super.dispose();
  }

  void _hideKeyboard() => FocusManager.instance.primaryFocus?.unfocus();

  // =========================
  // QR Scan
  // =========================
  Future<void> _openQrScanner() async {
    _hideKeyboard();
    _isHandlingScan = false;

    if (!mounted) return;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      enableDrag: false,
      useSafeArea: true,
      backgroundColor: Colors.black,
      builder: (sheetContext) {
        WidgetsBinding.instance.addPostFrameCallback((_) async {
          try {
            await _qrController.start();
          } catch (e) {
            debugPrint("QR start error: $e");
          }
        });

        return WillPopScope(
          onWillPop: () async {
            await _stopQr();
            return true;
          },
          child: SizedBox(
            height: MediaQuery.of(sheetContext).size.height,
            child: LayoutBuilder(
              builder: (context, constraints) {
                const scanSize = 270.0;
                final scanRect = Rect.fromCenter(
                  center: Offset(constraints.maxWidth / 2, constraints.maxHeight / 2),
                  width: scanSize,
                  height: scanSize,
                );

                return Stack(
                  children: [
                    MobileScanner(
                      controller: _qrController,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error) {
                        return Center(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(
                              "Camera error:\n${error.errorCode}\n$error",
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.white),
                            ),
                          ),
                        );
                      },
                      onDetect: (capture) async {
                        if (_isHandlingScan) return;

                        final barcode =
                            capture.barcodes.isNotEmpty ? capture.barcodes.first : null;
                        final value = barcode?.rawValue;

                        if (value == null || value.isEmpty) return;

                        _isHandlingScan = true;

                        await _stopQr();
                        if (Navigator.of(sheetContext).canPop()) {
                          Navigator.of(sheetContext).pop();
                        }

                        _processQrToken(value);
                      },
                    ),

                    IgnorePointer(
                      child: CustomPaint(
                        size: Size.infinite,
                        painter: _ScanCutoutPainter(scanRect),
                      ),
                    ),

                    Center(
                      child: Container(
                        width: scanSize,
                        height: scanSize,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white.withOpacity(0.9), width: 3),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.35),
                              blurRadius: 18,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                      ),
                    ),

                    Positioned(
                      left: 24,
                      right: 24,
                      bottom: 40,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.55),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.12)),
                        ),
                        child: const Text(
                          "KampuVote\nScanning...",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white, height: 1.3),
                        ),
                      ),
                    ),

                    Positioned(
                      top: 42,
                      right: 12,
                      child: IconButton(
                        icon: const Icon(Icons.flash_on, color: Colors.white, size: 28),
                        onPressed: () async {
                          try {
                            await _qrController.toggleTorch();
                          } catch (_) {}
                        },
                      ),
                    ),

                    Positioned(
                      top: 42,
                      left: 12,
                      child: IconButton(
                        icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
                        onPressed: () async {
                          await _stopQr();
                          if (Navigator.of(sheetContext).canPop()) {
                            Navigator.of(sheetContext).pop();
                          }
                        },
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        );
      },
    );

    await _stopQr();
  }

  Future<void> _stopQr() async {
    try {
      await _qrController.stop();
    } catch (_) {}
  }

  Future<void> _processQrToken(String token) async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    final userData = await _authService.resolveQrToken(token);

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (userData != null) {
      _idController.text = (userData['id_number'] ?? "").toString();

      setState(() {
        _scannedName = (userData['name'] ?? "").toString();
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

  // =========================
  // Face verification
  // =========================
  void _startFaceVerification() {
    _hideKeyboard();

    setState(() {
      _capturedFace = null;
      _livenessPassed = false;
    });

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => FaceLivenessScreen(
          onSuccess: (file) {
            setState(() {
              _capturedFace = file;
              _livenessPassed = true;
              _errorMessage = null;
            });
          },
        ),
      ),
    );
  }

  // =========================
  // Login handler
  // =========================
  Future<void> _handleLogin() async {
    if (_isLoading) return;

    _hideKeyboard();

    if (_idController.text.isEmpty) {
      setState(() => _errorMessage = 'Please enter ID or Scan QR Code.');
      return;
    }

    if (!_isFaceVerified) {
      setState(() => _errorMessage = 'Please complete face verification.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final resultMessage = await _authService.loginAndVerify(
      identificationValue: _idController.text,
      faceImagePath: _capturedFace!.path,
      livenessPassed: _livenessPassed,
    );

    if (!mounted) return;

    setState(() => _isLoading = false);

    if (resultMessage == null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } else {
      setState(() => _errorMessage = resultMessage);
    }
  }

  // =========================
  // UI helpers
  // =========================
  Widget _statusChip() {
    if (_scannedName == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.10),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.green.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.verified_rounded, color: Colors.green, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              "Voter found: $_scannedName",
              style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w800),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _errorBox() {
    if (_errorMessage == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.red.withOpacity(0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline_rounded, color: Colors.red),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _errorMessage!,
              style: const TextStyle(
                color: Colors.red,
                fontWeight: FontWeight.w800,
                height: 1.25,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _faceCard() {
    final hasPhoto = _capturedFace != null;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.face_retouching_natural_rounded, color: Colors.indigo),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  "Face Verification",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: (hasPhoto ? Colors.green : Colors.orange).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: (hasPhoto ? Colors.green : Colors.orange).withOpacity(0.25),
                  ),
                ),
                child: Text(
                  hasPhoto ? "Ready" : "Required",
                  style: TextStyle(
                    color: hasPhoto ? Colors.green : Colors.orange,
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              GestureDetector(
                onTap: _startFaceVerification,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.grey.shade100,
                    border: Border.all(
                      color: hasPhoto ? Colors.green : Colors.grey.shade400,
                      width: 2.5,
                    ),
                  ),
                  child: hasPhoto
                      ? ClipOval(
                          child: Image.file(File(_capturedFace!.path), fit: BoxFit.cover),
                        )
                      : Icon(Icons.camera_alt_rounded, color: Colors.grey.shade600, size: 34),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Take a live selfie to verify identity.",
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "no glasses, no mask.",
                      style: TextStyle(color: Colors.grey, height: 1.25),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 42,
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _startFaceVerification,
                        icon: const Icon(Icons.photo_camera_front_rounded),
                        label: Text(hasPhoto ? "Retake Selfie" : "Take Selfie"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.indigo,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ✅ New: nicer login button (no white flash / no ugly disabled jump)
  Widget _loginButton() {
    final canSubmit = _isFaceVerified && !_isLoading;

    final style = ButtonStyle(
      backgroundColor: MaterialStateProperty.all(Colors.green.shade700),
      foregroundColor: MaterialStateProperty.all(Colors.white),
      elevation: MaterialStateProperty.all(0),
      shape: MaterialStateProperty.all(
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      // ✅ Remove the white “press” overlay/ripple
      overlayColor: MaterialStateProperty.all(Colors.transparent),
      splashFactory: NoSplash.splashFactory,
    );

    return Opacity(
      opacity: canSubmit ? 1.0 : 0.45,
      child: SizedBox(
        height: 54,
        child: ElevatedButton(
          onPressed: () {
            if (!canSubmit) {
              // keep UI stable; show message instead of disabling style
              if (_idController.text.isEmpty) {
                setState(() => _errorMessage = 'Please enter ID or Scan QR Code.');
              } else if (!_isFaceVerified) {
                setState(() => _errorMessage = 'Please complete face verification.');
              }
              _hideKeyboard();
              return;
            }
            _handleLogin();
          },
          style: style,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 160),
            child: _isLoading
                ? Row(
                    key: const ValueKey("loading"),
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                      ),
                      SizedBox(width: 12),
                      Text("Verifying...", style: TextStyle(fontWeight: FontWeight.w900)),
                    ],
                  )
                : const Text(
                    "Login",
                    key: ValueKey("login"),
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                  ),
          ),
        ),
      ),
    );
  }

  // =========================
  // BUILD (Keyboard fix + better loading)
  // =========================
  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        // Android back closes keyboard first
        final scope = FocusScope.of(context);
        if (!scope.hasPrimaryFocus && scope.focusedChild != null) {
          scope.unfocus();
          return false;
        }
        return true;
      },
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: _hideKeyboard,
        child: Scaffold(
          resizeToAvoidBottomInset: true,
          backgroundColor: Colors.grey.shade50,
          body: Stack(
            children: [
              Container(
                height: 220,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Colors.indigo.shade800, Colors.blue.shade600],
                  ),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(28),
                    bottomRight: Radius.circular(28),
                  ),
                ),
              ),
              SafeArea(
                child: SingleChildScrollView(
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.18),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: Colors.white.withOpacity(0.18)),
                            ),
                            child: const Icon(Icons.how_to_vote_rounded, color: Colors.white),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "KampuVote",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 20,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  "Scan card or enter ID, then verify face",
                                  style: TextStyle(color: Colors.white70, height: 1.2),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.08),
                              blurRadius: 22,
                              offset: const Offset(0, 10),
                            ),
                          ],
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            SizedBox(
                              height: 52,
                              child: ElevatedButton.icon(
                                onPressed: _openQrScanner,
                                icon: const Icon(Icons.qr_code_scanner_rounded),
                                label: const Text(
                                  "Scan Voter Card",
                                  style: TextStyle(fontWeight: FontWeight.w900),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.indigo,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(child: Divider(color: Colors.grey.shade300)),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 10),
                                  child: Text(
                                    "OR",
                                    style: TextStyle(
                                      color: Colors.grey.shade600,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                                Expanded(child: Divider(color: Colors.grey.shade300)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _idController,
                              keyboardType: TextInputType.number,
                              textInputAction: TextInputAction.done,
                              onSubmitted: (_) => _hideKeyboard(),
                              decoration: InputDecoration(
                                labelText: "National ID Number",
                                hintText: "Enter your ID number",
                                prefixIcon: const Icon(Icons.badge_rounded),
                                suffixIcon: IconButton(
                                  onPressed: _openQrScanner,
                                  icon: const Icon(Icons.qr_code_rounded),
                                  tooltip: "Scan instead",
                                ),
                                filled: true,
                                fillColor: Colors.grey.shade100,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide(color: Colors.grey.shade300),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide(color: Colors.indigo.shade400, width: 1.4),
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            _statusChip(),
                            const SizedBox(height: 14),
                            _faceCard(),
                            const SizedBox(height: 14),
                            _errorBox(),
                            const SizedBox(height: 12),

                            // ✅ replaced login button
                            _loginButton(),

                            const SizedBox(height: 10),
                            Text(
                              "By continuing, click login.",
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 12, height: 1.2),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // ✅ New: pretty loading overlay (no white popup)
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 180),
                child: _isLoading
                    ? const _BlockingLoadingOverlay(text: "Verifying...")
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// =========================
// Pretty loading overlay
// =========================
class _BlockingLoadingOverlay extends StatelessWidget {
  final String text;
  const _BlockingLoadingOverlay({required this.text});

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Stack(
        children: [
          const ModalBarrier(dismissible: false, color: Colors.black54),
          Center(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: Colors.white.withOpacity(0.18)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        text,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// =========================
// Cutout painter
// =========================
class _ScanCutoutPainter extends CustomPainter {
  final Rect cutout;
  _ScanCutoutPainter(this.cutout);

  @override
  void paint(Canvas canvas, Size size) {
    final full = Path()..addRect(Offset.zero & size);
    final hole = Path()
      ..addRRect(RRect.fromRectAndRadius(cutout, const Radius.circular(20)));
    final overlay = Path.combine(PathOperation.difference, full, hole);

    canvas.drawPath(overlay, Paint()..color = Colors.black.withOpacity(0.55));
  }

  @override
  bool shouldRepaint(covariant _ScanCutoutPainter oldDelegate) => oldDelegate.cutout != cutout;
}
