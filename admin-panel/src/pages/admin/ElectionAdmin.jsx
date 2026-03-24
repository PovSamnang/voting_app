import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import AdminShell from "../../components/AdminShell";

/**
 *  Admin UI + Election History Report (NO FLOW CHANGE)
 *  FIX: show candidate photo_url image in:
 *   - Candidates tab table
 *   - Report tab candidate totals table
 */

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
  if (p === "ACTIVE") return { cls: "bg-success", text: "ACTIVE" };
  if (p === "BEFORE_START") return { cls: "bg-info text-dark", text: "BEFORE START" };
  if (p === "DRAFT") return { cls: "bg-warning text-dark", text: "DRAFT" };
  if (p === "ENDED") return { cls: "bg-secondary", text: "ENDED" };
  return { cls: "bg-dark", text: "NONE" };
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
    <div className="d-flex align-items-center gap-2">
      {photo ? (
        <img
          src={photo}
          alt="candidate"
          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 10 }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "#eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
          }}
        >
          👤
        </div>
      )}

      <div>
        <div className="fw-semibold">{nameEn}</div>
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
    phase: "NONE",
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

  const canCreateDraft = status.phase === "NONE" || status.phase === "ENDED";
  const canSetPeriod = status.phase === "DRAFT" && status.election_id > 0;
  const canAddCandidates =
    status.election_id > 0 && (status.phase === "DRAFT" || status.phase === "BEFORE_START");

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
      phase,
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
    loadReportView("current").catch(() => {});

    const t = setInterval(() => {
      loadVotingStatus().catch(() => {});
      loadCurrentReport().catch(() => {});
      loadElections().catch(() => {});
      if (reportSel === "current") loadReportView("current").catch(() => {});
    }, 3000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ADMIN_KEY, reportSel]);

  const createDraftElection = async () => {
    setMsg(null);
    try {
      setBusy(true);
      const res = await api.post("/admin/elections/draft");
      setMsg({
        type: "success",
        text: `Draft election created  (ID: ${res.data?.election_id ?? "?"})`,
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

    if (!start_ts || !end_ts)
      return setMsg({ type: "danger", text: "Please select valid Start and End datetime." });
    if (end_ts <= start_ts)
      return setMsg({ type: "danger", text: "End time must be after Start time." });

    try {
      setBusy(true);
      await api.post("/admin/elections", { start_ts, end_ts });

      setMsg({ type: "success", text: "Election period set " });

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

    if (!candForm.name_en.trim())
      return setMsg({ type: "danger", text: "name_en is required" });
    if (!status.election_id)
      return setMsg({ type: "danger", text: "Create draft election first." });

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
        text: `Candidate added  ${res.data?.tx_hash ? `(TX: ${res.data.tx_hash})` : ""}`,
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

  const onChangeReportSel = async (v) => {
    setMsg(null);
    setReportSel(v);
    await loadReportView(v);
  };

  const votedList = reportView?.votersRegisteredVoted || reportView?.votersVoted || [];

  return (
    <AdminShell active="elections" onLogout={logout} adminName="Admin">
      <div className="container py-4" style={{ maxWidth: 1100 }}>
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h3 className="mb-1">🛠️ KampuVote Admin Console</h3>
            <div className="text-muted">
              Flow: <b>1) Create Draft</b> → <b>2) Add Candidates</b> → <b>3) Set Period</b> →{" "}
              <b>4) Monitor Report</b> → <b>5) After End, create next Draft</b>.
            </div>
          </div>

          <div className="text-end">
            <div className="d-flex align-items-center justify-content-end gap-2">
              <span className="text-muted small">Current Election</span>
              <span className="badge bg-dark">#{status.election_id || "—"}</span>
              <span className={`badge ${phaseBadge.cls}`}>{phaseBadge.text}</span>
            </div>
            <div className="small text-muted mt-1">Auto refresh: every 3s</div>
          </div>
        </div>

        {msg && <div className={`alert alert-${msg.type} shadow-sm`}>{msg.text}</div>}

        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="text-muted small">Voting period (CURRENT)</div>
                <div className="fw-semibold">
                  {fmtTs(status.start_ts)} → {fmtTs(status.end_ts)}
                </div>

                {status.configured ? (
                  <div className="progress mt-3" style={{ height: 10 }}>
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
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="text-muted small">Registrations (CURRENT)</div>
                <div className="display-6 mb-0">{currentReport?.registered ?? "—"}</div>
                <div className="text-muted small mt-2">
                  Voted: <b>{currentReport?.voted ?? "—"}</b> • Not voted:{" "}
                  <b>{currentReport?.registered_not_voted ?? "—"}</b>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="text-muted small">Winner / Leader (CURRENT)</div>
                {currentWinner ? (
                  <>
                    <CandidateCell c={currentWinner} />
                    <div className="mt-2">
                      <span className="badge bg-success">
                        Votes: {Number(currentWinner.voteCount || 0)}
                      </span>
                      <span className="badge bg-dark ms-2">Total votes: {currentTotalVotes}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-muted">No candidates yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <ul className="nav nav-pills mb-3">
          <li className="nav-item">
            <button className={`nav-link ${tab === "setup" ? "active" : ""}`} onClick={() => setTab("setup")}>
              1) Draft & Period
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${tab === "candidates" ? "active" : ""}`} onClick={() => setTab("candidates")}>
              2) Candidates
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${tab === "report" ? "active" : ""}`} onClick={() => setTab("report")}>
              3) Report & Results (History)
            </button>
          </li>
        </ul>

        {tab === "setup" && (
          <div className="card shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="p-3 border rounded mb-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <div>
                    <div className="fw-semibold">Step A — Create Draft Election</div>
                    <div className="text-muted small">
                      Allowed only if there is no election or the previous election ended.
                    </div>
                  </div>
                  <button className="btn btn-primary" disabled={busy || !canCreateDraft} onClick={createDraftElection}>
                    {busy ? "Working..." : "Create Draft"}
                  </button>
                </div>
              </div>

              <div className="p-3 border rounded">
                <div className="fw-semibold">Step B — Set Voting Period (Start/End)</div>

                {!canSetPeriod && (
                  <div className="alert alert-info mt-3">
                    You can set period only when election is in <b>DRAFT</b> phase.
                  </div>
                )}

                <form onSubmit={setElectionPeriod} className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Start (local time)</label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={period.startLocal}
                      onChange={(e) => setPeriod((p) => ({ ...p, startLocal: e.target.value }))}
                      required
                      disabled={!canSetPeriod || busy}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">End (local time)</label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={period.endLocal}
                      onChange={(e) => setPeriod((p) => ({ ...p, endLocal: e.target.value }))}
                      required
                      disabled={!canSetPeriod || busy}
                    />
                  </div>

                  <div className="col-12 d-flex flex-wrap gap-2">
                    <button className="btn btn-success" disabled={busy || !canSetPeriod}>
                      {busy ? "Saving..." : "Set Period"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
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
          <div className="card shadow-sm mb-4">
            <div className="card-body p-4">
              {!status.election_id ? (
                <div className="alert alert-info">
                  Create a <b>Draft election</b> first.
                </div>
              ) : !canAddCandidates ? (
                <div className="alert alert-warning">
                  Candidates are locked because election is <b>{status.phase}</b>.
                </div>
              ) : null}

              <form onSubmit={addCandidate} className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Name EN *</label>
                  <input
                    className="form-control"
                    value={candForm.name_en}
                    onChange={(e) => setCandForm((p) => ({ ...p, name_en: e.target.value }))}
                    required
                    disabled={!canAddCandidates || busy}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Name KH</label>
                  <input
                    className="form-control"
                    value={candForm.name_kh}
                    onChange={(e) => setCandForm((p) => ({ ...p, name_kh: e.target.value }))}
                    disabled={!canAddCandidates || busy}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Party</label>
                  <input
                    className="form-control"
                    value={candForm.party}
                    onChange={(e) => setCandForm((p) => ({ ...p, party: e.target.value }))}
                    disabled={!canAddCandidates || busy}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Photo URL</label>
                  <input
                    className="form-control"
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
                  <button className="btn btn-success" disabled={!canAddCandidates || busy}>
                    {busy ? "Adding..." : "Add Candidate"}
                  </button>
                </div>
              </form>

              <hr className="my-4" />

              <div className="table-responsive">
                <table className="table table-striped table-bordered align-middle">
                  <thead className="table-dark">
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
        )}

        {tab === "report" && (
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
                <div>
                  <h5 className="mb-1">📊 Election Report (Current + History)</h5>
                  <div className="text-muted small">Choose a past election to view archived data.</div>
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <div className="text-muted small">View:</div>
                  <select
                    className="form-select"
                    style={{ width: 320 }}
                    value={reportSel}
                    disabled={busy}
                    onChange={(e) => onChangeReportSel(e.target.value)}
                  >
                    <option value="current">Current (Live)</option>
                    {elections.map((e) => (
                      <option key={e.election_id} value={String(e.election_id)}>
                        {`Election #${e.election_id} (${String(e.phase || "").toUpperCase() || "—"})`}
                      </option>
                    ))}
                  </select>

                  <button
                    className="btn btn-outline-primary"
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

              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="badge bg-dark">
                  Viewing:{" "}
                  {reportSel === "current"
                    ? `Current #${status.election_id || "—"}`
                    : `Election #${reportSel}`}
                </span>
                <span className={`badge ${viewPhaseBadge.cls}`}>{viewPhaseBadge.text}</span>
              </div>

              {!reportView ? (
                <div className="alert alert-info">No report data.</div>
              ) : (
                <>
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <div className="p-3 border rounded">
                        <div className="text-muted small">Period</div>
                        <div className="fw-semibold">
                          {fmtTs(reportView.start_ts)} → {fmtTs(reportView.end_ts)}
                        </div>
                        <div className="text-muted small mt-1">
                          Election ID: <b>{reportView.election_id ?? "—"}</b>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="p-3 border rounded">
                        <div className="text-muted small">Registered</div>
                        <div className="fs-3 fw-bold">{reportView.registered ?? "—"}</div>
                        <div className="text-muted small mt-1">
                          Voted: <b>{reportView.voted ?? "—"}</b> • Not voted:{" "}
                          <b>{reportView.registered_not_voted ?? "—"}</b>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="p-3 border rounded">
                        <div className="text-muted small">Leader / Winner</div>
                        {viewWinner ? (
                          <>
                            <CandidateCell c={viewWinner} />
                            <div className="mt-2 d-flex gap-2 flex-wrap">
                              <span className="badge bg-success">
                                Votes: {Number(viewWinner.voteCount || 0)}
                              </span>
                              <span className="badge bg-dark">Total: {viewTotalVotes}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-muted">No candidates.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="table-responsive mb-3">
                    <table className="table table-striped table-bordered align-middle">
                      <thead className="table-dark">
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

                  <div className="mt-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="mb-0">Registered & Voted</h6>
                      <span className="badge bg-dark">Count: {votedList.length}</span>
                    </div>
                    <div className="table-responsive" style={{ maxHeight: 360, overflow: "auto" }}>
                      <table className="table table-sm table-striped table-bordered align-middle">
                        <thead className="table-dark">
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

                  {Array.isArray(reportView?.votersRegisteredNotVoted) && (
                    <div className="mt-4">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h6 className="mb-0">Registered but did not vote</h6>
                        <span className="badge bg-dark">
                          Count: {reportView.votersRegisteredNotVoted.length}
                        </span>
                      </div>

                      <div className="table-responsive" style={{ maxHeight: 360, overflow: "auto" }}>
                        <table className="table table-sm table-striped table-bordered align-middle">
                          <thead className="table-dark">
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
                  )}

                  {Array.isArray(reportView?.votersNotRegistered) && (
                    <div className="mt-4">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h6 className="mb-0">Did not register (no token request)</h6>
                        <span className="badge bg-dark">Count: {reportView.votersNotRegistered.length}</span>
                      </div>

                      <div className="table-responsive" style={{ maxHeight: 360, overflow: "auto" }}>
                        <table className="table table-sm table-striped table-bordered align-middle">
                          <thead className="table-dark">
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