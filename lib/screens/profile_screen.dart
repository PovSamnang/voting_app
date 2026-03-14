import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? voter;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _loadVoter();
  }

  Future<void> _loadVoter() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString("voterData");

    if (!mounted) return;

    if (data != null) {
      setState(() {
        voter = jsonDecode(data);
        loading = false;
      });
    } else {
      setState(() {
        voter = null;
        loading = false;
      });
    }
  }

  Future<void> _logout() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text("Logout"),
        content: const Text("Do you want to logout?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text("Logout")),
        ],
      ),
    );

    if (ok != true) return;

    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    if (!mounted) return;

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  Uint8List? _decodePhoto() {
    if (voter == null) return null;
    final p = voter!["photo"];
    if (p == null) return null;
    final s = p.toString();
    if (s.isEmpty) return null;

    try {
      return base64Decode(s);
    } catch (_) {
      return null;
    }
  }

  // =========================
  // UI (match CandidateList style)
  // =========================
  Widget _topHeader() {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.18),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withOpacity(0.18)),
          ),
          child: const Icon(Icons.person_rounded, color: Colors.white),
        ),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "My Profile",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              SizedBox(height: 2),
              Text(
                "Voter information",
                style: TextStyle(color: Colors.white70, height: 1.2),
              ),
            ],
          ),
        ),
      ],
    );
  }

  BoxDecoration _cardDecoration({double radius = 22}) {
    return BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: Colors.grey.shade200),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.08),
          blurRadius: 22,
          offset: const Offset(0, 10),
        ),
      ],
    );
  }

  Widget _profileCard({
    required Uint8List? imageBytes,
    required String name,
    required String idNumber,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Avatar with ring (similar polish as candidate cards)
          Center(
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.indigo.withOpacity(0.06),
                border: Border.all(color: Colors.indigo.withOpacity(0.25), width: 2),
              ),
              child: CircleAvatar(
                radius: 58,
                backgroundColor: Colors.grey.shade100,
                backgroundImage: imageBytes != null ? MemoryImage(imageBytes) : null,
                child: imageBytes == null
                    ? Text(
                        name.isNotEmpty ? name[0].toUpperCase() : "?",
                        style: TextStyle(
                          fontSize: 42,
                          fontWeight: FontWeight.w900,
                          color: Colors.indigo.shade800,
                        ),
                      )
                    : null,
              ),
            ),
          ),

          const SizedBox(height: 16),

          Text(
            name,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
          ),

          const SizedBox(height: 10),

          // Status chip like your other screens
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.10),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.green.withOpacity(0.25)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.verified_rounded, color: Colors.green, size: 18),
                  SizedBox(width: 8),
                  Text(
                    "Verified",
                    style: TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Details area (same feel as CandidateList token card sections)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                _infoRow(
                  icon: Icons.badge_rounded,
                  label: "ID Number",
                  value: idNumber,
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          SizedBox(
            height: 54,
            child: ElevatedButton.icon(
              onPressed: _logout,
              icon: const Icon(Icons.logout_rounded),
              label: const Text(
                "Logout",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
              ),
              style: ButtonStyle(
                backgroundColor: MaterialStateProperty.all(Colors.red.shade600),
                foregroundColor: MaterialStateProperty.all(Colors.white),
                elevation: MaterialStateProperty.all(0),
                shape: MaterialStateProperty.all(
                  RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                overlayColor: MaterialStateProperty.all(Colors.transparent),
                splashFactory: NoSplash.splashFactory,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, color: Colors.indigo.shade700),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.w900,
            color: Colors.grey.shade700,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    // Use same background + overlay pattern as CandidateList
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: Stack(
        children: [
          // ✅ Gradient header (same as Login/Home/Candidate)
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
            child: LayoutBuilder(
              builder: (context, constraints) {
                final imageBytes = _decodePhoto();
                final name = (voter?["name"] ?? "Unknown").toString();
                final idNumber = (voter?["id_number"] ?? "-").toString();

                return CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
                      sliver: SliverToBoxAdapter(
                        child: Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 520),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _topHeader(),
                                const SizedBox(height: 18),

                                if (!loading && voter == null)
                                  Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: _cardDecoration(),
                                    child: const Text(
                                      "No voter data found",
                                      textAlign: TextAlign.center,
                                      style: TextStyle(fontWeight: FontWeight.w900),
                                    ),
                                  )
                                else
                                  _profileCard(
                                    imageBytes: imageBytes,
                                    name: name,
                                    idNumber: idNumber,
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SliverToBoxAdapter(child: SizedBox(height: 90)),
                  ],
                );
              },
            ),
          ),

          //  Same pretty loading overlay
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            child: loading
                ? const _BlockingLoadingOverlay(text: "Loading profile...")
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

// =========================
// Pretty loading overlay (same style as Login/Home/Candidate)
// =========================
class _BlockingLoadingOverlay extends StatelessWidget {
  final String text;
  const _BlockingLoadingOverlay({required this.text});

  @override
  Widget build(BuildContext context) {
    return SizedBox.expand(
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
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900),
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