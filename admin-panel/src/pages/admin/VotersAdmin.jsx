import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import QRCode from "react-qr-code";
import { useNavigate } from "react-router-dom";
import AdminShell from "../../components/AdminShell";

const API_URL = "http://localhost:3000/api";

function parseFlexibleDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const s = String(value).trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function getAge(value) {
  const dob = parseFlexibleDate(value);
  if (!dob) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
}

function isUnder18(voter) {
  const age = getAge(voter?.dob_iso || voter?.dob_display);
  return age !== null && age < 18;
}

function isExpired(voter) {
  const expiry = parseFlexibleDate(voter?.expiry_date);
  if (!expiry) return false;
  expiry.setHours(23, 59, 59, 999);
  return expiry.getTime() < Date.now();
}

function getRowTone(voter) {
  if (isExpired(voter)) return "expired";
  if (isUnder18(voter)) return "underage";
  return "normal";
}

function fmtText(v) {
  return v || "—";
}

function VotersAdmin() {
  const navigate = useNavigate();

  const [voters, setVoters] = useState([]);
  const [editingVoter, setEditingVoter] = useState(null);
  const [viewingCard, setViewingCard] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const fetchVoters = async () => {
      try {
        setListLoading(true);
        setMsg(null);
        const res = await axios.get(`${API_URL}/voters`);
        setVoters(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setMsg({
          type: "danger",
          text: err?.response?.data?.message || err.message || "Failed to load voters.",
        });
      } finally {
        setListLoading(false);
      }
    };

    fetchVoters();
  }, [refresh]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingVoter((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingVoter?.uuid) return;

    try {
      setSaveLoading(true);
      setMsg(null);
      await axios.put(`${API_URL}/voters/${editingVoter.uuid}`, editingVoter);
      setEditingVoter(null);
      setRefresh((r) => !r);
      setMsg({ type: "success", text: "Voter updated successfully!" });
    } catch (error) {
      console.error(error);
      setMsg({
        type: "danger",
        text: error?.response?.data?.message || "Failed to update.",
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const openEdit = (voter) => setEditingVoter({ ...voter });
  const openCard = (voter) => setViewingCard({ ...voter });

  const logout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login", { replace: true });
  };

  const filteredVoters = useMemo(() => {
    const q = search.trim().toLowerCase();

    return voters.filter((voter) => {
      if (!q) return true;

      const haystack = [
        voter.id_number,
        voter.name_en,
        voter.name_kh,
        voter.gender,
        voter.dob_display,
        voter.dob_iso,
        voter.pob,
        voter.address,
        voter.issued_date,
        voter.expiry_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [voters, search]);

  return (
    <AdminShell
      active="voters"
      onLogout={logout}
      adminName="Admin"
      title="Voter Registry"
      subtitle="Manage voter records, search, edit, and inspect digital voter cards."
      headerAction={
        <button
          type="button"
          className="vtr-refresh-btn"
          onClick={() => setRefresh((r) => !r)}
          disabled={listLoading}
        >
          <span className="material-symbols-outlined">refresh</span>
          Refresh
        </button>
      }
    >
      <style>{`
        .vtr-refresh-btn{
          border:none;
          background:#00113a;
          color:#fff;
          border-radius:12px;
          padding:12px 16px;
          font-size:14px;
          font-weight:800;
          display:inline-flex;
          align-items:center;
          gap:8px;
          cursor:pointer;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }
        .vtr-refresh-btn:disabled{
          opacity:.7;
          cursor:not-allowed;
        }

        .vtr-page{
          font-family:Inter,"Kantumruy Pro",sans-serif;
          color:#191c1d;
        }

        .vtr-watermark{
          background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L35 25L55 30L35 35L30 55L25 35L5 30L25 25Z' fill='%23735c00' fill-opacity='0.05'/%3E%3C/svg%3E");
        }

        .vtr-hero{
          position:relative;
          overflow:hidden;
          background:#002366;
          color:#fff;
          border-radius:12px;
          padding:28px;
          border-bottom:4px solid #fed65b;
          box-shadow:0 16px 28px rgba(0,17,58,.12);
          margin-bottom:24px;
        }

        .vtr-hero-inner{
          position:relative;
          z-index:2;
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:18px;
          flex-wrap:wrap;
        }

        .vtr-kicker{
          display:flex;
          align-items:center;
          gap:12px;
          margin-bottom:12px;
        }

        .vtr-kicker-line{
          width:34px;
          height:1px;
          background:#ffe088;
        }

        .vtr-kicker-text{
          color:#ffe088;
          font-size:12px;
          font-weight:900;
          letter-spacing:.18em;
          text-transform:uppercase;
        }

        .vtr-title-kh{
          margin:0;
          font-size:36px;
          line-height:1.08;
          font-weight:900;
          letter-spacing:-.03em;
        }

        .vtr-title-en{
          margin:8px 0 0;
          font-size:18px;
          color:#b3c5ff;
          font-weight:700;
        }

        .vtr-hero-box{
          min-width:280px;
          padding:16px 18px;
          border-radius:8px;
          background:rgba(255,255,255,.08);
          border:1px solid rgba(255,255,255,.1);
          backdrop-filter:blur(8px);
          display:flex;
          align-items:center;
          gap:12px;
        }

        .vtr-hero-box .material-symbols-outlined{
          font-size:34px;
          color:#ffe088;
          font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24;
        }

        .vtr-hero-label{
          margin:0 0 4px;
          font-size:10px;
          letter-spacing:.16em;
          text-transform:uppercase;
          color:rgba(255,255,255,.65);
          font-weight:800;
        }

        .vtr-hero-value{
          margin:0;
          font-size:16px;
          font-weight:900;
        }

        .vtr-msg{
          margin-bottom:18px;
          padding:14px 16px;
          border-radius:10px;
          border:1px solid transparent;
          font-size:14px;
          font-weight:800;
        }

        .vtr-msg.success{
          background:#edf9f0;
          color:#157347;
          border-color:#b9e2c2;
        }

        .vtr-msg.danger{
          background:#fff3f3;
          color:#c62828;
          border-color:#f1c7c7;
        }

        .vtr-card{
          background:#fff;
          border:1px solid rgba(117,118,130,.15);
          border-radius:12px;
          overflow:hidden;
          box-shadow:0 10px 26px rgba(15,23,42,.04);
        }

        .vtr-card-head{
          padding:16px 18px;
          background:#f3f4f5;
          border-bottom:1px solid #edeeef;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
        }

        .vtr-card-title{
          margin:0;
          color:#00113a;
          font-size:17px;
          font-weight:900;
          letter-spacing:-.02em;
        }

        .vtr-card-meta{
          color:#735c00;
          font-size:11px;
          font-weight:900;
          letter-spacing:.12em;
          text-transform:uppercase;
        }

        .vtr-edit{
          padding:18px;
        }

        .vtr-edit-grid{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:14px;
        }

        .vtr-field{
          display:flex;
          flex-direction:column;
          gap:8px;
        }

        .vtr-field.wide{
          grid-column:span 2;
        }

        .vtr-label{
          color:#444650;
          font-size:13px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.04em;
        }

        .vtr-input,
        .vtr-select{
          height:42px;
          border:1px solid rgba(117,118,130,.22);
          border-radius:10px;
          padding:0 12px;
          font-size:14px;
          font-weight:700;
          color:#00113a;
          background:#fff;
          outline:none;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .vtr-actions{
          display:flex;
          justify-content:flex-end;
          gap:12px;
          flex-wrap:wrap;
          margin-top:16px;
        }

        .vtr-btn{
          border:none;
          border-radius:10px;
          padding:12px 18px;
          font-size:14px;
          font-weight:900;
          cursor:pointer;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .vtr-btn.cancel{
          background:#e7e8e9;
          color:#444650;
        }

        .vtr-btn.save{
          background:#00113a;
          color:#fff;
        }

        .vtr-btn:disabled{
          opacity:.7;
          cursor:not-allowed;
        }

        .vtr-toolbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:14px;
          flex-wrap:wrap;
          margin:18px 0;
        }

        .vtr-search-wrap{
          position:relative;
          width:min(520px, 100%);
          flex:1 1 320px;
        }

        .vtr-search-wrap .material-symbols-outlined{
          position:absolute;
          left:12px;
          top:50%;
          transform:translateY(-50%);
          color:#757682;
          font-size:20px;
        }

        .vtr-search{
          width:100%;
          height:44px;
          border:1px solid rgba(117,118,130,.22);
          background:#fff;
          border-radius:12px;
          padding:0 14px 0 40px;
          font-size:14px;
          font-weight:700;
          color:#00113a;
          outline:none;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .vtr-toolbar-right{
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
        }

        .vtr-pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:9px 12px;
          border-radius:999px;
          background:#ffe088;
          color:#745c00;
          font-size:11px;
          font-weight:900;
          letter-spacing:.1em;
          text-transform:uppercase;
        }

        .vtr-table-wrap{
          overflow:auto;
        }

        .vtr-table{
          width:100%;
          min-width:1160px;
          border-collapse:collapse;
        }

        .vtr-table thead tr{
          background:#f7f8fa;
        }

        .vtr-table th{
          text-align:left;
          padding:16px 18px;
          font-size:11px;
          font-weight:900;
          letter-spacing:.12em;
          text-transform:uppercase;
          color:#444650;
          white-space:nowrap;
        }

        .vtr-table td{
          padding:16px 18px;
          border-top:1px solid #edeeef;
          font-size:14px;
          font-weight:700;
          color:#191c1d;
          vertical-align:middle;
          white-space:nowrap;
        }

        .vtr-row.normal:hover td{
          background:#fafbfc;
        }

        .vtr-row.underage td{
          background:#fff8ee;
        }

        .vtr-row.underage:hover td{
          background:#fff2de;
        }

        .vtr-row.expired td{
          background:#fff3f3;
        }

        .vtr-row.expired:hover td{
          background:#ffe8e8;
        }

        .vtr-name-en{
          font-weight:900;
          color:#00113a;
        }

        .vtr-name-kh{
          font-size:12px;
          color:#64748b;
          margin-top:4px;
          font-weight:700;
        }

        .vtr-status{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:94px;
          padding:6px 10px;
          border-radius:999px;
          font-size:11px;
          font-weight:900;
          letter-spacing:.04em;
          text-transform:uppercase;
          border:1px solid transparent;
        }

        .vtr-status.normal{
          background:#edf9f0;
          color:#157347;
          border-color:#b9e2c2;
        }

        .vtr-status.underage{
          background:#fff4df;
          color:#a35f00;
          border-color:#f2c37b;
        }

        .vtr-status.expired{
          background:#ffdad6;
          color:#93000a;
          border-color:#f0b4ac;
        }

        .vtr-mini{
          display:block;
          font-size:12px;
          color:#64748b;
          font-weight:700;
          margin-top:4px;
        }

        .vtr-table-actions{
          display:flex;
          align-items:center;
          gap:8px;
        }

        .vtr-table-btn{
          border:none;
          border-radius:10px;
          padding:9px 12px;
          font-size:12px;
          font-weight:900;
          cursor:pointer;
          font-family:Inter,"Kantumruy Pro",sans-serif;
          display:inline-flex;
          align-items:center;
          gap:6px;
        }

        .vtr-table-btn.edit{
          background:#00113a;
          color:#fff;
        }

        .vtr-table-btn.card{
          background:#ffe088;
          color:#745c00;
        }

        .vtr-empty,
        .vtr-loading{
          padding:26px;
          text-align:center;
          color:#64748b;
          font-size:14px;
          font-weight:800;
        }

        .vtr-popup-title{
          text-align:center;
          margin:0 0 12px;
          color:#fff;
          font-size:18px;
          font-weight:800;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .vtr-popup-close{
          margin-top:12px;
          border:none;
          background:#dc3545;
          color:#fff;
          padding:10px 18px;
          border-radius:8px;
          font-size:14px;
          font-weight:800;
          cursor:pointer;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        @media (max-width: 1100px){
          .vtr-edit-grid{
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width: 760px){
          .vtr-edit-grid{
            grid-template-columns:1fr;
          }
          .vtr-field.wide{
            grid-column:span 1;
          }
          .vtr-title-kh{
            font-size:28px;
          }
          .vtr-hero-box{
            min-width:auto;
            width:100%;
          }
        }
      `}</style>

      <div className="vtr-page">
        <section className="vtr-hero vtr-watermark">
          <div className="vtr-hero-inner">
            <div>
              <div className="vtr-kicker">
                <span className="vtr-kicker-line" />
                <span className="vtr-kicker-text">Sovereign State of Cambodia</span>
              </div>
              <h2 className="vtr-title-kh">បញ្ជីអ្នកបោះឆ្នោត</h2>
              <p className="vtr-title-en">National Voter Registry Console</p>
            </div>

            <div className="vtr-hero-box">
              <span className="material-symbols-outlined">badge</span>
              <div>
                <p className="vtr-hero-label">Current Registry</p>
                <p className="vtr-hero-value">
                  {listLoading ? "Loading..." : `${filteredVoters.length} visible voter(s)`}
                </p>
              </div>
            </div>
          </div>
        </section>

        {msg && (
          <div className={`vtr-msg ${msg.type === "success" ? "success" : "danger"}`}>
            {msg.text}
          </div>
        )}

        {editingVoter && (
          <section className="vtr-card" style={{ marginBottom: 22 }}>
            <div className="vtr-card-head">
              <h3 className="vtr-card-title">Edit Voter</h3>
              <span className="vtr-card-meta">
                {editingVoter.id_number || editingVoter.uuid}
              </span>
            </div>

            <form className="vtr-edit" onSubmit={handleUpdate}>
              <div className="vtr-edit-grid">
                <div className="vtr-field">
                  <label className="vtr-label">ID Number</label>
                  <input
                    className="vtr-input"
                    name="id_number"
                    value={editingVoter.id_number || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="vtr-field wide">
                  <label className="vtr-label">Name (EN)</label>
                  <input
                    className="vtr-input"
                    name="name_en"
                    value={editingVoter.name_en || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="vtr-field wide">
                  <label className="vtr-label">Name (KH)</label>
                  <input
                    className="vtr-input"
                    name="name_kh"
                    value={editingVoter.name_kh || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="vtr-field">
                  <label className="vtr-label">Gender</label>
                  <select
                    className="vtr-select"
                    name="gender"
                    value={editingVoter.gender || "M"}
                    onChange={handleInputChange}
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>

              <div className="vtr-actions">
                <button
                  type="button"
                  className="vtr-btn cancel"
                  onClick={() => setEditingVoter(null)}
                  disabled={saveLoading}
                >
                  Cancel
                </button>

                <button type="submit" className="vtr-btn save" disabled={saveLoading}>
                  {saveLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="vtr-toolbar">
          <div className="vtr-search-wrap">
            <span className="material-symbols-outlined">search</span>
            <input
              className="vtr-search"
              placeholder="Search by ID, English name, Khmer name, DOB, place of birth, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="vtr-toolbar-right">
            <span className="vtr-pill">Orange = Under 18</span>
            <span className="vtr-pill" style={{ background: "#ffdad6", color: "#93000a" }}>
              Red = Expired
            </span>
          </div>
        </section>

        <section className="vtr-card">
          <div className="vtr-card-head">
            <h3 className="vtr-card-title">Voter Records</h3>
            <span className="vtr-card-meta">
              {listLoading ? "Loading" : `${filteredVoters.length} row(s)`}
            </span>
          </div>

          <div className="vtr-table-wrap">
            <table className="vtr-table">
              <thead>
                <tr>
                  <th>ID Number</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>DOB</th>
                  <th>POB</th>
                  <th>Create Date</th>
                  <th>Expire Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {listLoading && (
                  <tr>
                    <td colSpan="9" className="vtr-loading">
                      Loading voters...
                    </td>
                  </tr>
                )}

                {!listLoading && filteredVoters.length === 0 && (
                  <tr>
                    <td colSpan="9" className="vtr-empty">
                      No voters found.
                    </td>
                  </tr>
                )}

                {!listLoading &&
                  filteredVoters.map((voter) => {
                    const tone = getRowTone(voter);
                    const age = getAge(voter.dob_iso || voter.dob_display);

                    return (
                      <tr key={voter.uuid} className={`vtr-row ${tone}`}>
                        <td>{fmtText(voter.id_number)}</td>

                        <td>
                          <div className="vtr-name-en">{fmtText(voter.name_en)}</div>
                          <div className="vtr-name-kh">{fmtText(voter.name_kh)}</div>
                        </td>

                        <td>{fmtText(voter.gender)}</td>

                        <td>
                          {fmtText(voter.dob_display)}
                          <span className="vtr-mini">
                            Age: {age === null ? "—" : age}
                          </span>
                        </td>

                        <td>{fmtText(voter.pob)}</td>
                        <td>{fmtText(voter.issued_date)}</td>
                        <td>{fmtText(voter.expiry_date)}</td>

                        <td>
                          <span className={`vtr-status ${tone}`}>
                            {tone === "expired"
                              ? "Expired"
                              : tone === "underage"
                              ? "Under 18"
                              : "Active"}
                          </span>
                        </td>

                        <td>
                          <div className="vtr-table-actions">
                            <button
                              className="vtr-table-btn edit"
                              onClick={() => openEdit(voter)}
                              type="button"
                            >
                              ✏️ Edit
                            </button>

                            <button
                              className="vtr-table-btn card"
                              onClick={() => openCard(voter)}
                              type="button"
                            >
                              🪪 Show ID Card
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>

        {viewingCard && (
          <div style={styles.overlay} onClick={() => setViewingCard(null)}>
            <div
              style={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h5 className="vtr-popup-title">Digital ID Card</h5>

              <div style={styles.cardContainer}>
                <div style={styles.idNumber}>{viewingCard.id_number}</div>

                <div style={styles.mainRow}>
                  <div style={styles.photoBox}>
                    <img
                      src={
                        viewingCard.photo
                          ? `data:image/jpeg;base64,${String(viewingCard.photo).replace(
                              "data:image/jpeg;base64,",
                              ""
                            )}`
                          : "https://via.placeholder.com/85x110"
                      }
                      alt="User"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "3px",
                      }}
                    />
                  </div>

                  <div style={styles.detailsCol}>
                    <div style={styles.textLine}>
                      <span style={styles.labelKh}>គោត្តនាម និងនាម: </span>
                      <span style={styles.valueKhBold}>{viewingCard.name_kh || ""}</span>
                    </div>

                    <div style={styles.textLine}>
                      <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                        {viewingCard.name_en ? viewingCard.name_en.toUpperCase() : ""}
                      </span>
                    </div>

                    <div style={styles.textLine}>
                      <span style={styles.labelKh}>ថ្ងៃខែឆ្នាំកំណើត: </span>
                      <span style={{ ...styles.valueKhBold, marginRight: "6px" }}>
                        {viewingCard.dob_display || ""}
                      </span>

                      <span style={styles.labelKh}>ភេទ: </span>
                      <span style={{ ...styles.valueKhBold, marginRight: "6px" }}>
                        {viewingCard.gender || ""}
                      </span>

                      <span style={styles.labelKh}>កម្ពស់: </span>
                      <span style={styles.valueKhBold}>
                        {(viewingCard.height || "170") + "cm"}
                      </span>
                    </div>

                    <div style={styles.textLine}>
                      <span style={styles.labelKh}>ទីកន្លែងកំណើត: </span>
                      <span style={styles.valueKh}>{viewingCard.pob || "Cambodia"}</span>
                    </div>

                    <div style={styles.textLine}>
                      <span style={styles.labelKh}>អាសយដ្ឋាន: </span>
                      <span style={styles.valueKh}>{viewingCard.address || "Phnom Penh"}</span>
                    </div>

                    <div style={styles.textLine}>
                      <span style={styles.labelKh}>សុពលភាព: </span>
                      <span style={styles.labelKh}>
                        {viewingCard.issued_date || "01.01.2023"} ដល់ថ្ងៃ{" "}
                        {viewingCard.expiry_date || "01.01.2033"}
                      </span>
                    </div>
                  </div>

                  <div style={styles.qrCol}>
                    <div style={styles.qrBox}>
                      {viewingCard.qrcode ? (
                        <img
                          src={
                            String(viewingCard.qrcode).startsWith("data:")
                              ? viewingCard.qrcode
                              : `data:image/png;base64,${viewingCard.qrcode}`
                          }
                          style={{ width: "65px", height: "65px" }}
                          alt="QR"
                        />
                      ) : (
                        <QRCode value={viewingCard.qr_token || "no-token"} size={65} />
                      )}
                    </div>
                  </div>
                </div>

                <div style={styles.mrzContainer}>
                  <div style={styles.mrzText}>
                    {viewingCard.mrz_line1 ||
                      `IDKHM${viewingCard.id_number}<<<<<<<<<<<<<<<`}
                  </div>
                  <div style={styles.mrzText}>
                    {viewingCard.mrz_line2 || `9901018M3001014KHM<<<<<<<<<<<0`}
                  </div>
                  <div style={styles.mrzText}>
                    {viewingCard.mrz_line3 ||
                      `${(viewingCard.name_en || "").replace(/ /g, "<")}<<<<<<<<<<<<<<<`}
                  </div>
                </div>
              </div>

              <button className="vtr-popup-close" onClick={() => setViewingCard(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px",
  },

  modalContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "10px",
  },

  cardContainer: {
    position: "relative",
    width: "380px",
    minHeight: "240px",
    height: "auto",
    backgroundColor: "#fff",
    borderRadius: "12px",
    backgroundImage:
      'url("https://www.transparenttextures.com/patterns/black-thread-light.png")',
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
    padding: "10px",
    fontFamily: "Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
    overflow: "visible",
  },

  idNumber: {
    position: "absolute",
    top: "10px",
    right: "14px",
    color: "#000",
    fontSize: "18px",
    fontWeight: "900",
  },

  mainRow: {
    display: "flex",
    marginTop: "35px",
    alignItems: "flex-start",
    gap: "8px",
    height: "auto",
  },

  photoBox: {
    width: "85px",
    height: "110px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    padding: "2px",
    flex: "0 0 85px",
  },

  detailsCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    minWidth: 0,
    overflow: "visible",
    paddingRight: "4px",
  },

  qrCol: {
    width: "70px",
    flex: "0 0 70px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },

  qrBox: {
    padding: "2px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    backgroundColor: "white",
  },

  textLine: {
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflow: "visible",
    textOverflow: "clip",
    marginBottom: "2px",
    lineHeight: "0.9",
  },

  labelKh: {
    fontFamily: '"Khmer OS Battambang", sans-serif',
    fontSize: "9px",
    color: "#333",
  },

  valueKh: {
    fontFamily: '"Khmer OS Battambang", sans-serif',
    fontSize: "9px",
    fontWeight: "bold",
    color: "#000",
  },

  valueKhBold: {
    fontFamily: '"Khmer OS Battambang", sans-serif',
    fontSize: "10px",
    fontWeight: "bold",
    color: "#000",
  },

  mrzContainer: {
    marginTop: "auto",
    paddingTop: "8px",
    display: "flex",
    flexDirection: "column",
    lineHeight: "1.1",
  },

  mrzText: {
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "1px",
    color: "#333",
  },
};

export default VotersAdmin;