import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import AdminShell from "../../components/AdminShell";

function formatCountdown(sec) {
  const s = Math.max(0, Number(sec || 0));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m ${secs}s`;
  return `${hours}h ${mins}m ${secs}s`;
}

function tsToLocalInput(tsSec) {
  if (!tsSec || tsSec <= 0) return "";
  const d = new Date(tsSec * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function localInputToTsSec(v) {
  const d = new Date(v);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

function fmtTs(ts) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function phaseToBadge(phase) {
  const p = String(phase || "NONE").toUpperCase();

  if (p === "DRAFT") {
    return { cls: "bg-warning text-dark", text: "ដំណាក់កាលចុះឈ្មោះ" };
  }
  if (p === "BEFORE_START") {
    return { cls: "bg-info text-dark", text: "ដំណាក់កាលត្រួតពិនិត្យ" };
  }
  if (p === "ACTIVE") {
    return { cls: "bg-success", text: "ដំណាក់កាលបោះឆ្នោត" };
  }
  if (p === "ENDED") {
    return { cls: "bg-secondary", text: "បញ្ចប់ការបោះ" };
  }
  return { cls: "bg-dark", text: "មិនទាន់បើកវគ្គ" };
}

function computePhaseFrom(nowTs, configured, startTs, endTs) {
  if (!configured) return "DRAFT";
  if (nowTs >= endTs) return "ENDED";
  if (nowTs >= startTs) return "ACTIVE";
  return "BEFORE_START";
}

function rowClass(v) {
  if (v?.expired) return "table-danger";
  if (v?.under18) return "table-warning";
  return "";
}

function CandidateCell({ c }) {
  const nameEn = c?.name_en || `Candidate #${c?.id ?? "—"}`;
  const nameKh = c?.name_kh || "";
  const photo = String(c?.photo_url || "").trim();

  return (
    <div className="d-flex align-items-center gap-3">
      {photo ? (
        <img
          src={photo}
          alt="candidate"
          style={{
            width: 48,
            height: 48,
            objectFit: "cover",
            borderRadius: 12,
            border: "2px solid rgba(212,175,55,.25)",
            background: "#fff",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg,#f4ecd0,#ffffff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            border: "2px solid rgba(212,175,55,.25)",
          }}
        >
          👤
        </div>
      )}

      <div>
        <div className="fw-semibold" style={{ color: "#00113a" }}>{nameEn}</div>
        {nameKh ? <div className="text-muted small">{nameKh}</div> : null}
      </div>
    </div>
  );
}

export default function ElectionAdmin() {
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "";

  const api = useMemo(() => {
    const token = localStorage.getItem("admin_token") || "";
    return axios.create({
      baseURL: API_URL,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(ADMIN_KEY ? { "x-admin-key": ADMIN_KEY } : {}),
      },
    });
  }, [API_URL, ADMIN_KEY]);

  const [candForm, setCandForm] = useState({
    name_en: "",
    name_kh: "",
    party: "",
    photo_url: "",
  });

  const [period, setPeriod] = useState({ startLocal: "", endLocal: "" });

  const [status, setStatus] = useState({
    election_id: 0,
    configured: false,
    start_ts: 0,
    end_ts: 0,
    chain_now_ts: 0,
    next_transition_ts: 0,
    phase: "NONE",
    phase_label_kh: "មិនទាន់បើកវគ្គ",
    active_chain: false,
  });

  const [currentReport, setCurrentReport] = useState(null);
  const [elections, setElections] = useState([]);
  const [reportSel, setReportSel] = useState("current");
  const [reportView, setReportView] = useState(null);

  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("setup");

  const chainNowSec = Number(status.chain_now_ts || Math.floor(Date.now() / 1000));
  const phaseBadge = phaseToBadge(status.phase);
    const hasLiveCurrent =
    status.election_id > 0 &&
    status.phase !== "ENDED" &&
    status.phase !== "NONE";

    const reportOptions = useMemo(() => {
      if (hasLiveCurrent) {
        return elections.filter(
          (e) => Number(e.election_id) !== Number(status.election_id)
        );
      }
      return elections;
    }, [elections, hasLiveCurrent, status.election_id]);

  const countdownToNext =
    status.next_transition_ts && status.chain_now_ts
      ? Math.max(0, status.next_transition_ts - status.chain_now_ts)
      : 0;

  const canCreateDraft = status.phase === "NONE" || status.phase === "ENDED";
  const canSetPeriod = status.phase === "DRAFT" && status.election_id > 0;
  const canAddCandidates = status.election_id > 0 && status.phase === "DRAFT";
  const canEditCandidates =
    status.election_id > 0 &&
    (status.phase === "DRAFT" || status.phase === "BEFORE_START");

  const logout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login", { replace: true });
  };

  const loadVotingStatus = async () => {
    const res = await axios.get(`${API_URL}/voting-status`);
    const s = res.data || {};

    const phase = String(
      s.phase || (s.configured ? (s.active_chain ? "ACTIVE" : "ENDED") : "DRAFT")
    ).toUpperCase();

    setStatus({
      election_id: Number(s.election_id || 0),
      configured: Boolean(s.configured),
      start_ts: Number(s.start_ts || 0),
      end_ts: Number(s.end_ts || 0),
      chain_now_ts: Number(s.chain_now_ts || s.now_ts || 0),
      next_transition_ts: Number(s.next_transition_ts || 0),
      phase,
      phase_label_kh: String(s.phase_label_kh || ""),
      active_chain: Boolean(s.active_chain ?? s.active ?? false),
    });

    setPeriod((p) => ({
      startLocal: p.startLocal || tsToLocalInput(Number(s.start_ts || 0)),
      endLocal: p.endLocal || tsToLocalInput(Number(s.end_ts || 0)),
    }));
  };

  const loadCurrentReport = async () => {
    try {
      const res = await api.get("/admin/report/current");
      setCurrentReport(res.data || null);
    } catch {
      setCurrentReport(null);
    }
  };

  const loadElections = async () => {
    try {
      const res = await api.get("/admin/elections");
      setElections(res.data?.elections || []);
    } catch {
      setElections([]);
    }
  };

  const loadReportView = async (sel = reportSel) => {
    try {
      const params = { lists: 1, limit: 2000 };

      if (sel === "current") {
        const res = await api.get("/admin/report/current", { params });
        setReportView(res.data || null);
      } else {
        const eid = Number(sel);
        if (!eid) return setReportView(null);
        const res = await api.get(`/admin/report/${eid}`, { params });
        setReportView(res.data || null);
      }
    } catch (err) {
      const data = err?.response?.data;
      setMsg({
        type: "danger",
        text: `${data?.message || "Load report failed"}${
          data?.error ? ` (${data.error})` : ""
        }`,
      });
      setReportView(null);
    }
  };

  useEffect(() => {
  if (!ADMIN_KEY) {
    setMsg({ type: "danger", text: "Missing VITE_ADMIN_KEY in admin .env" });
    return;
  }

  loadVotingStatus().catch(() => {});
  loadCurrentReport().catch(() => {});
  loadElections().catch(() => {});
}, [ADMIN_KEY]);

useEffect(() => {
  if (!ADMIN_KEY) return;

  loadReportView(reportSel).catch(() => {});

  const t = setInterval(() => {
    loadVotingStatus().catch(() => {});
    loadCurrentReport().catch(() => {});
    loadElections().catch(() => {});
    loadReportView(reportSel).catch(() => {});
  }, 3000);

  return () => clearInterval(t);
}, [ADMIN_KEY, reportSel]);

    useEffect(() => {
  if (!status.election_id) return;

  if (status.phase === "ENDED" && reportSel === "current") {
    setReportSel(String(status.election_id));
  }
}, [status.phase, status.election_id, reportSel]);

  const createDraftElection = async () => {
    setMsg(null);
    try {
      setBusy(true);
      const res = await api.post("/admin/elections/draft");
      setMsg({
        type: "success",
        text: `Draft election created (ID: ${res.data?.election_id ?? "?"})`,
      });
      setCandForm({ name_en: "", name_kh: "", party: "", photo_url: "" });
      setPeriod({ startLocal: "", endLocal: "" });

      await loadVotingStatus();
      await loadCurrentReport();
      await loadElections();

      setReportSel("current");
      await loadReportView("current");

      setTab("candidates");
    } catch (err) {
      setMsg({
        type: "danger",
        text: err?.response?.data?.message || err.message || "Create draft failed",
      });
    } finally {
      setBusy(false);
    }
  };

  const setElectionPeriod = async (e) => {
    e.preventDefault();
    setMsg(null);

    const start_ts = localInputToTsSec(period.startLocal);
    const end_ts = localInputToTsSec(period.endLocal);

    if (!start_ts || !end_ts) {
      return setMsg({ type: "danger", text: "Please select valid Start and End datetime." });
    }
    if (end_ts <= start_ts) {
      return setMsg({ type: "danger", text: "End time must be after Start time." });
    }

    try {
      setBusy(true);
      await api.post("/admin/elections", { start_ts, end_ts });

      setMsg({ type: "success", text: "Election period set" });

      await loadVotingStatus();
      await loadCurrentReport();
      await loadElections();

      setTab("report");
      setReportSel("current");
      await loadReportView("current");
    } catch (err) {
      setMsg({
        type: "danger",
        text: err?.response?.data?.message || err.message || "Set period failed",
      });
    } finally {
      setBusy(false);
    }
  };

  const addCandidate = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!candForm.name_en.trim()) {
      return setMsg({ type: "danger", text: "name_en is required" });
    }
    if (!status.election_id) {
      return setMsg({ type: "danger", text: "Create draft election first." });
    }

    try {
      setBusy(true);
      const res = await api.post("/admin/candidates", {
        name_en: candForm.name_en.trim(),
        name_kh: candForm.name_kh.trim(),
        party: candForm.party.trim(),
        photo_url: candForm.photo_url.trim(),
      });

      setMsg({
        type: "success",
        text: `Candidate added ${res.data?.tx_hash ? `(TX: ${res.data.tx_hash})` : ""}`,
      });

      setCandForm({ name_en: "", name_kh: "", party: "", photo_url: "" });
      await loadCurrentReport();
      if (reportSel === "current") await loadReportView("current");
    } catch (err) {
      setMsg({
        type: "danger",
        text: err?.response?.data?.message || err.message || "Add candidate failed",
      });
    } finally {
      setBusy(false);
    }
  };

  const currentCandidates = currentReport?.candidates || [];
  const currentWinner =
    currentReport?.winner || (currentCandidates.length ? currentCandidates[0] : null);
  const currentTotalVotes = currentCandidates.reduce(
    (s, r) => s + Number(r.voteCount || 0),
    0
  );

  const progress =
    status.configured && status.start_ts && status.end_ts && status.end_ts > status.start_ts
      ? clamp(((chainNowSec - status.start_ts) / (status.end_ts - status.start_ts)) * 100, 0, 100)
      : 0;

  const viewCandidates = reportView?.candidates || [];
  const viewWinner = reportView?.winner || (viewCandidates.length ? viewCandidates[0] : null);
  const viewTotalVotes = viewCandidates.reduce((s, r) => s + Number(r.voteCount || 0), 0);

  const viewConfigured = Boolean(reportView?.configured ?? false);
  const viewStart = Number(reportView?.start_ts || 0);
  const viewEnd = Number(reportView?.end_ts || 0);
  const viewPhase =
    reportSel === "current"
      ? status.phase
      : computePhaseFrom(chainNowSec, viewConfigured, viewStart, viewEnd);
  const viewPhaseBadge = phaseToBadge(viewPhase);

  const onChangeReportSel = (v) => {
  setMsg(null);
  setReportSel(v);
};

  const votedList = reportView?.votersRegisteredVoted || reportView?.votersVoted || [];

  return (
    <AdminShell
      active="elections"
      onLogout={logout}
      adminName="Admin"
      title="Election Administration"
      subtitle="Royal Government styled election management console for draft creation, candidate registration, scheduling, and archived results."
    >
      <style>{`
        .ea-page{
          color:#191c1d;
        }

        .ea-watermark{
          background-image:url("data:image/svg+xml,%3Csvg width='84' height='84' viewBox='0 0 84 84' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='0.06'%3E%3Cpath d='M42 10l5.5 18.5L66 34l-18.5 5.5L42 58l-5.5-18.5L18 34l18.5-5.5z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }

        .ea-hero{
          position:relative;
          overflow:hidden;
          background:linear-gradient(135deg,#00113a 0%, #002366 55%, #0d2f7a 100%);
          color:#fff;
          border-radius:18px;
          padding:28px 28px 24px;
          border-bottom:4px solid #fed65b;
          box-shadow:0 18px 34px rgba(0,17,58,.16);
          margin-bottom:24px;
        }

        .ea-hero::after{
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(135deg,rgba(255,255,255,.06),transparent 40%);
          pointer-events:none;
        }

        .ea-hero-inner{
          position:relative;
          z-index:2;
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:18px;
          flex-wrap:wrap;
        }

        .ea-kicker{
          display:flex;
          align-items:center;
          gap:12px;
          margin-bottom:10px;
        }

        .ea-kicker-line{
          width:34px;
          height:1px;
          background:#ffe088;
        }

        .ea-kicker-text{
          color:#ffe088;
          font-size:11px;
          font-weight:900;
          letter-spacing:.18em;
          text-transform:uppercase;
        }

        .ea-title-kh{
          margin:0;
          font-size:34px;
          line-height:1.08;
          font-weight:900;
          letter-spacing:-.03em;
        }

        .ea-title-en{
          margin:8px 0 0;
          font-size:15px;
          color:#cdd8ff;
          font-weight:700;
        }

        .ea-flow{
          margin-top:12px;
          color:rgba(255,255,255,.84);
          font-size:13px;
          font-weight:600;
          line-height:1.7;
          max-width:760px;
        }

        .ea-status{
          min-width:300px;
          background:rgba(255,255,255,.08);
          border:1px solid rgba(255,255,255,.12);
          border-radius:16px;
          padding:16px 18px;
          backdrop-filter:blur(8px);
        }

        .ea-status-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:8px;
        }

        .ea-status-label{
          margin:0;
          color:#ffe088;
          font-size:11px;
          font-weight:900;
          letter-spacing:.16em;
          text-transform:uppercase;
        }

        .ea-status-meta{
          color:rgba(255,255,255,.76);
          font-size:12px;
          font-weight:700;
        }

        .ea-refresh{
          color:#b9c8ff;
          font-size:12px;
          font-weight:700;
        }

        .ea-alert .alert{
          border:none;
          border-radius:14px;
          box-shadow:0 10px 22px rgba(0,0,0,.05);
        }

        .ea-stat-card{
          background:#fff;
          border:none;
          border-radius:16px;
          box-shadow:0 10px 24px rgba(0,17,58,.07);
          overflow:hidden;
          height:100%;
        }

        .ea-stat-card .card-body{
          padding:22px 22px 20px;
          position:relative;
        }

        .ea-stat-card .card-body::before{
          content:"";
          position:absolute;
          left:0;
          top:0;
          bottom:0;
          width:4px;
          background:#d4af37;
        }

        .ea-stat-label{
          margin-bottom:8px;
          color:#757682;
          font-size:11px;
          font-weight:900;
          letter-spacing:.14em;
          text-transform:uppercase;
        }

        .ea-stat-value{
          color:#00113a;
        }

        .ea-progress{
          height:10px !important;
          border-radius:999px;
          overflow:hidden;
          background:#edf0f5;
        }

        .ea-tabs{
          display:flex;
          gap:12px;
          flex-wrap:wrap;
          margin:10px 0 22px;
        }

        .ea-tab{
          border:none;
          border-radius:999px;
          padding:12px 18px;
          background:#fff;
          color:#00113a;
          font-size:12px;
          font-weight:900;
          letter-spacing:.06em;
          box-shadow:0 8px 18px rgba(0,17,58,.06);
          transition:.18s ease;
        }

        .ea-tab:hover{
          transform:translateY(-1px);
        }

        .ea-tab.active{
          background:linear-gradient(135deg,#00113a,#002f7a);
          color:#ffe088;
          border:1px solid rgba(212,175,55,.28);
        }

        .ea-panel{
          background:#fff;
          border:none;
          border-radius:18px;
          box-shadow:0 14px 28px rgba(0,17,58,.08);
          overflow:hidden;
        }

        .ea-panel-head{
          background:linear-gradient(180deg,#fff9e7 0%, #ffffff 100%);
          border-bottom:1px solid rgba(212,175,55,.22);
          padding:18px 24px;
        }

        .ea-panel-title{
          margin:0;
          color:#00113a;
          font-size:20px;
          font-weight:900;
          letter-spacing:-.02em;
        }

        .ea-panel-sub{
          margin:6px 0 0;
          color:#6b7280;
          font-size:13px;
          font-weight:600;
        }

        .ea-step{
          border:1px solid rgba(212,175,55,.22);
          border-radius:16px;
          padding:18px;
          background:linear-gradient(180deg,#fffefb,#ffffff);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.7);
        }

        .ea-step-title{
          margin:0;
          color:#00113a;
          font-size:16px;
          font-weight:900;
        }

        .ea-step-sub{
          margin:6px 0 0;
          color:#6b7280;
          font-size:13px;
          font-weight:600;
        }

        .ea-soft-box{
          border:1px solid rgba(117,118,130,.16);
          border-radius:16px;
          background:#fafbfc;
          padding:18px;
        }

        .ea-soft-mini{
          border:1px solid rgba(212,175,55,.18);
          border-radius:14px;
          background:linear-gradient(180deg,#fffef8,#ffffff);
          padding:18px;
          height:100%;
        }

        .ea-soft-title{
          color:#757682;
          font-size:11px;
          font-weight:900;
          letter-spacing:.14em;
          text-transform:uppercase;
          margin-bottom:8px;
        }

        .ea-form-label{
          color:#00113a;
          font-size:12px;
          font-weight:900;
          letter-spacing:.04em;
          margin-bottom:8px;
        }

        .ea-input,
        .ea-select{
          min-height:46px;
          border-radius:12px !important;
          border:1px solid #d9dde4 !important;
          box-shadow:none !important;
        }

        .ea-input:focus,
        .ea-select:focus{
          border-color:#735c00 !important;
          box-shadow:0 0 0 .2rem rgba(212,175,55,.18) !important;
        }

        .ea-btn-primary{
          background:linear-gradient(135deg,#00113a,#002f7a);
          border:none;
          color:#ffe088;
          border-radius:12px;
          padding:10px 18px;
          font-weight:800;
          box-shadow:0 10px 18px rgba(0,17,58,.14);
        }

        .ea-btn-gold{
          background:linear-gradient(135deg,#b98a1d,#d4af37);
          border:none;
          color:#fff;
          border-radius:12px;
          padding:10px 18px;
          font-weight:800;
          box-shadow:0 10px 18px rgba(185,138,29,.18);
        }

        .ea-btn-light{
          background:#fff;
          border:1px solid rgba(117,118,130,.25);
          color:#00113a;
          border-radius:12px;
          padding:10px 18px;
          font-weight:800;
        }

        .ea-btn-primary:disabled,
        .ea-btn-gold:disabled,
        .ea-btn-light:disabled{
          opacity:.68;
        }

        .ea-table-wrap{
          border:1px solid rgba(117,118,130,.12);
          border-radius:16px;
          overflow:hidden;
          background:#fff;
        }

        .ea-table{
          margin-bottom:0;
        }

        .ea-table thead th{
          background:linear-gradient(180deg,#00113a 0%, #002366 100%) !important;
          color:#ffe088 !important;
          border-color:rgba(255,255,255,.08) !important;
          font-size:11px;
          font-weight:900;
          letter-spacing:.12em;
          text-transform:uppercase;
          padding:14px 14px;
          vertical-align:middle;
        }

        .ea-table tbody td{
          padding:14px 14px;
          vertical-align:middle;
          border-color:#edf0f4;
        }

        .ea-table tbody tr:hover{
          background:#fbfcff;
        }

        .ea-report-top{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:18px;
          flex-wrap:wrap;
          margin-bottom:18px;
        }

        .ea-report-title{
          margin:0;
          color:#00113a;
          font-size:22px;
          font-weight:900;
          letter-spacing:-.02em;
        }

        .ea-report-sub{
          margin:6px 0 0;
          color:#6b7280;
          font-size:13px;
          font-weight:600;
        }

        .ea-pill-row{
          display:flex;
          flex-wrap:wrap;
          gap:10px;
          margin-bottom:16px;
        }

        .ea-pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 12px;
          border-radius:999px;
          background:#eef2fa;
          color:#00113a;
          font-size:11px;
          font-weight:900;
          letter-spacing:.08em;
          text-transform:uppercase;
        }

        .ea-count-badge{
          background:#00113a !important;
          color:#ffe088 !important;
          border-radius:999px;
          padding:8px 12px;
          font-size:11px;
          font-weight:900;
          letter-spacing:.08em;
        }

        .ea-section-title{
          color:#00113a;
          font-size:16px;
          font-weight:900;
        }

        .ea-muted-note{
          color:#6b7280;
          font-size:13px;
          font-weight:600;
        }

        .ea-empty{
          color:#6b7280;
          font-weight:600;
        }

        @media (max-width: 820px){
          .ea-title-kh{
            font-size:28px;
          }
          .ea-status{
            width:100%;
            min-width:auto;
          }
          .ea-report-top{
            flex-direction:column;
          }
        }
      `}</style>

      <div className="container py-4 ea-page">
        <section className="ea-hero ea-watermark">
          <div className="ea-hero-inner">
            <div>
              <div className="ea-kicker">
                <span className="ea-kicker-line" />
                <span className="ea-kicker-text">
                  Kingdom of Cambodia • National Election Committee
                </span>
              </div>

              <h2 className="ea-title-kh">ផ្ទាំងគ្រប់គ្រងការបោះឆ្នោតជាតិ</h2>
              <p className="ea-title-en">Official Election Administration Console</p>

              <div className="ea-flow">
                <b>មុនវគ្គបោះឆ្នោត</b>: ស្វែងរកឈ្មោះ និងស្នើកែប្រែឯកសារ →{" "}
                <b>ដំណាក់កាលចុះឈ្មោះ</b>: ស្នើ token និងបន្ថែមបេក្ខជន →{" "}
                <b>ដំណាក់កាលត្រួតពិនិត្យ</b>: រង់ចាំ / រាប់ថយក្រោយ / កែឬបិទបេក្ខជន →{" "}
                <b>ដំណាក់កាលបោះឆ្នោត</b>: បោះឆ្នោត និងមើលលទ្ធផលផ្ទាល់ →{" "}
                <b>បញ្ចប់ការបោះ</b>: មើលរបាយការណ៍ និងប្រវត្តិ
              </div>
            </div>

            <div className="ea-status">
              <div className="ea-status-top">
                <p className="ea-status-label mb-0">Current Election</p>
                <span className={`badge ${phaseBadge.cls}`}>{phaseBadge.text}</span>
              </div>

              <div className="ea-status-meta mb-2">
                Election ID: <b>#{status.election_id || "—"}</b>
              </div>

              {status.phase === "BEFORE_START" && (
                <div className="ea-status-meta mb-2">
                  ចាប់ផ្ដើមបោះឆ្នោតក្នុង៖ <b>{formatCountdown(countdownToNext)}</b>
                </div>
              )}

              {status.phase === "ACTIVE" && (
                <div className="ea-status-meta mb-2">
                  បិទការបោះឆ្នោតក្នុង៖ <b>{formatCountdown(countdownToNext)}</b>
                </div>
              )}

              <div className="ea-refresh">Auto refresh: every 3s</div>
            </div>
          </div>
        </section>

        {msg && (
          <div className="ea-alert mb-4">
            <div className={`alert alert-${msg.type} shadow-sm`}>{msg.text}</div>
          </div>
        )}

        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card ea-stat-card">
              <div className="card-body">
                <div className="ea-stat-label">Voting Period (Current)</div>
                <div className="fw-semibold ea-stat-value">
                  {fmtTs(status.start_ts)} → {fmtTs(status.end_ts)}
                </div>

                {status.configured ? (
                  <div className="progress ea-progress mt-3">
                    <div
                      className={`progress-bar ${status.active_chain ? "bg-success" : "bg-secondary"}`}
                      role="progressbar"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                ) : (
                  <div className="mt-2 small text-muted">Draft: period not set yet.</div>
                )}

                <div className="mt-2 small text-muted">
                  Chain now: <b>{fmtTs(status.chain_now_ts)}</b>
                </div>

                {status.phase === "BEFORE_START" && (
                  <div className="mt-2 small text-muted">
                    Voting starts in: <b>{formatCountdown(countdownToNext)}</b>
                  </div>
                )}

                {status.phase === "ACTIVE" && (
                  <div className="mt-2 small text-muted">
                    Voting ends in: <b>{formatCountdown(countdownToNext)}</b>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card ea-stat-card">
              <div className="card-body">
                <div className="ea-stat-label">Registrations (Current)</div>
                <div className="display-6 mb-0 ea-stat-value">
                  {currentReport?.registered ?? "—"}
                </div>
                <div className="text-muted small mt-2">
                  Voted: <b>{currentReport?.voted ?? "—"}</b> • Not voted:{" "}
                  <b>{currentReport?.registered_not_voted ?? "—"}</b>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card ea-stat-card">
              <div className="card-body">
                <div className="ea-stat-label">Winner / Leader (Current)</div>
                {currentWinner ? (
                  <>
                    <CandidateCell c={currentWinner} />
                    <div className="mt-3 d-flex gap-2 flex-wrap">
                      <span className="badge bg-success">
                        Votes: {Number(currentWinner.voteCount || 0)}
                      </span>
                      <span className="badge bg-dark">Total votes: {currentTotalVotes}</span>
                    </div>
                  </>
                ) : (
                  <div className="ea-empty">No candidates yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="ea-tabs">
          <button
            className={`ea-tab ${tab === "setup" ? "active" : ""}`}
            onClick={() => setTab("setup")}
          >
            1) Draft & Period
          </button>
          <button
            className={`ea-tab ${tab === "candidates" ? "active" : ""}`}
            onClick={() => setTab("candidates")}
          >
            2) Candidates
          </button>
          <button
            className={`ea-tab ${tab === "report" ? "active" : ""}`}
            onClick={() => setTab("report")}
          >
            3) Report & Results
          </button>
        </div>

        {tab === "setup" && (
          <div className="card ea-panel mb-4">
            <div className="ea-panel-head">
              <h5 className="ea-panel-title">Election Setup & Scheduling</h5>
              <p className="ea-panel-sub">
                Official administrative tools for draft creation and voting period control.
              </p>
            </div>

            <div className="card-body p-4">
              <div className="ea-step mb-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <h6 className="ea-step-title">Step A — Create Draft Election</h6>
                    <p className="ea-step-sub">
                      Allowed only if there is no election or the previous election ended.
                    </p>
                  </div>

                  <button
                    className="btn ea-btn-primary"
                    disabled={busy || !canCreateDraft}
                    onClick={createDraftElection}
                  >
                    {busy ? "Working..." : "Create Draft"}
                  </button>
                </div>
              </div>

              <div className="ea-soft-box">
                <div className="ea-step-title mb-3">Step B — Set Voting Period (Start/End)</div>

                {!canSetPeriod && (
                  <div className="alert alert-info mt-1">
                    You can set period only when election is in <b>DRAFT</b> phase.
                  </div>
                )}

                <form onSubmit={setElectionPeriod} className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label ea-form-label">Start (local time)</label>
                    <input
                      className="form-control ea-input"
                      type="datetime-local"
                      value={period.startLocal}
                      onChange={(e) => setPeriod((p) => ({ ...p, startLocal: e.target.value }))}
                      required
                      disabled={!canSetPeriod || busy}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label ea-form-label">End (local time)</label>
                    <input
                      className="form-control ea-input"
                      type="datetime-local"
                      value={period.endLocal}
                      onChange={(e) => setPeriod((p) => ({ ...p, endLocal: e.target.value }))}
                      required
                      disabled={!canSetPeriod || busy}
                    />
                  </div>

                  <div className="col-12 d-flex flex-wrap gap-2">
                    <button className="btn ea-btn-gold" disabled={busy || !canSetPeriod}>
                      {busy ? "Saving..." : "Set Period"}
                    </button>

                    <button
                      type="button"
                      className="btn ea-btn-light"
                      disabled={busy}
                      onClick={() => {
                        setMsg(null);
                        loadVotingStatus();
                        loadCurrentReport();
                        loadElections();
                      }}
                    >
                      Refresh
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {tab === "candidates" && (
          <div className="card ea-panel mb-4">
            <div className="ea-panel-head">
              <h5 className="ea-panel-title">Candidate Registration & Listing</h5>
              <p className="ea-panel-sub">
                Manage official candidate entries for the current election cycle.
              </p>
            </div>

            <div className="card-body p-4">
              {!status.election_id ? (
                <div className="alert alert-info">
                  Create a <b>Draft election</b> first.
                </div>
              ) : !canAddCandidates ? (
                <div className="alert alert-warning">
                  Adding candidates is locked because election is <b>{phaseBadge.text}</b>.
                  {canEditCandidates ? " You may still edit/disable candidates in this phase if you add that UI later." : ""}
                </div>
              ) : null}

              <div className="ea-soft-box mb-4">
                <form onSubmit={addCandidate} className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label ea-form-label">Name EN *</label>
                    <input
                      className="form-control ea-input"
                      value={candForm.name_en}
                      onChange={(e) => setCandForm((p) => ({ ...p, name_en: e.target.value }))}
                      required
                      disabled={!canAddCandidates || busy}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label ea-form-label">Name KH</label>
                    <input
                      className="form-control ea-input"
                      value={candForm.name_kh}
                      onChange={(e) => setCandForm((p) => ({ ...p, name_kh: e.target.value }))}
                      disabled={!canAddCandidates || busy}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label ea-form-label">Party</label>
                    <input
                      className="form-control ea-input"
                      value={candForm.party}
                      onChange={(e) => setCandForm((p) => ({ ...p, party: e.target.value }))}
                      disabled={!canAddCandidates || busy}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label ea-form-label">Photo URL</label>
                    <input
                      className="form-control ea-input"
                      value={candForm.photo_url}
                      onChange={(e) => setCandForm((p) => ({ ...p, photo_url: e.target.value }))}
                      disabled={!canAddCandidates || busy}
                      placeholder="https://... (direct .jpg/.png preferred)"
                    />
                    <div className="form-text">
                      Tip: Use a direct image URL (ends with .jpg/.png). Some links (Drive/Facebook) won’t render.
                    </div>
                  </div>

                  <div className="col-12 d-flex gap-2">
                    <button className="btn ea-btn-primary" disabled={!canAddCandidates || busy}>
                      {busy ? "Adding..." : "Add Candidate"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="ea-table-wrap">
                <div className="table-responsive">
                  <table className="table ea-table align-middle">
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>ID</th>
                        <th>Candidate</th>
                        <th>Party</th>
                        <th style={{ width: 120 }}>Votes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCandidates.map((c) => (
                        <tr key={c.id}>
                          <td className="text-center fw-bold">{c.id}</td>
                          <td><CandidateCell c={c} /></td>
                          <td>{c.party || "-"}</td>
                          <td className="text-center fw-bold">{Number(c.voteCount || 0)}</td>
                        </tr>
                      ))}
                      {currentCandidates.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-4">
                            No candidates yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "report" && (
          <div className="card ea-panel">
            <div className="ea-panel-head">
              <h5 className="ea-panel-title">Election Report & Historical Archive</h5>
              <p className="ea-panel-sub">
                Review live statistics and archived election records from previous cycles.
              </p>
            </div>

            <div className="card-body p-4">
              <div className="ea-report-top">
                <div>
                  <h5 className="ea-report-title">Election Report (Current + History)</h5>
                  <div className="ea-report-sub">
                    Choose a past election to view archived data.
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <div className="ea-muted-note">View:</div>
                  <select
  className="form-select ea-select"
  style={{ width: 320 }}
  value={reportSel}
  disabled={busy}
  onChange={(e) => onChangeReportSel(e.target.value)}
>
  {hasLiveCurrent && (
    <option value="current">
      {`Current (Live) #${status.election_id}`}
    </option>
  )}

  {reportOptions.map((e) => (
    <option key={e.election_id} value={String(e.election_id)}>
      {`Election #${e.election_id} (${String(e.phase || "").toUpperCase() || "—"})`}
    </option>
  ))}
</select>

                  <button
                    className="btn ea-btn-light"
                    disabled={busy}
                    onClick={() => {
                      setMsg(null);
                      loadElections();
                      loadReportView(reportSel);
                    }}
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="ea-pill-row">
                <span className="ea-pill">
                  Viewing:{" "}
                  {reportSel === "current"
                    ? `Current #${status.election_id || "—"}`
                    : `History Election #${reportSel}`}
                </span>
                <span className={`badge ${viewPhaseBadge.cls}`}>{viewPhaseBadge.text}</span>
              </div>

              {!reportView ? (
                <div className="alert alert-info">No report data.</div>
              ) : (
                <>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <div className="ea-soft-mini">
                        <div className="ea-soft-title">Period</div>
                        <div className="fw-semibold">
                          {fmtTs(reportView.start_ts)} → {fmtTs(reportView.end_ts)}
                        </div>
                        <div className="text-muted small mt-2">
                          Election ID: <b>{reportView.election_id ?? "—"}</b>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="ea-soft-mini">
                        <div className="ea-soft-title">Registered</div>
                        <div className="fs-3 fw-bold" style={{ color: "#00113a" }}>
                          {reportView.registered ?? "—"}
                        </div>
                        <div className="text-muted small mt-2">
                          Voted: <b>{reportView.voted ?? "—"}</b> • Not voted:{" "}
                          <b>{reportView.registered_not_voted ?? "—"}</b>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="ea-soft-mini">
                        <div className="ea-soft-title">Leader / Winner</div>
                        {viewWinner ? (
                          <>
                            <CandidateCell c={viewWinner} />
                            <div className="mt-3 d-flex gap-2 flex-wrap">
                              <span className="badge bg-success">
                                Votes: {Number(viewWinner.voteCount || 0)}
                              </span>
                              <span className="badge bg-dark">Total: {viewTotalVotes}</span>
                            </div>
                          </>
                        ) : (
                          <div className="ea-empty">No candidates.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ea-table-wrap mb-4">
                    <div className="table-responsive">
                      <table className="table ea-table align-middle">
                        <thead>
                          <tr>
                            <th style={{ width: 70 }}>ID</th>
                            <th>Candidate</th>
                            <th>Party</th>
                            <th style={{ width: 120 }}>Votes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewCandidates.map((c) => (
                            <tr key={c.id}>
                              <td className="text-center fw-bold">{c.id}</td>
                              <td><CandidateCell c={c} /></td>
                              <td>{c.party || "-"}</td>
                              <td className="text-center fw-bold">{Number(c.voteCount || 0)}</td>
                            </tr>
                          ))}
                          {viewCandidates.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center text-muted py-4">
                                No candidates.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="ea-section-title mb-0">Registered & Voted</h6>
                      <span className="ea-count-badge badge">Count: {votedList.length}</span>
                    </div>

                    <div className="ea-table-wrap">
                      <div className="table-responsive" style={{ maxHeight: 360, overflow: "auto" }}>
                        <table className="table table-sm ea-table align-middle">
                          <thead>
                            <tr>
                              <th style={{ width: 220 }}>Voted At</th>
                              <th style={{ width: 180 }}>ID Number</th>
                              <th>Name</th>
                              <th style={{ width: 90 }}>Age</th>
                              <th style={{ width: 130 }}>Card</th>
                            </tr>
                          </thead>
                          <tbody>
                            {votedList.map((v) => (
                              <tr key={`${v.voter_uuid}-${v.voted_at}`} className={rowClass(v)}>
                                <td>{v.voted_at ? new Date(v.voted_at).toLocaleString() : "—"}</td>
                                <td className="fw-semibold">{v.id_number || "—"}</td>
                                <td>{v.name_en || v.name_kh || "—"}</td>
                                <td className="text-center">{v.age ?? "—"}</td>
                                <td className="text-center">
                                  {v.expired ? (
                                    <span className="badge bg-danger">Expired</span>
                                  ) : v.under18 ? (
                                    <span className="badge bg-warning text-dark">Under 18</span>
                                  ) : (
                                    <span className="badge bg-success">OK</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {votedList.length === 0 && (
                              <tr>
                                <td colSpan={5} className="text-center text-muted py-3">
                                  No data
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {Array.isArray(reportView?.votersRegisteredNotVoted) && (
                    <div className="mt-4">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h6 className="ea-section-title mb-0">Registered but did not vote</h6>
                        <span className="ea-count-badge badge">
                          Count: {reportView.votersRegisteredNotVoted.length}
                        </span>
                      </div>

                      <div className="ea-table-wrap">
                        <div className="table-responsive" style={{ maxHeight: 360, overflow: "auto" }}>
                          <table className="table table-sm ea-table align-middle">
                            <thead>
                              <tr>
                                <th style={{ width: 220 }}>Registered At</th>
                                <th style={{ width: 180 }}>ID Number</th>
                                <th>Name</th>
                                <th style={{ width: 90 }}>Age</th>
                                <th style={{ width: 130 }}>Card</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportView.votersRegisteredNotVoted.map((v) => (
                                <tr key={`${v.voter_uuid}-${v.registered_at}`} className={rowClass(v)}>
                                  <td>{v.registered_at ? new Date(v.registered_at).toLocaleString() : "—"}</td>
                                  <td className="fw-semibold">{v.id_number || "—"}</td>
                                  <td>{v.name_en || v.name_kh || "—"}</td>
                                  <td className="text-center">{v.age ?? "—"}</td>
                                  <td className="text-center">
                                    {v.expired ? (
                                      <span className="badge bg-danger">Expired</span>
                                    ) : v.under18 ? (
                                      <span className="badge bg-warning text-dark">Under 18</span>
                                    ) : (
                                      <span className="badge bg-success">OK</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {reportView.votersRegisteredNotVoted.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="text-center text-muted py-3">
                                    No data
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {Array.isArray(reportView?.votersNotRegistered) && (
                    <div className="mt-4">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h6 className="ea-section-title mb-0">Did not register (no token request)</h6>
                        <span className="ea-count-badge badge">
                          Count: {reportView.votersNotRegistered.length}
                        </span>
                      </div>

                      <div className="ea-table-wrap">
                        <div className="table-responsive" style={{ maxHeight: 360, overflow: "auto" }}>
                          <table className="table table-sm ea-table align-middle">
                            <thead>
                              <tr>
                                <th style={{ width: 180 }}>ID Number</th>
                                <th>Name</th>
                                <th style={{ width: 90 }}>Age</th>
                                <th style={{ width: 140 }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportView.votersNotRegistered.map((v) => (
                                <tr key={v.voter_uuid} className={rowClass(v)}>
                                  <td className="fw-semibold">{v.id_number || "—"}</td>
                                  <td>{v.name_en || v.name_kh || "—"}</td>
                                  <td className="text-center">{v.age ?? "—"}</td>
                                  <td className="text-center">
                                    {v.expired ? (
                                      <span className="badge bg-danger">Expired</span>
                                    ) : v.under18 ? (
                                      <span className="badge bg-warning text-dark">Under 18</span>
                                    ) : (
                                      <span className="badge bg-secondary">Eligible</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {reportView.votersNotRegistered.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="text-center text-muted py-3">
                                    No data
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}