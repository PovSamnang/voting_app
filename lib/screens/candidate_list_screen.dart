import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:voting_app/services/auth_service.dart';
import 'package:voting_app/widgets/election_phase_panel.dart';

class CandidateListScreen extends StatefulWidget {
  const CandidateListScreen({super.key});

  @override
  State<CandidateListScreen> createState() => _CandidateListScreenState();
}

enum _SortBy { votesDesc, nameAsc }

class _CandidateListScreenState extends State<CandidateListScreen> {
  final AuthService _auth = AuthService();
  final TextEditingController _tokenCtrl = TextEditingController();
  final TextEditingController _searchCtrl = TextEditingController();

  void _hideKeyboard() => FocusManager.instance.primaryFocus?.unfocus();

  bool _loading = true;
  String? _msg;
  List<dynamic> _candidates = [];
  int? _votedCandidateId;
  _SortBy _sortBy = _SortBy.votesDesc;

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
    _load();
    _startPhaseClock();

    _searchCtrl.addListener(() => setState(() {}));
    _tokenCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _phaseTimer?.cancel();
    _tokenCtrl.dispose();
    _searchCtrl.dispose();
    super.dispose();
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

  bool _isTokenValid(String t) {
    final s = t.trim();
    return s.startsWith("0x") && s.length == 66;
  }

  bool get _canVoteNow {
    if (!_statusLoaded) return true;
    return (_status["phase"] ?? "").toString().toUpperCase() == "ACTIVE";
  }

  String get _phaseKh =>
      (_status["phase_label_kh"] ?? "មិនទាន់បើកវគ្គ").toString();

  Future<void> _load() async {
    if (!mounted) return;

    setState(() {
      _loading = true;
      _msg = null;
    });

    final list = await _auth.getCandidates();

    try {
      final s = await _auth.getVotingStatus();
      if (!mounted) return;

      setState(() {
        _candidates = list;
        _status = s;
        _statusLoaded = true;
        _loading = false;
      });
      return;
    } catch (_) {}

    if (!mounted) return;

    setState(() {
      _candidates = list;
      _loading = false;
    });
  }

  Future<void> _vote(int candidateId, String candidateName) async {
    if (_statusLoaded && !_canVoteNow) {
      setState(() => _msg = "មិនអាចបោះឆ្នោតបានក្នុង $_phaseKh");
      return;
    }

    final t = _tokenCtrl.text.trim();
    if (!_isTokenValid(t)) {
      setState(() => _msg = "សូមបញ្ចូល Token ឱ្យបានត្រឹមត្រូវ");
      return;
    }

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text("បញ្ជាក់ការបោះឆ្នោត"),
        content: Text(
          "តើអ្នកពិតជាចង់បោះឆ្នោតឱ្យ $candidateName មែនទេ?\n\nការសម្រេចនេះអាចកែប្រែមិនបាន។",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("បោះបង់"),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text("បញ្ជាក់"),
          ),
        ],
      ),
    );

    if (ok != true) return;

    setState(() {
      _loading = true;
      _msg = null;
    });

    final err = await _auth.vote(
      votingTokenFromEmail: t,
      candidateId: candidateId,
    );

    if (!mounted) return;

    setState(() {
      _loading = false;
      _msg = err == null ? "✅ បានបោះឆ្នោតជោគជ័យ" : "❌ $err";
    });

    if (err == null) {
      setState(() {
        _votedCandidateId = candidateId;
      });
      await _load();
    }
  }

  List<dynamic> _filteredSorted() {
    final q = _searchCtrl.text.trim().toLowerCase();

    final filtered = _candidates.where((c) {
      final nameEn = (c["name_en"] ?? "").toString().toLowerCase();
      final nameKh = (c["name_kh"] ?? "").toString().toLowerCase();
      final party = (c["party"] ?? "").toString().toLowerCase();
      final id = (c["id"] ?? "").toString().toLowerCase();
      if (q.isEmpty) return true;
      return nameEn.contains(q) ||
          nameKh.contains(q) ||
          party.contains(q) ||
          id.contains(q);
    }).toList();

    filtered.sort((a, b) {
      final aVotes = int.tryParse(a["voteCount"].toString()) ?? 0;
      final bVotes = int.tryParse(b["voteCount"].toString()) ?? 0;
      final aName = (a["name_en"] ?? "").toString();
      final bName = (b["name_en"] ?? "").toString();

      switch (_sortBy) {
        case _SortBy.votesDesc:
          return bVotes.compareTo(aVotes);
        case _SortBy.nameAsc:
          return aName.toLowerCase().compareTo(bName.toLowerCase());
      }
    });

    return filtered;
  }

  Color _msgBg(String msg) =>
      msg.startsWith("✅") ? Colors.green.withOpacity(0.10) : Colors.red.withOpacity(0.08);

  Color _msgBorder(String msg) =>
      msg.startsWith("✅") ? Colors.green.withOpacity(0.25) : Colors.red.withOpacity(0.25);

  Widget _topHeader() {
    final canPop = Navigator.of(context).canPop();

    return Row(
      children: [
        if (canPop)
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
            splashRadius: 22,
          )
        else
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
                "ការបោះឆ្នោតជាតិ",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              SizedBox(height: 2),
              Text(
                "បញ្ចូល Token និងជ្រើសរើសបេក្ខជន",
                style: TextStyle(color: Colors.white70, height: 1.2),
              ),
            ],
          ),
        ),
      ],
    );
  }

  InputDecoration _fieldDecoration({
    required String hint,
    required IconData icon,
    Widget? suffix,
  }) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon),
      suffixIcon: suffix,
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
    );
  }

  Widget _tokenCard() {
    final valid = _isTokenValid(_tokenCtrl.text);

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
          Row(
            children: [
              Icon(Icons.verified_user_rounded, color: Colors.indigo.shade700),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  "លេខសម្ងាត់បោះឆ្នោត (Token)",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                ),
              ),
              TextButton.icon(
                onPressed: () {
                  _tokenCtrl.clear();
                  setState(() => _msg = null);
                },
                icon: const Icon(Icons.clear),
                label: const Text("លុប"),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _tokenCtrl,
            maxLines: 2,
            decoration: _fieldDecoration(
              hint: "បញ្ចូល Token ដែលទទួលពីអ៊ីមែល",
              icon: Icons.key_rounded,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(
                valid ? Icons.check_circle_rounded : Icons.info_outline_rounded,
                size: 18,
                color: valid ? Colors.green : Colors.grey.shade600,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  valid
                      ? "Token មានទម្រង់ត្រឹមត្រូវ។"
                      : "សូមបញ្ចូល Token ឱ្យបានត្រឹមត្រូវ។",
                  style: TextStyle(color: Colors.grey.shade700),
                ),
              ),
            ],
          ),
          if (_msg != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _msgBg(_msg!),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: _msgBorder(_msg!)),
              ),
              child: Text(
                _msg!,
                style: TextStyle(
                  color: _msg!.startsWith("✅")
                      ? Colors.green.shade800
                      : const Color.fromARGB(255, 186, 59, 47),
                  fontWeight: FontWeight.w800,
                  height: 1.25,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _searchSortRow() {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _searchCtrl,
            decoration: _fieldDecoration(
              hint: "ស្វែងរកបេក្ខជន...",
              icon: Icons.search_rounded,
              suffix: _searchCtrl.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => _searchCtrl.clear(),
                      tooltip: "Clear search",
                    ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        PopupMenuButton<_SortBy>(
          tooltip: "Sort",
          onSelected: (v) => setState(() => _sortBy = v),
          itemBuilder: (ctx) => const [
            PopupMenuItem(
              value: _SortBy.votesDesc,
              child: Text("តម្រៀបតាមសំឡេងឆ្នោត"),
            ),
            PopupMenuItem(
              value: _SortBy.nameAsc,
              child: Text("តម្រៀបតាមឈ្មោះ"),
            ),
          ],
          child: Container(
            height: 56,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade300),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              children: const [
                Icon(Icons.sort_rounded),
                SizedBox(width: 8),
                Text("តម្រៀប", style: TextStyle(fontWeight: FontWeight.w900)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _fallbackAvatar(String displayName) {
    return Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        color: Colors.indigo.withOpacity(0.12),
        borderRadius: BorderRadius.circular(14),
      ),
      alignment: Alignment.center,
      child: Text(
        displayName.isNotEmpty ? displayName[0].toUpperCase() : "?",
        style: TextStyle(
          fontWeight: FontWeight.w900,
          fontSize: 22,
          color: Colors.indigo.shade800,
        ),
      ),
    );
  }

  Widget _candidateCard(dynamic c) {
    final id = int.tryParse(c["id"].toString()) ?? 0;
    final nameKh = (c["name_kh"] ?? "").toString().trim();
    final nameEn = (c["name_en"] ?? "").toString().trim();
    final party = (c["party"] ?? "").toString().trim();
    final votes = int.tryParse(c["voteCount"].toString()) ?? 0;

    final displayName = nameEn.isEmpty ? "Candidate #$id" : nameEn;
    final hasVotedThis = _votedCandidateId == id;

    String voteButtonText;
    if (hasVotedThis) {
      voteButtonText = "បានបោះឆ្នោត";
    } else if (_statusLoaded && !_canVoteNow) {
      if (_phaseKh == "ដំណាក់កាលត្រួតពិនិត្យ") {
        voteButtonText = "រង់ចាំពេលបោះឆ្នោត";
      } else if (_phaseKh == "បញ្ចប់ការបោះ") {
        voteButtonText = "វគ្គបោះឆ្នោតបានបញ្ចប់";
      } else {
        voteButtonText = "មិនទាន់អាចបោះឆ្នោត";
      }
    } else {
      voteButtonText = "បោះឆ្នោត";
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(50),
                    child: (c["photo_url"] ?? "").toString().isNotEmpty
                        ? Image.network(
                            (c["photo_url"] ?? "").toString(),
                            width: 64,
                            height: 64,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) {
                              return _fallbackAvatar(displayName);
                            },
                          )
                        : _fallbackAvatar(displayName),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        color: hasVotedThis ? Colors.grey.shade400 : Colors.green,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (nameKh.isNotEmpty)
                      Text(
                        nameKh,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    Text(
                      displayName,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 6),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E3A8A).withOpacity(0.10),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  "សំឡេង: $votes",
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E3A8A),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  "លេខ: #$id",
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (party.isNotEmpty)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    "គណបក្ស $party",
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: (id == 0 || _loading || (_statusLoaded && !_canVoteNow))
                  ? null
                  : () => _vote(id, displayName),
              style: ElevatedButton.styleFrom(
                backgroundColor: hasVotedThis
                    ? Colors.grey.shade400
                    : const Color.fromARGB(255, 54, 93, 200),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 0,
              ),
              child: Text(
                voteButtonText,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredSorted();

    return GestureDetector(
      onTap: _hideKeyboard,
      behavior: HitTestBehavior.translucent,
      child: Scaffold(
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
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return RefreshIndicator(
                    onRefresh: _load,
                    child: CustomScrollView(
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
                                    ElectionPhasePanel(
                                      status: _status,
                                      loaded: _statusLoaded,
                                    ),
                                    const SizedBox(height: 14),
                                    _tokenCard(),
                                    const SizedBox(height: 14),
                                    _searchSortRow(),
                                    const SizedBox(height: 14),
                                    if (!_loading && list.isEmpty)
                                      Container(
                                        padding: const EdgeInsets.all(16),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(22),
                                          border: Border.all(color: Colors.grey.shade200),
                                        ),
                                        child: const Text(
                                          "មិនមានបេក្ខជន",
                                          textAlign: TextAlign.center,
                                          style: TextStyle(fontWeight: FontWeight.w900),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                          sliver: SliverToBoxAdapter(
                            child: Center(
                              child: ConstrainedBox(
                                constraints: const BoxConstraints(maxWidth: 520),
                                child: Column(
                                  children: [
                                    for (int i = 0; i < list.length; i++) ...[
                                      _candidateCard(list[i]),
                                      const SizedBox(height: 12),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 90)),
                      ],
                    ),
                  );
                },
              ),
            ),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 180),
              child: _loading
                  ? const _BlockingLoadingOverlay(text: "កំពុងទាញយកទិន្នន័យ...")
                  : const SizedBox.shrink(),
            ),
          ],
        ),
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