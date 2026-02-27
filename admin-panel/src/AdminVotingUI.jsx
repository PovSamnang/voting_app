import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

export default function AdminVotingUI() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "";

  const api = useMemo(() => {
    return axios.create({
      baseURL: API_URL,
      headers: { "x-admin-key": ADMIN_KEY },
    });
  }, [API_URL, ADMIN_KEY]);

  const [form, setForm] = useState({
    name_en: "",
    name_kh: "",
    party: "",
    photo_url: "",
  });

  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState(null); // {type:'success'|'danger'|'info', text:''}
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!ADMIN_KEY) {
      setMsg({ type: "danger", text: "Missing VITE_ADMIN_KEY in admin .env" });
      return;
    }
    loadResults();

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

  const totalVotes = rows.reduce((s, r) => s + Number(r.voteCount || 0), 0);

  return (
    <div className="container py-4" style={{ maxWidth: 980 }}>
      <div className="d-flex align-items-start justify-content-between mb-3">
        <div>
          <h3 className="mb-1">🛠️ Admin Voting Panel</h3>
          <div className="text-muted">
            Add candidates (add-only) and view live results. Admin cannot see who voted for who.
          </div>
        </div>

        <div className="text-end">
          <div className="small text-muted">Live refresh: every 3s</div>
          <div className="fw-bold">Total votes: {totalVotes}</div>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type} shadow-sm`}>{msg.text}</div>}

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