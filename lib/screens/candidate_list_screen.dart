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

  bool _loading = true;
  String? _msg;
  List<dynamic> _candidates = [];

  _SortBy _sortBy = _SortBy.votesDesc;

  @override
  void initState() {
    super.initState();
    _load();
    _searchCtrl.addListener(() => setState(() {}));
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _msg = null;
    });

    final list = await _auth.getCandidates();
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
      setState(() => _msg =
          "Paste the token from Gmail (starts with 0x, length 66).");
      return;
    }

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
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

    setState(() {
      _loading = false;
      _msg = err ?? "✅ Vote submitted successfully!";
    });

    // Optional: refresh after a successful vote to update counts
    if (err == null) {
      await _load();
    }
  }

  @override
  void dispose() {
    _tokenCtrl.dispose();
    _searchCtrl.dispose();
    super.dispose();
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
      msg.startsWith("✅") ? Colors.green.withOpacity(0.12) : Colors.red.withOpacity(0.12);

  IconData _msgIcon(String msg) => msg.startsWith("✅") ? Icons.check_circle : Icons.error;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final list = _filteredSorted();

    return Scaffold(
      appBar: AppBar(
        title: const Text("Election Ballot"),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
            tooltip: "Refresh",
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Token + status
            Card(
              elevation: 0,
              color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.55),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.verified_user, color: theme.colorScheme.primary),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text(
                            "Voting Token",
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
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
                      decoration: InputDecoration(
                        hintText: "Paste 0x… token from Gmail",
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        prefixIcon: const Icon(Icons.key),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Icon(
                          _isTokenValid(_tokenCtrl.text) ? Icons.check_circle : Icons.info,
                          size: 18,
                          color: _isTokenValid(_tokenCtrl.text)
                              ? Colors.green
                              : theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _isTokenValid(_tokenCtrl.text)
                                ? "Token looks valid."
                                : "Token must start with 0x and be 66 characters.",
                            style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
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
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(_msgIcon(_msg!), size: 18),
                            const SizedBox(width: 10),
                            Expanded(child: Text(_msg!)),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: 14),

            // Search + sort
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: "Search candidates…",
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
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
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: theme.dividerColor),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.sort),
                        SizedBox(width: 8),
                        Text("Sort"),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Candidates list
            if (_loading)
              const Padding(
                padding: EdgeInsets.only(top: 40),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              RefreshIndicator(
                onRefresh: _load,
                child: ListView.separated(
                  physics: const NeverScrollableScrollPhysics(),
                  shrinkWrap: true,
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) {
                    final c = list[i];

                    final id = int.tryParse(c["id"].toString()) ?? 0;
                    final nameEn = (c["name_en"] ?? "").toString().trim();
                    final party = (c["party"] ?? "").toString().trim();
                    final votes = int.tryParse(c["voteCount"].toString()) ?? 0;

                    final displayName = nameEn.isEmpty ? "Candidate #$id" : nameEn;

                    return Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                        side: BorderSide(color: theme.dividerColor.withOpacity(0.6)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(
                              radius: 24,
                              child: Text(
                                displayName.isNotEmpty ? displayName[0].toUpperCase() : "?",
                                style: const TextStyle(fontWeight: FontWeight.w800),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          displayName,
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 10,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          borderRadius: BorderRadius.circular(999),
                                          color: theme.colorScheme.primary.withOpacity(0.12),
                                        ),
                                        child: Text(
                                          "Votes: $votes",
                                          style: TextStyle(
                                            fontWeight: FontWeight.w700,
                                            color: theme.colorScheme.primary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      if (party.isNotEmpty)
                                        _Chip(
                                          icon: Icons.flag,
                                          text: party,
                                        ),
                                      _Chip(
                                        icon: Icons.badge,
                                        text: "ID: $id",
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: FilledButton.icon(
                                          onPressed: id == 0 || _loading
                                              ? null
                                              : () => _vote(id, displayName),
                                          icon: const Icon(Icons.how_to_vote),
                                          label: const Text("Vote"),
                                        ),
                                      ),
                                    ],
                                  )
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
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
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: theme.dividerColor.withOpacity(0.7)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}