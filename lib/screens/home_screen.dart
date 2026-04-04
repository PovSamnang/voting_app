import 'dart:async';
import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:voting_app/screens/candidate_list_screen.dart';
import 'package:voting_app/services/auth_service.dart';
import 'package:voting_app/widgets/election_phase_panel.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final AuthService _auth = AuthService();

  String voterName = "Voter";
  bool loading = true;

  bool _statusLoaded = false;
  Map<String, dynamic> _status = {
    "election_id": 0,
    "configured": false,
    "start_ts": 0,
    "end_ts": 0,
    "chain_now_ts": 0,
    "next_transition_ts": 0,
    "phase": "NONE",
    "phase_label_kh": "មិនទាន់បើកវគ្គ",
    "active_chain": false,
  };

  Timer? _phaseTimer;
  int _phaseTick = 0;

  @override
  void initState() {
    super.initState();
    _loadVoterName();
    _loadVotingStatus();
    _startPhaseClock();
  }

  @override
  void dispose() {
    _phaseTimer?.cancel();
    super.dispose();
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

  Future<void> _loadVotingStatus() async {
    try {
      final s = await _auth.getVotingStatus();
      if (!mounted) return;
      setState(() {
        _status = s;
        _statusLoaded = true;
      });
    } catch (_) {}
  }

  void _startPhaseClock() {
    _phaseTimer?.cancel();
    _phaseTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || !_statusLoaded) return;

      final phase = (_status["phase"] ?? "NONE").toString().toUpperCase();
      final chainNow = int.tryParse("${_status["chain_now_ts"] ?? 0}") ?? 0;

      if (phase == "BEFORE_START" || phase == "ACTIVE") {
        setState(() {
          _status = {
            ..._status,
            "chain_now_ts": chainNow + 1,
          };
        });
      }

      _phaseTick++;
      if (_phaseTick % 5 == 0) {
        _loadVotingStatus();
      }
    });
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
                "បានផ្ទៀងផ្ទាត់ដោយជោគជ័យ",
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
        'អ្នកបានផ្ទៀងផ្ទាត់ព័ត៌មានដោយជោគជ័យ។ អ្នកអាចពិនិត្យស្ថានភាពវគ្គបោះឆ្នោត មើលបេក្ខជន និងបោះឆ្នោតនៅពេលប្រព័ន្ធអនុញ្ញាត។',
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
        icon: const Icon(Icons.how_to_vote_rounded),
        label: const Text(
          "មើលបេក្ខជន និងបោះឆ្នោត",
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
            "សូមស្វាគមន៍ $voterName",
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 12),
          _infoBox(),
          const SizedBox(height: 18),
          ElectionPhasePanel(
            status: _status,
            loaded: _statusLoaded,
          ),
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
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            child: loading
                ? const _BlockingLoadingOverlay(text: "កំពុងទាញយកទិន្នន័យអ្នកបោះឆ្នោត...")
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

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