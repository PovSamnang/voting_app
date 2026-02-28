import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

function tsToLocalInput(tsSec) {
  if (!tsSec || tsSec <= 0) return "";
  const d = new Date(tsSec * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  // datetime-local expects: YYYY-MM-DDTHH:mm
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function localInputToTsSec(v) {
  // v: "YYYY-MM-DDTHH:mm"
  const d = new Date(v);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

export default function AdminVotingUI() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "";

  const api = useMemo(() => {
    return axios.create({
      baseURL: API_URL,
      headers: { "x-admin-key": ADMIN_KEY },
    });
  }, [API_URL, ADMIN_KEY]);

  // Candidate form
  const [form, setForm] = useState({
    name_en: "",
    name_kh: "",
    party: "",
    photo_url: "",
  });

  // Voting window form (datetime-local)
  const [period, setPeriod] = useState({
    startLocal: "",
    endLocal: "",
  });

  const [status, setStatus] = useState({
    configured: false,
    active: false,
    start_ts: 0,
    end_ts: 0,
  });

  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState(null); // {type:'success'|'danger'|'info', text:''}
  const [loading, setLoading] = useState(false);
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const loadResults = async () => {
    try {
      const res = await api.get("/admin/results");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMsg({
        type: "danger",
        text: err?.response?.data?.message || err.message || "Failed to load results",
      });
    }
  };

  const loadVotingStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/voting-status`);
      const s = res.data || {};
      setStatus({
        configured: Boolean(s.configured),
        active: Boolean(s.active),
        start_ts: Number(s.start_ts || 0),
        end_ts: Number(s.end_ts || 0),
      });

      setPeriod({
        startLocal: tsToLocalInput(Number(s.start_ts || 0)),
        endLocal: tsToLocalInput(Number(s.end_ts || 0)),
      });
    } catch (err) {
      // voting-status is optional if backend not updated yet
      setMsg({
        type: "danger",
        text:
          err?.response?.data?.message ||
          err.message ||
          "Failed to load voting status (check backend /api/voting-status)",
      });
    }
  };

  useEffect(() => {
    if (!ADMIN_KEY) {
      setMsg({ type: "danger", text: "Missing VITE_ADMIN_KEY in admin .env" });
      return;
    }

    loadResults();
    loadVotingStatus();

    // Auto refresh results every 3 seconds
    const t = setInterval(loadResults, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ADMIN_KEY]);

  const addCandidate = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!form.name_en.trim()) {
      setMsg({ type: "danger", text: "name_en is required" });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/admin/candidates", {
        name_en: form.name_en.trim(),
        name_kh: form.name_kh.trim(),
        party: form.party.trim(),
        photo_url: form.photo_url.trim(),
      });

      setMsg({
        type: "success",
        text: `Candidate added ✅ ${res.data?.tx_hash ? `(TX: ${res.data.tx_hash})` : ""}`,
      });

      setForm({ name_en: "", name_kh: "", party: "", photo_url: "" });
      await loadResults();
    } catch (err) {
      setMsg({
        type: "danger",
        text: err?.response?.data?.message || err.message || "Add candidate failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const setVotingPeriod = async (e) => {
    e.preventDefault();
    setMsg(null);

    const start_ts = localInputToTsSec(period.startLocal);
    const end_ts = localInputToTsSec(period.endLocal);

    if (!start_ts || !end_ts) {
      setMsg({ type: "danger", text: "Please select valid Start and End datetime." });
      return;
    }
    if (end_ts <= start_ts) {
      setMsg({ type: "danger", text: "End time must be after Start time." });
      return;
    }

    try {
      setLoadingPeriod(true);
      const res = await api.post("/admin/voting-period", { start_ts, end_ts });

      setMsg({
        type: "success",
        text: `Voting period set ✅ ${res.data?.tx_hash ? `(TX: ${res.data.tx_hash})` : ""}`,
      });

      await loadVotingStatus();
    } catch (err) {
      setMsg({
        type: "danger",
        text:
          err?.response?.data?.message ||
          err.message ||
          "Set voting period failed (check backend /api/admin/voting-period)",
      });
    } finally {
      setLoadingPeriod(false);
    }
  };

  const totalVotes = rows.reduce((s, r) => s + Number(r.voteCount || 0), 0);

  const statusBadge = status.active
    ? { cls: "bg-success", text: "ACTIVE" }
    : status.configured
    ? { cls: "bg-secondary", text: "INACTIVE" }
    : { cls: "bg-warning text-dark", text: "NOT SET" };

  return (
    <div className="container py-4" style={{ maxWidth: 980 }}>
      <div className="d-flex align-items-start justify-content-between mb-3">
        <div>
          <h3 className="mb-1">🛠️ Admin Voting Panel</h3>
          <div className="text-muted">
            Add candidates and view live results. Set voting start/end. Admin cannot see who voted for who.
          </div>
        </div>

        <div className="text-end">
          <div className="small text-muted">Live refresh: every 3s</div>
          <div className="fw-bold">Total votes: {totalVotes}</div>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type} shadow-sm`}>{msg.text}</div>}

      {/* Voting Period */}
      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="mb-0">⏳ Voting Period</h5>
            <span className={`badge ${statusBadge.cls}`}>{statusBadge.text}</span>
          </div>

          <div className="mb-2 text-muted small">
            Current:
            {" "}
            {status.start_ts ? new Date(status.start_ts * 1000).toLocaleString() : "—"}
            {" "}
            →{" "}
            {status.end_ts ? new Date(status.end_ts * 1000).toLocaleString() : "—"}
          </div>

          <form onSubmit={setVotingPeriod} className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Start (local time)</label>
              <input
                className="form-control"
                type="datetime-local"
                value={period.startLocal}
                onChange={(e) => setPeriod((p) => ({ ...p, startLocal: e.target.value }))}
                required
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
              />
            </div>

            <div className="col-12 d-flex gap-2">
              <button className="btn btn-primary" disabled={loadingPeriod}>
                {loadingPeriod ? "Saving..." : "Set Voting Period"}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={loadingPeriod}
                onClick={loadVotingStatus}
              >
                Reload Status
              </button>

              <div className="ms-auto small text-muted align-self-center">
                Tip: Uses your computer’s timezone. For Phnom Penh, set your system timezone to Asia/Phnom_Penh.
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Add Candidate */}
      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="mb-3">➕ Add Candidate</h5>

          <form onSubmit={addCandidate} className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Name EN *</label>
              <input
                className="form-control"
                name="name_en"
                value={form.name_en}
                onChange={onChange}
                placeholder="e.g. KEO DARA"
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">Name KH</label>
              <input
                className="form-control"
                name="name_kh"
                value={form.name_kh}
                onChange={onChange}
                placeholder="e.g. កែវ ដារ៉ា"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">Party</label>
              <input
                className="form-control"
                name="party"
                value={form.party}
                onChange={onChange}
                placeholder="e.g. Party A"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">Photo URL</label>
              <input
                className="form-control"
                name="photo_url"
                value={form.photo_url}
                onChange={onChange}
                placeholder="https://..."
              />
              <div className="form-text">Optional. Used only for UI display.</div>
            </div>

            <div className="col-12 d-flex gap-2">
              <button className="btn btn-success" disabled={loading}>
                {loading ? "Adding..." : "Add Candidate"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={loading}
                onClick={() => setForm({ name_en: "", name_kh: "", party: "", photo_url: "" })}
              >
                Reset
              </button>
              <button type="button" className="btn btn-outline-primary ms-auto" onClick={loadResults}>
                Refresh Results
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Live Results */}
      <div className="card shadow-sm">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="mb-0">📊 Live Results</h5>
            <span className="badge bg-dark">Candidates: {rows.length}</span>
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-bordered align-middle">
              <thead className="table-dark">
                <tr>
                  <th style={{ width: 70 }}>ID</th>
                  <th>Candidate</th>
                  <th>Party</th>
                  <th style={{ width: 120 }}>Votes</th>
                  <th style={{ width: 110 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="text-center fw-bold">{c.id}</td>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        {c.photo_url ? (
                          <img
                            src={c.photo_url}
                            alt="candidate"
                            style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 10 }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 48,
                              height: 48,
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
                          <div className="fw-semibold">{c.name_en || "Candidate"}</div>
                          {c.name_kh ? <div className="text-muted small">{c.name_kh}</div> : null}
                        </div>
                      </div>
                    </td>
                    <td>{c.party || "-"}</td>
                    <td className="text-center fw-bold">{Number(c.voteCount || 0)}</td>
                    <td className="text-center">
                      <span className={`badge ${c.is_active ? "bg-success" : "bg-secondary"}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      No candidates yet. Add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-muted small">
            Note: Results are live from blockchain. Admin cannot see voter choices.
          </div>
        </div>
      </div>
    </div>
  );
}