import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:voting_app/services/auth_service.dart';

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

  @override
  void initState() {
    super.initState();
    _load();

    _searchCtrl.addListener(() => setState(() {}));
    _tokenCtrl.addListener(() => setState(() {})); //  so token-valid UI updates live
  }

  @override
  void dispose() {
    _tokenCtrl.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!mounted) return;

    setState(() {
      _loading = true;
      _msg = null;
    });

    final list = await _auth.getCandidates();

    if (!mounted) return;

    setState(() {
      _candidates = list;
      _loading = false;
    });
  }

  bool _isTokenValid(String t) {
    final s = t.trim();
    return s.startsWith("0x") && s.length == 66; // bytes32 token from Gmail
  }

  Future<void> _vote(int candidateId, String candidateName) async {
    final t = _tokenCtrl.text.trim();
    if (!_isTokenValid(t)) {
      setState(() => _msg = "Require token");
      return;
    }

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text("Confirm vote"),
        content: Text("Vote for $candidateName?\n\nThis action may be final."),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("Cancel"),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text("Confirm"),
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
      _msg = err == null ? "Vote submitted successfully!" : " $err";
    });

    if (err == null) {
      setState(() {
        _votedCandidateId = candidateId; // mark this candidate as voted
      });
    await _load(); // refresh vote counts
    }
  }

  List<dynamic> _filteredSorted() {
    final q = _searchCtrl.text.trim().toLowerCase();

    final filtered = _candidates.where((c) {
      final nameEn = (c["name_en"] ?? "").toString().toLowerCase();
      final party = (c["party"] ?? "").toString().toLowerCase();
      final id = (c["id"] ?? "").toString().toLowerCase();
      if (q.isEmpty) return true;
      return nameEn.contains(q) || party.contains(q) || id.contains(q);
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

  IconData _msgIcon(String msg) => msg.startsWith("✅") ? Icons.check_circle : Icons.error_outline;

  // =========================
  // UI (Login/Home style)
  // =========================
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
                "Election",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              SizedBox(height: 2),
              Text(
                "Enter token and vote",
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
                  "Voting Token",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                ),
              ),
              TextButton.icon(
                onPressed: () {
                  _tokenCtrl.clear();
                  setState(() => _msg = null);
                },
                icon: const Icon(Icons.clear),
                label: const Text("Clear"),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _tokenCtrl,
            maxLines: 2,
            decoration: _fieldDecoration(
              hint: "Enter token from Gmail",
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
                      ? "Token looks valid."
                      : "No Token valid",
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
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _msg!,
                      style: TextStyle(
                        color: const Color.fromARGB(255, 223, 122, 114),
                        fontWeight: FontWeight.w800,
                        height: 1.25,
                      ),
                    ),
                  ),
                ],
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
              hint: "Search candidates…",
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
              child: Text("Sort by votes (high → low)"),
            ),
            PopupMenuItem(
              value: _SortBy.nameAsc,
              child: Text("Sort by name (A → Z)"),
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
                Text("Sort", style: TextStyle(fontWeight: FontWeight.w900)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // =========================
// Candidate Avatar (with photo_url support)
// =========================
Widget _buildCandidateAvatar(dynamic c, String displayName) {
  final photoUrl = (c["photo_url"] ?? "").toString().trim();

  if (photoUrl.isNotEmpty) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Image.network(
        photoUrl,
        width: 60,
        height: 60,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return _fallbackAvatar(displayName);
        },
      ),
    );
  }

  return _fallbackAvatar(displayName);
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

  final displayName =
      nameEn.isEmpty ? "Candidate #$id" : nameEn;

  final hasVotedThis = _votedCandidateId == id;

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

        // ================= TOP SECTION =================
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            // Avatar + Status Dot
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

                // Status Dot (Green -> Gray after vote)
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      color: hasVotedThis
                          ? Colors.grey.shade400
                          : Colors.green,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(width: 16),

            // Name + Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (nameKh.isNotEmpty)
                    Text(
                      nameKh,
                      style:const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),

                  Text(
                    displayName,
                    style:  TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),

                  const SizedBox(height: 6),
                ],
              ),
            ),

            // Votes Pill
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF1E3A8A).withOpacity(0.10),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                "Votes: $votes",
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

        // ================= TAGS =================
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 10, vertical: 4),
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
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  "គណបក្ស$party",
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

        // ================= VOTE BUTTON =================
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: (id == 0 || _loading)
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
              hasVotedThis
                  ? "Voted"
                  : "Vote for ${displayName.split(' ').first}",
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
    onTap: _hideKeyboard, // dismiss keyboard when tapping outside
    behavior: HitTestBehavior.translucent,
    child: Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: Stack(
        children: [
          // ✅ Gradient header like Login/Home
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
                                        "No candidates found.",
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

                      // ✅ Candidate list
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

          // ✅ Pretty loading overlay
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            child: _loading
                ? const _BlockingLoadingOverlay(text: "Loading...")
                : const SizedBox.shrink(),
          ),
        ],
      ),
    ),
  );
}
}

class _Chip extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Chip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.grey.withOpacity(0.35)),
        color: Colors.white,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: Colors.grey.shade700),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}


// =========================
// Pretty loading overlay (same style as Login/Home)
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