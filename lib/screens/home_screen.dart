import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:voting_app/screens/candidate_list_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String voterName = "Voter";
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _loadVoterName();
  }

  Future<void> _loadVoterName() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString("voterData");

    if (!mounted) return;

    if (data != null) {
      final voter = jsonDecode(data);
      setState(() {
        voterName = (voter["name"] ?? "Voter").toString();
        loading = false;
      });
    } else {
      setState(() => loading = false);
    }
  }

  Widget _header() {
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
                "Verified successfully ",
                style: TextStyle(color: Colors.white70, height: 1.2),
              ),
            ],
          ),
        ),
      ],
    );
  }

  

  Widget _infoBox() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: const Text(
        'អ្នកបានផ្ទៀងផ្ទាត់ព័ត៌មានដោយជោគជ័យ អ្នកមានសិទ្ធិក្នុងការបោះឆ្នោតក្នុងប្រព័ន្ធ blockchain voting system',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 14, color: Colors.grey, height: 1.35),
      ),
    );
  }

  Widget _primaryButton() {
    final style = ButtonStyle(
      backgroundColor: MaterialStateProperty.all(Colors.indigo),
      foregroundColor: MaterialStateProperty.all(Colors.white),
      elevation: MaterialStateProperty.all(0),
      shape: MaterialStateProperty.all(
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      overlayColor: MaterialStateProperty.all(Colors.transparent),
      splashFactory: NoSplash.splashFactory,
    );

    return SizedBox(
      height: 54,
      child: ElevatedButton.icon(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CandidateListScreen()),
          );
        },
        label: const Text(
          "View Candidates",
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
        ),
        style: style,
      ),
    );
  }

  Widget _contentCard() {
    return Container(
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
          const Icon(Icons.verified_user_rounded, size: 100, color: Colors.green),
          const SizedBox(height: 14),

          Text(
            "Welcome $voterName",
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 12),

          _infoBox(),
          const SizedBox(height: 18),

          _primaryButton(),

          const SizedBox(height: 10),
          
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: Stack(
        children: [
          //  Same gradient header like LoginScreen
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
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _header(),
                  const SizedBox(height: 18),
                  _contentCard(),
                ],
              ),
            ),
          ),

          //  Same nice blur loading overlay
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            child: loading
                ? const _BlockingLoadingOverlay(text: "Loading voter data...")
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

// =========================
// Pretty loading overlay (same style as LoginScreen)
// =========================
class _BlockingLoadingOverlay extends StatelessWidget {
  final String text;
  const _BlockingLoadingOverlay({required this.text});

  @override
  Widget build(BuildContext context) {
    return SizedBox.expand(
      child: Stack(
        children: [
          // blocks touch + dark background
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
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          color: Colors.white,
                        ),
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