import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:voting_app/services/auth_service.dart';

class ResultScreen extends StatefulWidget {
  const ResultScreen({super.key});

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  final AuthService _auth = AuthService();

  bool _loading = true;
  String? _msg;
  List<dynamic> _candidates = [];

  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _load();
    _refreshTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      _load(silent: true);
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!mounted) return;

    if (!silent) {
      setState(() {
        _loading = true;
        _msg = null;
      });
    }

    try {
      final list = await _auth.getCandidates();

      if (!mounted) return;

      setState(() {
        _candidates = list;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _msg = "មិនអាចទាញយកលទ្ធផលបានទេ";
      });
    }
  }

  int _votesOf(dynamic c) => int.tryParse("${c["voteCount"] ?? 0}") ?? 0;

  List<dynamic> _sortedCandidates() {
    final list = List<dynamic>.from(_candidates);
    list.sort((a, b) => _votesOf(b).compareTo(_votesOf(a)));
    return list;
  }

  int get _totalVotes {
    return _candidates.fold<int>(0, (sum, c) => sum + _votesOf(c));
  }

  double _percentOf(dynamic c) {
    if (_totalVotes <= 0) return 0;
    return (_votesOf(c) / _totalVotes) * 100;
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
          child: const Icon(Icons.bar_chart_rounded, color: Colors.white),
        ),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "លទ្ធផលបោះឆ្នោត",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              SizedBox(height: 2),
              Text(
                "សង្ខេបលទ្ធផល និងចំណាត់ថ្នាក់បេក្ខជន",
                style: TextStyle(color: Colors.white70, height: 1.2),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _statCard({
    required String label,
    required String value,
    required IconData icon,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: const Color(0xFF0F2D6B).withOpacity(0.10),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: const Color(0xFF0F2D6B)),
            ),
            const SizedBox(height: 10),
            Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F2D6B),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Colors.grey.shade700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _fallbackAvatar(String displayName, {double size = 88}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.indigo.withOpacity(0.12),
        borderRadius: BorderRadius.circular(size * 0.24),
      ),
      alignment: Alignment.center,
      child: Text(
        displayName.isNotEmpty ? displayName[0].toUpperCase() : "?",
        style: TextStyle(
          fontWeight: FontWeight.w900,
          fontSize: size * 0.34,
          color: Colors.indigo.shade800,
        ),
      ),
    );
  }

  Widget _candidateImage(dynamic c, String displayName, {double size = 88}) {
    final photoUrl = (c["photo_url"] ?? "").toString().trim();

    if (photoUrl.isEmpty) {
      return _fallbackAvatar(displayName, size: size);
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(size * 0.24),
      child: Image.network(
        photoUrl,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) {
          return _fallbackAvatar(displayName, size: size);
        },
      ),
    );
  }

  Widget _leaderHero(dynamic c) {
    final nameKh = (c["name_kh"] ?? "").toString().trim();
    final nameEn = (c["name_en"] ?? "").toString().trim();
    final party = (c["party"] ?? "").toString().trim();
    final displayName = nameEn.isEmpty ? "Candidate" : nameEn;
    final votes = _votesOf(c);
    final percent = _percentOf(c);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0F2D6B), Color(0xFF1E4FA3)],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F2D6B).withOpacity(0.18),
            blurRadius: 22,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.amber.withOpacity(0.28)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.emoji_events_rounded, color: Colors.amber, size: 16),
                    SizedBox(width: 6),
                    Text(
                      "នាំមុខគេ",
                      style: TextStyle(
                        color: Colors.amber,
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                "${percent.toStringAsFixed(1)}%",
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          _candidateImage(c, displayName, size: 110),
          const SizedBox(height: 14),
          if (nameKh.isNotEmpty)
            Text(
              nameKh,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w900,
              ),
            ),
          Text(
            displayName,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (party.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              "គណបក្ស $party",
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white70,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _heroMiniStat("សំឡេងឆ្នោត", "$votes"),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _heroMiniStat("ចំណែកភាគរយ", "${percent.toStringAsFixed(1)}%"),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _heroMiniStat(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.10),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white70,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _resultCard(dynamic c, bool isLeader) {
    final id = int.tryParse("${c["id"] ?? 0}") ?? 0;
    final nameKh = (c["name_kh"] ?? "").toString().trim();
    final nameEn = (c["name_en"] ?? "").toString().trim();
    final party = (c["party"] ?? "").toString().trim();
    final displayName = nameEn.isEmpty ? "Candidate #$id" : nameEn;
    final votes = _votesOf(c);
    final percent = _percentOf(c);
    final barFactor = _totalVotes <= 0 ? 0.0 : (votes / _totalVotes).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isLeader
              ? const Color(0xFFD4AF37).withOpacity(0.40)
              : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 14,
            offset: const Offset(0, 7),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Stack(
                children: [
                  _candidateImage(c, displayName, size: 64),
                  if (isLeader)
                    Positioned(
                      top: -2,
                      right: -2,
                      child: Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: Colors.amber,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Icon(
                          Icons.star_rounded,
                          size: 14,
                          color: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (nameKh.isNotEmpty)
                      Text(
                        nameKh,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    Text(
                      displayName,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade700,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (party.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        "គណបក្ស $party",
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    "$votes",
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F2D6B),
                    ),
                  ),
                  Text(
                    "${percent.toStringAsFixed(1)}%",
                    style: TextStyle(
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth * barFactor;
              return Column(
                children: [
                  Container(
                    width: double.infinity,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        width: width,
                        height: 12,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isLeader
                                ? const [Color(0xFFD4AF37), Color(0xFFB98A1D)]
                                : const [Color(0xFF1E4FA3), Color(0xFF4F86E8)],
                          ),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        "លេខបេក្ខជន: #$id",
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        "សំឡេងឆ្នោតសរុប: $_totalVotes",
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _emptyState() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: const Column(
        children: [
          Icon(Icons.insert_chart_outlined_rounded, size: 54, color: Colors.grey),
          SizedBox(height: 10),
          Text(
            "មិនទាន់មានទិន្នន័យបេក្ខជន",
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sorted = _sortedCandidates();
    final leader = sorted.isNotEmpty ? sorted.first : null;
    final leaderPercent = leader == null ? 0.0 : _percentOf(leader);

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
            child: RefreshIndicator(
              onRefresh: _load,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
                    sliver: SliverToBoxAdapter(
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 560),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _header(),
                              const SizedBox(height: 18),
                              Row(
                                children: [
                                  _statCard(
                                    label: "បេក្ខជនសរុប",
                                    value: "${sorted.length}",
                                    icon: Icons.groups_rounded,
                                  ),
                                  const SizedBox(width: 10),
                                  _statCard(
                                    label: "សំឡេងសរុប",
                                    value: "$_totalVotes",
                                    icon: Icons.how_to_vote_rounded,
                                  ),
                                  const SizedBox(width: 10),
                                  _statCard(
                                    label: "ភាគរយនាំមុខ",
                                    value: "${leaderPercent.toStringAsFixed(1)}%",
                                    icon: Icons.emoji_events_rounded,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              if (_msg != null)
                                Container(
                                  margin: const EdgeInsets.only(bottom: 14),
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: Colors.red.withOpacity(0.22),
                                    ),
                                  ),
                                  child: Text(
                                    _msg!,
                                    style: const TextStyle(
                                      color: Color(0xFFB42318),
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              if (leader != null) ...[
                                _leaderHero(leader),
                                const SizedBox(height: 18),
                              ],
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                  vertical: 2,
                                ),
                                child: const Text(
                                  "តារាងលទ្ធផលបេក្ខជនទាំងអស់",
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F2D6B),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),
                              if (sorted.isEmpty)
                                _emptyState()
                              else
                                for (int i = 0; i < sorted.length; i++)
                                  _resultCard(sorted[i], i == 0),
                              const SizedBox(height: 90),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            child: _loading
                ? const _BlockingLoadingOverlay(text: "កំពុងទាញយកលទ្ធផល...")
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