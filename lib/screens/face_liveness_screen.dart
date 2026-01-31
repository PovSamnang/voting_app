// face_liveness_screen.dart
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

enum LivenessStep { blink, left, right, verified }

class FaceLivenessScreen extends StatefulWidget {
  final void Function(File file) onSuccess;
  const FaceLivenessScreen({super.key, required this.onSuccess});

  @override
  State<FaceLivenessScreen> createState() => _FaceLivenessScreenState();
}

class _FaceLivenessScreenState extends State<FaceLivenessScreen>
    with SingleTickerProviderStateMixin {
  CameraController? _camera;
  late final FaceDetector _faceDetector;

  bool _isCameraReady = false;
  bool _processing = false;

  // Block swipe/back: only allow pop when we explicitly set this true.
  bool _allowExit = false;

  // Liveness state
  LivenessStep _step = LivenessStep.blink;
  bool _hasFace = false;
  bool _readyToCapture = false;
  bool _capturing = false;

  // stability counters
  int _noFaceFrames = 0;
  int _stableFaceFrames = 0;

  // blink counters
  int _closedFrames = 0;
  int _openFramesAfterClose = 0;

  // head turn counters
  int _leftFrames = 0;
  int _rightFrames = 0;

  static const int _needStableFaceFrames = 4;
  static const int _resetIfNoFaceFrames = 12;
  static const int _needActionFrames = 3;

  // UI animation (scan line)
  late final AnimationController _scanAnim = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1300),
  )..repeat(reverse: true);

  @override
  void initState() {
    super.initState();

    _faceDetector = FaceDetector(
      options: FaceDetectorOptions(
        enableClassification: true,
        enableTracking: true,
        performanceMode: FaceDetectorMode.fast,
      ),
    );

    _initCamera();
  }

  @override
  void dispose() {
    _scanAnim.dispose();
    _safeStopStream();
    _camera?.dispose();
    _faceDetector.close();
    super.dispose();
  }

  Future<void> _safeStopStream() async {
    try {
      if (_camera?.value.isStreamingImages == true) {
        await _camera!.stopImageStream();
      }
    } catch (_) {}
  }

  Future<void> _close() async {
    await _safeStopStream();
    if (!mounted) return;
    setState(() => _allowExit = true);
    Navigator.of(context).pop();
  }

  Future<void> _finishSuccess(File file) async {
    widget.onSuccess(file);
    if (!mounted) return;
    setState(() => _allowExit = true);
    Navigator.of(context).pop();
  }

  // =========================
  // Camera init
  // =========================
  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      final front = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      final controller = CameraController(
        front,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup:
            Platform.isAndroid ? ImageFormatGroup.nv21 : ImageFormatGroup.bgra8888,
      );

      await controller.initialize();
      await controller.startImageStream(_processCameraImage);

      if (!mounted) return;
      setState(() {
        _camera = controller;
        _isCameraReady = true;
      });
    } catch (e) {
      debugPrint("Camera init error: $e");
    }
  }

  // =========================
  // Rotation helpers
  // =========================
  int _deviceOrientationToDegrees(DeviceOrientation orientation) {
    switch (orientation) {
      case DeviceOrientation.portraitUp:
        return 0;
      case DeviceOrientation.landscapeLeft:
        return 90;
      case DeviceOrientation.portraitDown:
        return 180;
      case DeviceOrientation.landscapeRight:
        return 270;
    }
  }

  InputImageRotation _rotationFromDegrees(int degrees) {
    switch (degrees) {
      case 90:
        return InputImageRotation.rotation90deg;
      case 180:
        return InputImageRotation.rotation180deg;
      case 270:
        return InputImageRotation.rotation270deg;
      case 0:
      default:
        return InputImageRotation.rotation0deg;
    }
  }

  InputImage _inputImageFromCameraImage(CameraImage image) {
    final controller = _camera!;
    final rotationComp = _deviceOrientationToDegrees(controller.value.deviceOrientation);
    final sensor = controller.description.sensorOrientation;

    int rotation;
    if (Platform.isAndroid) {
      if (controller.description.lensDirection == CameraLensDirection.front) {
        rotation = (sensor + rotationComp) % 360;
      } else {
        rotation = (sensor - rotationComp + 360) % 360;
      }
    } else {
      rotation = rotationComp;
    }

    final inputRotation = _rotationFromDegrees(rotation);

    final plane = image.planes.first;
    final bytes = plane.bytes;

    final format = Platform.isAndroid ? InputImageFormat.nv21 : InputImageFormat.bgra8888;

    return InputImage.fromBytes(
      bytes: bytes,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: inputRotation,
        format: format,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
  }

  bool _isGoodFace(Face face, CameraImage img) {
    final box = face.boundingBox;
    if (box.width < 120 || box.height < 120) return false;
    if (box.left < 0 || box.top < 0) return false;
    if (box.right > img.width || box.bottom > img.height) return false;
    return true;
  }

  void _resetAll() {
    _noFaceFrames = 0;
    _stableFaceFrames = 0;

    _closedFrames = 0;
    _openFramesAfterClose = 0;

    _leftFrames = 0;
    _rightFrames = 0;

    _hasFace = false;
    _readyToCapture = false;
    _step = LivenessStep.blink;
  }

  // =========================
  // Frame processing
  // =========================
  Future<void> _processCameraImage(CameraImage image) async {
    if (_processing || !_isCameraReady) return;
    if (_camera == null) return;
    if (_step == LivenessStep.verified) return;

    _processing = true;

    try {
      final inputImage = _inputImageFromCameraImage(image);
      final faces = await _faceDetector.processImage(inputImage);

      if (faces.isEmpty) {
        _noFaceFrames++;
        _stableFaceFrames = 0;
        if (_hasFace) setState(() => _hasFace = false);

        if (_noFaceFrames >= _resetIfNoFaceFrames) {
          setState(_resetAll);
        }
        return;
      }

      if (faces.length > 1) {
        setState(_resetAll);
        return;
      }

      final face = faces.first;

      if (!_isGoodFace(face, image)) {
        _noFaceFrames++;
        _stableFaceFrames = 0;
        if (_hasFace) setState(() => _hasFace = false);
        if (_noFaceFrames >= _resetIfNoFaceFrames) setState(_resetAll);
        return;
      }

      _noFaceFrames = 0;
      _stableFaceFrames++;
      if (!_hasFace) setState(() => _hasFace = true);

      // must be stable before action
      if (_stableFaceFrames < _needStableFaceFrames) return;

      final yaw = face.headEulerAngleY ?? 0;

      // ===== BLINK =====
      if (_step == LivenessStep.blink) {
        final left = face.leftEyeOpenProbability;
        final right = face.rightEyeOpenProbability;
        if (left == null || right == null) return;

        final eyesClosed = left < 0.25 && right < 0.25;
        final eyesOpen = left > 0.75 && right > 0.75;

        if (eyesClosed) _closedFrames++;

        if (_closedFrames >= 2) {
          if (eyesOpen) {
            _openFramesAfterClose++;
          } else {
            _openFramesAfterClose = 0;
          }
        }

        if (_openFramesAfterClose >= 2) {
          setState(() {
            _step = LivenessStep.left;
            _leftFrames = 0;
          });
        }
      }

      // ===== LEFT =====
      else if (_step == LivenessStep.left) {
        if (yaw < -15) {
          _leftFrames++;
        } else {
          _leftFrames = 0;
        }

        if (_leftFrames >= _needActionFrames) {
          setState(() {
            _step = LivenessStep.right;
            _rightFrames = 0;
          });
        }
      }

      // ===== RIGHT =====
      else if (_step == LivenessStep.right) {
        if (yaw > 15) {
          _rightFrames++;
        } else {
          _rightFrames = 0;
        }

        if (_rightFrames >= _needActionFrames) {
          setState(() {
            _step = LivenessStep.verified;
            _readyToCapture = true;
          });

          // reduce CPU
          await _safeStopStream();
        }
      }
    } catch (e) {
      debugPrint("Face detection error: $e");
    } finally {
      _processing = false;
    }
  }

  // =========================
  // Take picture (manual)
  // =========================
  Future<void> _takePicture() async {
    if (_camera == null) return;
    if (!_readyToCapture) return;
    if (_capturing) return;

    setState(() => _capturing = true);

    try {
      // Safe: ensure stream is stopped before capture (some devices require this)
      await _safeStopStream();

      final pic = await _camera!.takePicture();
      await _finishSuccess(File(pic.path));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Capture failed: $e")),
      );
    } finally {
      if (mounted) setState(() => _capturing = false);
    }
  }

  Future<void> _retake() async {
    if (_camera == null) return;

    setState(_resetAll);

    try {
      if (_camera!.value.isStreamingImages != true) {
        await _camera!.startImageStream(_processCameraImage);
      }
    } catch (_) {}
  }

  String _statusText() {
    if (!_hasFace) return "No face detected. Center your face.";
    if (_stableFaceFrames < _needStableFaceFrames) return "Hold still…";
    switch (_step) {
      case LivenessStep.blink:
        return "Blink your eyes";
      case LivenessStep.left:
        return "Turn your head LEFT";
      case LivenessStep.right:
        return "Turn your head RIGHT";
      case LivenessStep.verified:
        return "Tap shutter to take photo";
    }
  }

  int _stepIndex() {
    switch (_step) {
      case LivenessStep.blink:
        return 0;
      case LivenessStep.left:
        return 1;
      case LivenessStep.right:
        return 2;
      case LivenessStep.verified:
        return 3;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isCameraReady || _camera == null) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    final media = MediaQuery.of(context);
    final size = media.size;
    final topPadding = media.padding.top;

    // “Face verify” oval frame
    final frameW = size.width * 0.78;
    final frameH = frameW * 1.18;

    // Put the frame a bit above center (so bottom controls don’t cover it)
    final frameCenter = Offset(size.width / 2, size.height * 0.42);
    final frameRect = Rect.fromCenter(center: frameCenter, width: frameW, height: frameH);

    return PopScope(
      canPop: _allowExit, // ✅ blocks Android back + iOS swipe-back
      onPopInvoked: (didPop) {
        if (!didPop && !_allowExit) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Use the Close button to exit.")),
          );
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            // Camera preview
            Positioned.fill(child: CameraPreview(_camera!)),

            // Dark overlay + oval cutout
            Positioned.fill(
              child: CustomPaint(
                painter: _OvalCameraMaskPainter(
                  frameRect: frameRect,
                  hasFace: _hasFace,
                  verified: _readyToCapture,
                ),
              ),
            ),

            // Scan line animation (only before verified)
            if (!_readyToCapture)
              Positioned(
                left: frameRect.left,
                top: frameRect.top,
                width: frameRect.width,
                height: frameRect.height,
                child: AnimatedBuilder(
                  animation: _scanAnim,
                  builder: (_, __) {
                    final y = 12 + _scanAnim.value * (frameRect.height - 24);
                    return Stack(
                      children: [
                        Positioned(
                          left: 18,
                          right: 18,
                          top: y,
                          child: Container(
                            height: 2,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.65),
                              borderRadius: BorderRadius.circular(999),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.white.withOpacity(0.25),
                                  blurRadius: 10,
                                  spreadRadius: 1,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),

            // Top bar
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              child: Container(
                padding: EdgeInsets.fromLTRB(12, topPadding + 10, 12, 10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.75),
                      Colors.black.withOpacity(0.0),
                    ],
                  ),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close_rounded,
                          color: Colors.white, size: 28),
                      onPressed: _close, // ✅ close only by button
                    ),
                    const SizedBox(width: 6),
                    const Expanded(
                      child: Text(
                        "Face Verify",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
              ),
            ),

            // Step dots
            Positioned(
              left: 0,
              right: 0,
              top: topPadding + 70,
              child: Center(child: _StepDots(activeIndex: _stepIndex())),
            ),

            // Status text
            Positioned(
              left: 18,
              right: 18,
              bottom: 150,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.55),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.12)),
                ),
                child: Text(
                  _statusText(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    height: 1.2,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),

            // Bottom controls
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Colors.black.withOpacity(0.80),
                      Colors.black.withOpacity(0.10),
                    ],
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _MiniButton(
                      label: "Retake",
                      icon: Icons.refresh_rounded,
                      onTap: _retake,
                    ),

                    GestureDetector(
                      onTap: _readyToCapture
                          ? _takePicture
                          : () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text("Complete liveness first.")),
                              );
                            },
                      child: AnimatedOpacity(
                        duration: const Duration(milliseconds: 200),
                        opacity: _readyToCapture ? 1.0 : 0.45,
                        child: _ShutterButton(
                          loading: _capturing,
                          enabled: _readyToCapture,
                        ),
                      ),
                    ),

                    _MiniButton(
                      label: "Help",
                      icon: Icons.info_outline_rounded,
                      onTap: () {
                        showDialog(
                          context: context,
                          builder: (_) => AlertDialog(
                            title: const Text("How to verify"),
                            content: const Text(
                              "1) Center your face\n"
                              "2) Blink\n"
                              "3) Turn head left\n"
                              "4) Turn head right\n\n"
                              "Then tap shutter to take your selfie.",
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text("OK"),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =========================
// UI Widgets / Painters
// =========================

class _StepDots extends StatelessWidget {
  final int activeIndex; // 0..3
  const _StepDots({required this.activeIndex});

  @override
  Widget build(BuildContext context) {
    Widget dot(int idx) {
      final on = idx <= activeIndex;
      return AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: on ? 22 : 10,
        height: 10,
        margin: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: on ? Colors.white : Colors.white.withOpacity(0.35),
          borderRadius: BorderRadius.circular(999),
        ),
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [dot(0), dot(1), dot(2), dot(3)],
    );
  }
}

class _MiniButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _MiniButton({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.10)),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShutterButton extends StatelessWidget {
  final bool enabled;
  final bool loading;

  const _ShutterButton({required this.enabled, required this.loading});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 76,
      height: 76,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: Colors.white.withOpacity(enabled ? 0.95 : 0.55),
          width: 5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.35),
            blurRadius: 18,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Container(
        width: 58,
        height: 58,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: enabled ? Colors.white : Colors.white.withOpacity(0.65),
        ),
        child: loading
            ? const Padding(
                padding: EdgeInsets.all(16.0),
                child: CircularProgressIndicator(strokeWidth: 2.4),
              )
            : const SizedBox.shrink(),
      ),
    );
  }
}

class _OvalCameraMaskPainter extends CustomPainter {
  final Rect frameRect;
  final bool hasFace;
  final bool verified;

  _OvalCameraMaskPainter({
    required this.frameRect,
    required this.hasFace,
    required this.verified,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // overlay with oval hole
    final full = Path()..addRect(Offset.zero & size);
    final hole = Path()..addOval(frameRect);
    final overlay = Path.combine(PathOperation.difference, full, hole);

    canvas.drawPath(
      overlay,
      Paint()..color = Colors.black.withOpacity(0.58),
    );

    final borderColor = verified
        ? Colors.greenAccent.withOpacity(0.95)
        : (hasFace
            ? Colors.white.withOpacity(0.95)
            : Colors.redAccent.withOpacity(0.85));

    // oval border
    canvas.drawOval(
      frameRect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.5
        ..color = borderColor,
    );

    // small guide ticks
    final tick = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round
      ..color = borderColor.withOpacity(0.9);

    const t = 18.0;
    canvas.drawLine(
      Offset(frameRect.center.dx - t, frameRect.top + 10),
      Offset(frameRect.center.dx + t, frameRect.top + 10),
      tick,
    );
    canvas.drawLine(
      Offset(frameRect.center.dx - t, frameRect.bottom - 10),
      Offset(frameRect.center.dx + t, frameRect.bottom - 10),
      tick,
    );
    canvas.drawLine(
      Offset(frameRect.left + 10, frameRect.center.dy - t),
      Offset(frameRect.left + 10, frameRect.center.dy + t),
      tick,
    );
    canvas.drawLine(
      Offset(frameRect.right - 10, frameRect.center.dy - t),
      Offset(frameRect.right - 10, frameRect.center.dy + t),
      tick,
    );
  }

  @override
  bool shouldRepaint(covariant _OvalCameraMaskPainter oldDelegate) {
    return oldDelegate.frameRect != frameRect ||
        oldDelegate.hasFace != hasFace ||
        oldDelegate.verified != verified;
  }
}
