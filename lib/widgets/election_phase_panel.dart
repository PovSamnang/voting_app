import 'dart:math' as math;
import 'package:flutter/material.dart';

class ElectionPhasePanel extends StatelessWidget {
  final Map<String, dynamic> status;
  final bool loaded;

  const ElectionPhasePanel({
    super.key,
    required this.status,
    this.loaded = true,
  });

  String get _phase => (status["phase"] ?? "NONE").toString().toUpperCase();

  String get _phaseKh =>
      (status["phase_label_kh"] ?? "មិនទាន់បើកវគ្គ").toString();

  int get _electionId => int.tryParse("${status["election_id"] ?? 0}") ?? 0;
  int get _startTs => int.tryParse("${status["start_ts"] ?? 0}") ?? 0;
  int get _endTs => int.tryParse("${status["end_ts"] ?? 0}") ?? 0;
  int get _chainNowTs => int.tryParse("${status["chain_now_ts"] ?? 0}") ?? 0;
  int get _nextTs => int.tryParse("${status["next_transition_ts"] ?? 0}") ?? 0;

  int get _currentIndex {
    switch (_phase) {
      case "DRAFT":
        return 0;
      case "BEFORE_START":
        return 1;
      case "ACTIVE":
        return 2;
      case "ENDED":
        return 3;
      default:
        return -1;
    }
  }

  String _two(int n) => n.toString().padLeft(2, "0");

  String _fmtTs(int ts) {
    if (ts <= 0) return "—";
    final d = DateTime.fromMillisecondsSinceEpoch(ts * 1000).toLocal();
    return "${_two(d.day)}/${_two(d.month)}/${d.year} ${_two(d.hour)}:${_two(d.minute)}";
  }

  String _formatCountdown(int sec) {
    final s = math.max(0, sec);
    final d = s ~/ 86400;
    final h = (s % 86400) ~/ 3600;
    final m = (s % 3600) ~/ 60;
    final ss = s % 60;

    if (d > 0) return "${d}d ${h}h ${m}m ${ss}s";
    return "${h}h ${m}m ${ss}s";
  }

  Color _badgeColor() {
    switch (_phase) {
      case "DRAFT":
        return const Color(0xFFB98A1D);
      case "BEFORE_START":
        return const Color(0xFF0F766E);
      case "ACTIVE":
        return const Color(0xFF15803D);
      case "ENDED":
        return const Color(0xFF6B7280);
      default:
        return const Color(0xFF374151);
    }
  }

  Widget _stepBox({
    required String number,
    required String title,
    required bool active,
    required bool done,
  }) {
    final Color bg = done
        ? Colors.green.withOpacity(0.10)
        : active
            ? const Color(0xFF0F2D6B).withOpacity(0.10)
            : Colors.grey.shade100;

    final Color border = done
        ? Colors.green.withOpacity(0.25)
        : active
            ? const Color(0xFFD4AF37).withOpacity(0.55)
            : Colors.grey.shade300;

    final Color text = done
        ? Colors.green.shade800
        : active
            ? const Color(0xFF0F2D6B)
            : Colors.grey.shade700;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: border),
        ),
        child: Column(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: text.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                number,
                style: TextStyle(
                  color: text,
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                height: 1.25,
                fontWeight: FontWeight.w800,
                color: text,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!loaded) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFCF3),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.30)),
        ),
        child: Row(
          children: [
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2.2),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                "កំពុងទាញយកស្ថានភាពការបោះឆ្នោត...",
                style: TextStyle(
                  color: Colors.grey.shade800,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      );
    }

    final countdown = (_nextTs > 0 && _chainNowTs > 0)
        ? math.max(0, _nextTs - _chainNowTs)
        : 0;

    final showCountdown = _phase == "BEFORE_START" || _phase == "ACTIVE";

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFCF3),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.30)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFF0F2D6B).withOpacity(0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.account_balance_rounded,
                  color: Color(0xFF0F2D6B),
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  "ស្ថានភាពការបោះឆ្នោត",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F2D6B),
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: _badgeColor().withOpacity(0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  _phaseKh,
                  style: TextStyle(
                    color: _badgeColor(),
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            "លេខវគ្គបោះឆ្នោត: ${_electionId == 0 ? "—" : "#$_electionId"}",
            style: TextStyle(
              color: Colors.grey.shade800,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            "រយៈពេល៖ ${_fmtTs(_startTs)}  →  ${_fmtTs(_endTs)}",
            style: TextStyle(
              color: Colors.grey.shade700,
              fontSize: 12,
              height: 1.35,
            ),
          ),
          if (showCountdown) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF0F2D6B).withOpacity(0.06),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: const Color(0xFF0F2D6B).withOpacity(0.15),
                ),
              ),
              child: Text(
                _phase == "BEFORE_START"
                    ? "ការបោះឆ្នោតនឹងចាប់ផ្ដើមក្នុង៖ ${_formatCountdown(countdown)}"
                    : "ការបោះឆ្នោតនឹងបិទក្នុង៖ ${_formatCountdown(countdown)}",
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F2D6B),
                ),
              ),
            ),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              _stepBox(
                number: "១",
                title: "ដំណាក់កាល\nចុះឈ្មោះ",
                active: _currentIndex == 0,
                done: _currentIndex > 0,
              ),
              const SizedBox(width: 8),
              _stepBox(
                number: "២",
                title: "ដំណាក់កាល\nត្រួតពិនិត្យ",
                active: _currentIndex == 1,
                done: _currentIndex > 1,
              ),
              const SizedBox(width: 8),
              _stepBox(
                number: "៣",
                title: "ដំណាក់កាល\nបោះឆ្នោត",
                active: _currentIndex == 2,
                done: _currentIndex > 2,
              ),
              const SizedBox(width: 8),
              _stepBox(
                number: "៤",
                title: "បញ្ចប់\nការបោះ",
                active: _currentIndex == 3,
                done: false,
              ),
            ],
          ),
        ],
      ),
    );
  }
}