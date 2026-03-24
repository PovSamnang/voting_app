import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminShell from "../../components/AdminShell";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const API_ROOT = API_URL.replace(/\/api\/?$/, "");

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function getAdminHeaders() {
  const token = localStorage.getItem("admin_token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function boolText(v) {
  return v ? "ត្រូវគ្នា" : "មិនត្រូវគ្នា";
}

function resolveImageSrc(value) {
  const s = String(value || "").trim();
  if (!s) return "";

  if (s.startsWith("data:")) return s;
  if (s.startsWith("/9j/")) return `data:image/jpeg;base64,${s}`;
  if (s.startsWith("iVBORw0K")) return `data:image/png;base64,${s}`;
  if (s.startsWith("UklGR")) return `data:image/webp;base64,${s}`;

  if (s.startsWith("/uploads/")) return `${API_ROOT}${s}`;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${API_ROOT}${s}`;

  if (s.length > 100) return `data:image/jpeg;base64,${s}`;

  return "";
}

function statusClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "approved";
  if (s === "REJECTED") return "rejected";
  return "pending";
}

export default function AdminDocumentChangeRequestsPage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState("PENDING");
  const [rows, setRows] = useState([]);
  const [selectedRequestNo, setSelectedRequestNo] = useState("");
  const [detail, setDetail] = useState(null);

  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [msg, setMsg] = useState(null);
  const [adminNote, setAdminNote] = useState("");

  const selectedRow = useMemo(
    () => rows.find((x) => x.request_no === selectedRequestNo) || null,
    [rows, selectedRequestNo]
  );

  const fetchList = async () => {
    try {
      setListLoading(true);
      setMsg(null);

      const res = await axios.get(`${API_URL}/admin/document-change-requests`, {
        headers: getAdminHeaders(),
        params: status ? { status } : {},
      });

      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setRows(items);

      setSelectedRequestNo((prev) => {
        if (prev && items.some((x) => x.request_no === prev)) return prev;
        return items[0]?.request_no || "";
      });
    } catch (err) {
      const code = err?.response?.status;
      if (code === 403 || code === 401) {
        navigate("/admin/login");
        return;
      }

      setRows([]);
      setSelectedRequestNo("");
      setMsg({
        type: "danger",
        text:
          err?.response?.data?.message ||
          err.message ||
          "មិនអាចទាញយកសំណើបានទេ",
      });
    } finally {
      setListLoading(false);
    }
  };

  const fetchDetail = async (requestNo) => {
    if (!requestNo) {
      setDetail(null);
      setAdminNote("");
      return;
    }

    try {
      setDetailLoading(true);
      setMsg(null);

      const res = await axios.get(
        `${API_URL}/admin/document-change-requests/${encodeURIComponent(
          requestNo
        )}`,
        {
          headers: getAdminHeaders(),
        }
      );

      setDetail(res.data || null);
      setAdminNote(res.data?.request?.admin_note || "");
    } catch (err) {
      const code = err?.response?.status;
      if (code === 403 || code === 401) {
        navigate("/admin/login");
        return;
      }

      setDetail(null);
      setAdminNote("");
      setMsg({
        type: "danger",
        text:
          err?.response?.data?.message ||
          err.message ||
          "មិនអាចទាញយកព័ត៌មានលម្អិតបានទេ",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    fetchList();
  }, [status]); // eslint-disable-line

  useEffect(() => {
    fetchDetail(selectedRequestNo);
  }, [selectedRequestNo]); // eslint-disable-line

  const handleAction = async (action) => {
    if (!selectedRequestNo) return;

    try {
      setActionLoading(true);
      setMsg(null);

      const res = await axios.patch(
        `${API_URL}/admin/document-change-requests/${encodeURIComponent(
          selectedRequestNo
        )}`,
        {
          action,
          admin_note: adminNote,
        },
        {
          headers: getAdminHeaders(),
        }
      );

      setMsg({
        type: "success",
        text: res.data?.message || "បានធ្វើបច្ចុប្បន្នភាពសំណើរួចរាល់",
      });

      await fetchList();
      await fetchDetail(selectedRequestNo);
    } catch (err) {
      const data = err?.response?.data;
      const code = err?.response?.status;

      if (code === 403 || code === 401) {
        navigate("/admin/login");
        return;
      }

      let text =
        data?.message || err.message || "មិនអាចធ្វើបច្ចុប្បន្នភាពសំណើបានទេ";

      if (data?.checks) {
        text +=
          ` | DOB: ${boolText(data.checks.dob_match)}` +
          ` | Gender: ${boolText(data.checks.gender_match)}` +
          ` | Name: ${boolText(data.checks.name_match)}` +
          ` | Face: ${boolText(data.checks.face_match)}` +
          ` | Score: ${data.checks.face_confidence ?? 0}`;
      }

      setMsg({
        type: "danger",
        text,
      });

      await fetchDetail(selectedRequestNo);
    } finally {
      setActionLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login", { replace: true });
  };

  const verification = detail?.verification;
  const request = detail?.request;

  const checks = verification?.checks || {};
  const nameMatch = checks.nameMatch ?? checks.name_match ?? false;
  const dobMatch = checks.dobMatch ?? checks.dob_match ?? false;
  const genderMatch = checks.genderMatch ?? checks.gender_match ?? false;
  const faceMatch = checks.faceMatch ?? checks.face_match ?? false;
  const faceConfidence = Number(
    checks.faceConfidence ?? checks.face_confidence ?? 0
  );
  const faceError = checks.faceError ?? checks.face_error ?? "";
  const canApprove =
    verification?.canApprove === true || verification?.can_approve === true;

  const refreshCurrent = async () => {
    await fetchList();
    if (selectedRequestNo) {
      await fetchDetail(selectedRequestNo);
    }
  };

  return (
    <AdminShell
      active="requests"
      onLogout={logout}
      adminName="Admin"
      title="Document Change Requests"
      subtitle="ពិនិត្យ ផ្ទៀងផ្ទាត់ និងអនុម័ត ឬបដិសេធសំណើផ្លាស់ប្ដូរឯកសារដែលបានផ្ញើមកពីអ្នកបោះឆ្នោត"
      headerAction={
        <button
          type="button"
          className="crq-head-btn"
          onClick={refreshCurrent}
          disabled={listLoading || detailLoading || actionLoading}
        >
          <span className="material-symbols-outlined">refresh</span>
          Refresh
        </button>
      }
    >
      <style>{`
        .crq-head-btn{
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
        .crq-head-btn:disabled{
          opacity:.7;
          cursor:not-allowed;
        }

        .crq-page{
          color:#191c1d;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .crq-watermark{
          background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L35 25L55 30L35 35L30 55L25 35L5 30L25 25Z' fill='%23735c00' fill-opacity='0.05'/%3E%3C/svg%3E");
        }

        .crq-hero{
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

        .crq-hero-inner{
          position:relative;
          z-index:2;
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:18px;
          flex-wrap:wrap;
        }

        .crq-kicker{
          display:flex;
          align-items:center;
          gap:12px;
          margin-bottom:12px;
        }

        .crq-kicker-line{
          width:34px;
          height:1px;
          background:#ffe088;
        }

        .crq-kicker-text{
          color:#ffe088;
          font-size:12px;
          font-weight:900;
          letter-spacing:.18em;
          text-transform:uppercase;
        }

        .crq-title-kh{
          margin:0;
          font-size:36px;
          line-height:1.08;
          font-weight:900;
          letter-spacing:-.03em;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .crq-title-en{
          margin:8px 0 0;
          font-size:18px;
          color:#b3c5ff;
          font-weight:700;
        }

        .crq-hero-box{
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

        .crq-hero-box .material-symbols-outlined{
          font-size:34px;
          color:#ffe088;
          font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24;
        }

        .crq-hero-label{
          margin:0 0 4px;
          font-size:10px;
          letter-spacing:.16em;
          text-transform:uppercase;
          color:rgba(255,255,255,.65);
          font-weight:800;
        }

        .crq-hero-value{
          margin:0;
          font-size:16px;
          font-weight:900;
        }

        .crq-msg{
          margin-bottom:18px;
          padding:14px 16px;
          border-radius:10px;
          border:1px solid transparent;
          font-size:14px;
          font-weight:800;
        }

        .crq-msg.success{
          background:#edf9f0;
          color:#157347;
          border-color:#b9e2c2;
        }

        .crq-msg.danger{
          background:#fff3f3;
          color:#c62828;
          border-color:#f1c7c7;
        }

        .crq-stats{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:18px;
          margin-bottom:24px;
        }

        .crq-stat{
          background:#fff;
          border-radius:8px;
          padding:22px;
          min-height:110px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          position:relative;
          overflow:hidden;
        }

        .crq-stat::before{
          content:"";
          position:absolute;
          left:0;
          top:0;
          bottom:0;
          width:4px;
        }

        .crq-stat.primary::before{ background:#00113a; }
        .crq-stat.gold::before{ background:#735c00; }
        .crq-stat.error::before{ background:#ba1a1a; }

        .crq-stat-label{
          margin:0 0 8px;
          font-size:12px;
          color:#c5c6d2;
          font-weight:900;
          letter-spacing:.14em;
          text-transform:uppercase;
        }

        .crq-stat-value{
          margin:0 0 6px;
          font-size:24px;
          color:#00113a;
          font-weight:900;
          line-height:1;
        }

        .crq-stat-note{
          margin:0;
          font-size:11px;
          font-weight:700;
          color:#64748b;
        }

        .crq-stat-icon{
          font-size:54px;
          opacity:.1;
          color:#00113a;
        }

        .crq-stat.gold .crq-stat-icon{ color:#735c00; }
        .crq-stat.error .crq-stat-icon{ color:#ba1a1a; }

        .crq-toolbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:14px;
          flex-wrap:wrap;
          margin-bottom:18px;
          padding:0 4px;
        }

        .crq-toolbar-left{
          display:flex;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
        }

        .crq-toolbar-label{
          font-size:13px;
          font-weight:900;
          letter-spacing:.12em;
          text-transform:uppercase;
          color:#444650;
        }

        .crq-select{
          height:42px;
          border:1px solid rgba(117,118,130,.22);
          background:#fff;
          border-radius:10px;
          padding:0 14px;
          min-width:180px;
          font-size:14px;
          font-weight:800;
          color:#00113a;
          outline:none;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .crq-filter-pill{
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

        .crq-filter-dot{
          width:8px;
          height:8px;
          border-radius:999px;
          background:#ef4444;
        }

        .crq-layout{
          display:grid;
          grid-template-columns:360px minmax(0,1fr);
          gap:22px;
          align-items:start;
        }

        .crq-card{
          background:#fff;
          border:1px solid rgba(117,118,130,.15);
          border-radius:12px;
          overflow:hidden;
          box-shadow:0 10px 26px rgba(15,23,42,.04);
        }

        .crq-card-head{
          padding:16px 18px;
          background:#f3f4f5;
          border-bottom:1px solid #edeeef;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }

        .crq-card-title{
          margin:0;
          color:#00113a;
          font-size:17px;
          font-weight:900;
          letter-spacing:-.02em;
        }

        .crq-card-meta{
          color:#735c00;
          font-size:11px;
          font-weight:900;
          letter-spacing:.12em;
          text-transform:uppercase;
        }

        .crq-list{
          padding:10px;
          max-height:78vh;
          overflow:auto;
        }

        .crq-item{
          border:1px solid rgba(117,118,130,.18);
          background:#fff;
          border-radius:12px;
          padding:14px;
          margin-bottom:10px;
          cursor:pointer;
          transition:.18s ease;
        }

        .crq-item:hover{
          border-color:#7d9ed6;
          box-shadow:0 8px 18px rgba(0,17,58,.06);
          transform:translateY(-1px);
        }

        .crq-item.active{
          border-color:#002366;
          background:#f7faff;
          box-shadow:0 10px 20px rgba(0,35,102,.08);
        }

        .crq-item-top{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px;
          margin-bottom:10px;
        }

        .crq-item-no{
          color:#00113a;
          font-size:14px;
          font-weight:900;
          word-break:break-word;
        }

        .crq-badge{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:96px;
          padding:6px 10px;
          border-radius:999px;
          font-size:11px;
          font-weight:900;
          border:1px solid transparent;
          text-transform:uppercase;
          letter-spacing:.04em;
          white-space:nowrap;
        }

        .crq-badge.pending{
          background:#fff7e8;
          color:#9a6700;
          border-color:#f3d08b;
        }

        .crq-badge.approved{
          background:#edf9f0;
          color:#157347;
          border-color:#b9e2c2;
        }

        .crq-badge.rejected{
          background:#fff3f3;
          color:#c62828;
          border-color:#f1c7c7;
        }

        .crq-item-grid{
          display:grid;
          gap:6px;
        }

        .crq-item-row{
          color:#475569;
          font-size:13px;
          font-weight:700;
          line-height:1.5;
        }

        .crq-empty,
        .crq-loading{
          padding:24px;
          text-align:center;
          color:#64748b;
          font-size:14px;
          font-weight:800;
        }

        .crq-detail{
          padding:18px;
        }

        .crq-detail-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
          margin-bottom:16px;
        }

        .crq-detail-title{
          margin:0;
          color:#00113a;
          font-size:20px;
          font-weight:900;
          letter-spacing:-.02em;
        }

        .crq-detail-chips{
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
        }

        .crq-chip{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 12px;
          border-radius:999px;
          background:#f3f4f5;
          color:#444650;
          font-size:11px;
          font-weight:900;
          letter-spacing:.08em;
          text-transform:uppercase;
        }

        .crq-chip.ok{
          background:#baeed9;
          color:#002117;
        }

        .crq-chip.no{
          background:#ffdad6;
          color:#93000a;
        }

        .crq-main-grid{
          display:grid;
          grid-template-columns:1.15fr .95fr;
          gap:18px;
        }

        .crq-panel{
          border:1px solid rgba(117,118,130,.16);
          border-radius:12px;
          overflow:hidden;
          background:#fff;
        }

        .crq-panel-head{
          padding:14px 16px;
          background:#f7f8fa;
          border-bottom:1px solid #edeeef;
          color:#00113a;
          font-size:15px;
          font-weight:900;
        }

        .crq-panel-body{
          padding:16px;
        }

        .crq-info{
          display:grid;
          grid-template-columns:210px 1fr;
          gap:12px 16px;
          align-items:start;
        }

        .crq-info-label{
          text-align:right;
          color:#444650;
          font-size:13px;
          font-weight:900;
        }

        .crq-info-value{
          color:#191c1d;
          font-size:14px;
          font-weight:700;
          word-break:break-word;
        }

        .crq-images{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
        }

        .crq-image-card{
          border:1px solid rgba(117,118,130,.16);
          border-radius:12px;
          overflow:hidden;
          background:#fff;
        }

        .crq-image-head{
          padding:12px 14px;
          background:#f7f8fa;
          border-bottom:1px solid #edeeef;
          color:#00113a;
          font-size:14px;
          font-weight:900;
        }

        .crq-image-box{
          aspect-ratio:4/4.8;
          background:#f8fafc;
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
        }

        .crq-image-box img{
          width:100%;
          height:100%;
          object-fit:cover;
        }

        .crq-image-empty{
          color:#94a3b8;
          font-size:13px;
          font-weight:800;
          text-align:center;
          padding:18px;
        }

        .crq-verification{
          margin-top:18px;
        }

        .crq-check-grid{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:12px;
        }

        .crq-check{
          border:1px solid rgba(117,118,130,.16);
          border-radius:12px;
          padding:14px;
          background:#fff;
        }

        .crq-check-label{
          display:block;
          margin-bottom:6px;
          color:#64748b;
          font-size:12px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.04em;
        }

        .crq-check-value{
          display:block;
          font-size:15px;
          font-weight:900;
        }

        .crq-check-value.ok{ color:#157347; }
        .crq-check-value.no{ color:#c62828; }

        .crq-note-wrap{
          margin-top:16px;
        }

        .crq-textarea{
          width:100%;
          min-height:120px;
          border:1px solid rgba(117,118,130,.22);
          border-radius:12px;
          padding:12px 14px;
          font-size:14px;
          font-weight:700;
          resize:vertical;
          outline:none;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .crq-note-hint{
          margin-top:10px;
          color:#64748b;
          font-size:13px;
          font-weight:700;
          line-height:1.6;
        }

        .crq-note-error{
          margin-top:10px;
          color:#c62828;
          font-size:13px;
          font-weight:800;
        }

        .crq-actions{
          display:flex;
          justify-content:flex-end;
          gap:12px;
          flex-wrap:wrap;
          margin-top:16px;
        }

        .crq-btn{
          border:none;
          border-radius:10px;
          padding:12px 18px;
          font-size:14px;
          font-weight:900;
          cursor:pointer;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .crq-btn.reject{
          background:#ffdad6;
          color:#93000a;
        }

        .crq-btn.approve{
          background:#00113a;
          color:#fff;
        }

        .crq-btn:disabled{
          opacity:.7;
          cursor:not-allowed;
        }

        @media (max-width: 1200px){
          .crq-layout{
            grid-template-columns:1fr;
          }
          .crq-list{
            max-height:none;
          }
        }

        @media (max-width: 980px){
          .crq-main-grid,
          .crq-images,
          .crq-check-grid,
          .crq-stats{
            grid-template-columns:1fr;
          }

          .crq-info{
            grid-template-columns:1fr;
          }

          .crq-info-label{
            text-align:left;
          }
        }

        @media (max-width: 760px){
          .crq-title-kh{
            font-size:28px;
          }

          .crq-hero-box{
            min-width:auto;
            width:100%;
          }
        }
      `}</style>

      <div className="crq-page">
        <section className="crq-hero crq-watermark">
          <div className="crq-hero-inner">
            <div>
              <div className="crq-kicker">
                <span className="crq-kicker-line" />
                <span className="crq-kicker-text">Sovereign State of Cambodia</span>
              </div>
              <h2 className="crq-title-kh">គ្រប់គ្រងសំណើផ្លាស់ប្ដូរឯកសារ</h2>
              <p className="crq-title-en">Document Change Request Command Center</p>
            </div>

            <div className="crq-hero-box">
              <span className="material-symbols-outlined">edit_document</span>
              <div>
                <p className="crq-hero-label">Current Queue</p>
                <p className="crq-hero-value">
                  {listLoading ? "Loading..." : `${rows.length} request(s)`}
                </p>
              </div>
            </div>
          </div>
        </section>

        {msg && (
          <div className={`crq-msg ${msg.type === "success" ? "success" : "danger"}`}>
            {msg.text}
          </div>
        )}

        <section className="crq-stats">
          <div className="crq-stat primary">
            <div>
              <p className="crq-stat-label">Filtered Requests</p>
              <p className="crq-stat-value">{listLoading ? "..." : rows.length}</p>
              <p className="crq-stat-note">Requests in current selected status</p>
            </div>
            <span className="material-symbols-outlined crq-stat-icon">inbox</span>
          </div>

          <div className="crq-stat gold">
            <div>
              <p className="crq-stat-label">Selected Request</p>
              <p className="crq-stat-value">{selectedRequestNo || "—"}</p>
              <p className="crq-stat-note">Current request in review</p>
            </div>
            <span className="material-symbols-outlined crq-stat-icon">assignment</span>
          </div>

          <div className="crq-stat error">
            <div>
              <p className="crq-stat-label">Approval Eligibility</p>
              <p className="crq-stat-value">
                {request ? (canApprove ? "Ready" : "Blocked") : "—"}
              </p>
              <p className="crq-stat-note">
                Based on backend verification result
              </p>
            </div>
            <span className="material-symbols-outlined crq-stat-icon">verified_user</span>
          </div>
        </section>

        <section className="crq-toolbar">
          <div className="crq-toolbar-left">
            <span className="crq-toolbar-label">Status Filter</span>
            <select
              className="crq-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="">ALL</option>
            </select>
          </div>

          <div className="crq-filter-pill">
            <span className="crq-filter-dot" />
            <span>{status || "ALL"} VIEW</span>
          </div>
        </section>

        <section className="crq-layout">
          <div className="crq-card">
            <div className="crq-card-head">
              <h3 className="crq-card-title">Request Queue</h3>
              <span className="crq-card-meta">
                {listLoading ? "Loading" : `${rows.length} item(s)`}
              </span>
            </div>

            <div className="crq-list">
              {listLoading && <div className="crq-loading">កំពុងទាញយកសំណើ...</div>}

              {!listLoading && rows.length === 0 && (
                <div className="crq-empty">មិនមានសំណើនៅក្នុងស្ថានភាពនេះទេ</div>
              )}

              {!listLoading &&
                rows.map((r) => (
                  <div
                    key={r.request_no}
                    className={`crq-item ${
                      selectedRequestNo === r.request_no ? "active" : ""
                    }`}
                    onClick={() => setSelectedRequestNo(r.request_no)}
                  >
                    <div className="crq-item-top">
                      <div className="crq-item-no">{r.request_no}</div>
                      <span className={`crq-badge ${statusClass(r.status)}`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="crq-item-grid">
                      <div className="crq-item-row">
                        ឈ្មោះចាស់៖ {r.old_name_kh || r.old_name_en || "—"}
                      </div>
                      <div className="crq-item-row">
                        លេខចាស់៖ {r.old_id_number || "—"}
                      </div>
                      <div className="crq-item-row">
                        លេខថ្មី៖ {r.new_id_number || "—"}
                      </div>
                      <div className="crq-item-row">
                        បង្កើតនៅ៖ {fmtDate(r.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="crq-card">
            <div className="crq-card-head">
              <h3 className="crq-card-title">
                Detail Review{selectedRow ? ` • ${selectedRow.request_no}` : ""}
              </h3>
              <span className="crq-card-meta">Verification & Decision</span>
            </div>

            {detailLoading && (
              <div className="crq-loading">កំពុងទាញយកព័ត៌មានលម្អិត...</div>
            )}

            {!detailLoading && !request && (
              <div className="crq-empty">សូមជ្រើសសំណើមួយពីបញ្ជីខាងឆ្វេង</div>
            )}

            {!detailLoading && request && (
              <div className="crq-detail">
                <div className="crq-detail-top">
                  <h3 className="crq-detail-title">Request Information</h3>

                  <div className="crq-detail-chips">
                    <span className={`crq-badge ${statusClass(request.status)}`}>
                      {request.status}
                    </span>
                    <span className={`crq-chip ${canApprove ? "ok" : "no"}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        {canApprove ? "verified" : "gpp_bad"}
                      </span>
                      {canApprove ? "Can Approve" : "Cannot Approve"}
                    </span>
                    <span className="crq-chip">
                      Face Score {faceConfidence.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="crq-main-grid">
                  <div className="crq-panel">
                    <div className="crq-panel-head">ព័ត៌មានសំណើ</div>
                    <div className="crq-panel-body">
                      <div className="crq-info">
                        <div className="crq-info-label">លេខតាមដាន</div>
                        <div className="crq-info-value">{request.request_no}</div>

                        <div className="crq-info-label">លេខអត្តសញ្ញាណចាស់</div>
                        <div className="crq-info-value">{request.old_id_number || "—"}</div>

                        <div className="crq-info-label">លេខអត្តសញ្ញាណថ្មី</div>
                        <div className="crq-info-value">{request.new_id_number || "—"}</div>

                        <div className="crq-info-label">ឈ្មោះដែលស្នើសុំ</div>
                        <div className="crq-info-value">
                          {request.requested_name_kh ||
                            request.requested_name_en ||
                            "—"}
                        </div>

                        <div className="crq-info-label">ភេទ</div>
                        <div className="crq-info-value">
                          {request.requested_gender || "—"}
                        </div>

                        <div className="crq-info-label">ថ្ងៃខែឆ្នាំកំណើត</div>
                        <div className="crq-info-value">
                          {request.requested_dob_display || "—"}
                        </div>

                        <div className="crq-info-label">ទូរស័ព្ទ</div>
                        <div className="crq-info-value">
                          {request.requested_phone || "—"}
                        </div>

                        <div className="crq-info-label">អ៊ីមែល</div>
                        <div className="crq-info-value">
                          {request.requested_email || "—"}
                        </div>

                        <div className="crq-info-label">បង្កើតនៅ</div>
                        <div className="crq-info-value">
                          {fmtDate(request.created_at)}
                        </div>

                        <div className="crq-info-label">បានពិនិត្យនៅ</div>
                        <div className="crq-info-value">
                          {fmtDate(request.reviewed_at)}
                        </div>

                        <div className="crq-info-label">កំណត់សម្គាល់អ្នកគ្រប់គ្រង</div>
                        <div className="crq-info-value">
                          {request.admin_note || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="crq-panel">
                    <div className="crq-panel-head">រូបភាពប្រៀបធៀប</div>
                    <div className="crq-panel-body">
                      <div className="crq-images">
                        <div className="crq-image-card">
                          <div className="crq-image-head">រូបភាពចាស់</div>
                          <div className="crq-image-box">
                            {resolveImageSrc(
                              verification?.oldVoter?.photo || selectedRow?.old_photo
                            ) ? (
                              <img
                                src={resolveImageSrc(
                                  verification?.oldVoter?.photo ||
                                    selectedRow?.old_photo
                                )}
                                alt="old voter"
                              />
                            ) : (
                              <div className="crq-image-empty">
                                មិនមានរូបភាពចាស់
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="crq-image-card">
                          <div className="crq-image-head">រូបភាពថ្មី</div>
                          <div className="crq-image-box">
                            {resolveImageSrc(
                              request.new_card_photo_path ||
                                request.new_card_photo_base64
                            ) ? (
                              <img
                                src={resolveImageSrc(
                                  request.new_card_photo_path ||
                                    request.new_card_photo_base64
                                )}
                                alt="new card"
                              />
                            ) : (
                              <div className="crq-image-empty">
                                មិនមានរូបភាពថ្មី
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="crq-panel crq-verification">
                  <div className="crq-panel-head">លទ្ធផលផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តិ</div>
                  <div className="crq-panel-body">
                    <div className="crq-check-grid">
                      <div className="crq-check">
                        <span className="crq-check-label">ឈ្មោះត្រូវគ្នា</span>
                        <span className={`crq-check-value ${nameMatch ? "ok" : "no"}`}>
                          {boolText(nameMatch)}
                        </span>
                      </div>

                      <div className="crq-check">
                        <span className="crq-check-label">
                          ថ្ងៃខែឆ្នាំកំណើតត្រូវគ្នា
                        </span>
                        <span className={`crq-check-value ${dobMatch ? "ok" : "no"}`}>
                          {boolText(dobMatch)}
                        </span>
                      </div>

                      <div className="crq-check">
                        <span className="crq-check-label">ភេទត្រូវគ្នា</span>
                        <span
                          className={`crq-check-value ${genderMatch ? "ok" : "no"}`}
                        >
                          {boolText(genderMatch)}
                        </span>
                      </div>

                      <div className="crq-check">
                        <span className="crq-check-label">រូបភាពត្រូវគ្នា</span>
                        <span className={`crq-check-value ${faceMatch ? "ok" : "no"}`}>
                          {boolText(faceMatch)}
                        </span>
                      </div>

                      <div className="crq-check">
                        <span className="crq-check-label">Face Confidence</span>
                        <span className="crq-check-value">
                          {faceConfidence.toFixed(2)}
                        </span>
                      </div>

                      <div className="crq-check">
                        <span className="crq-check-label">អាចអនុម័តបាន</span>
                        <span className={`crq-check-value ${canApprove ? "ok" : "no"}`}>
                          {canApprove ? "អាចអនុម័ត" : "មិនអាចអនុម័ត"}
                        </span>
                      </div>
                    </div>

                    {faceError ? (
                      <div className="crq-note-error">Face error: {faceError}</div>
                    ) : null}

                    <div className="crq-note-wrap">
                      <textarea
                        className="crq-textarea"
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="កំណត់សម្គាល់របស់អ្នកគ្រប់គ្រង..."
                        disabled={actionLoading}
                      />
                      <div className="crq-note-hint">
                        នៅពេល Approve ប្រព័ន្ធនឹងផ្ទៀងផ្ទាត់ឈ្មោះ DOB ភេទ និងរូបភាពម្ដងទៀតនៅ backend។
                      </div>
                    </div>

                    {request.status === "PENDING" && (
                      <div className="crq-actions">
                        <button
                          type="button"
                          className="crq-btn reject"
                          disabled={actionLoading}
                          onClick={() => handleAction("REJECT")}
                        >
                          {actionLoading ? "កំពុងដំណើរការ..." : "បដិសេធ"}
                        </button>

                        <button
                          type="button"
                          className="crq-btn approve"
                          disabled={actionLoading}
                          onClick={() => handleAction("APPROVE")}
                        >
                          {actionLoading ? "កំពុងដំណើរការ..." : "អនុម័ត"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}