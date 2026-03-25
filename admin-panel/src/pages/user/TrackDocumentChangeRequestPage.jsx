import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import UserShell from "../../components/UserShell";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function statusClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "approved";
  if (s === "REJECTED") return "rejected";
  return "pending";
}

export default function TrackDocumentChangeRequestPage() {
  const navigate = useNavigate();
  const params = useParams();

  const [requestNo, setRequestNo] = useState(params.requestNo || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [result, setResult] = useState(null);

  const fetchTrack = async (no) => {
    const clean = String(no || "").trim();
    if (!clean) {
      setMsg({
        type: "danger",
        text: "សូមបញ្ចូលលេខតាមដានជាមុនសិន",
      });
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setMsg(null);
      setResult(null);

      const res = await axios.get(
        `${API_URL}/document-change-request/track/${encodeURIComponent(clean)}`
      );

      setResult(res.data || null);
      setMsg({
        type: "success",
        text: "ស្វែងរកសំណើបានជោគជ័យ",
      });

      if (params.requestNo !== clean) {
        navigate(`/track-document-request/${encodeURIComponent(clean)}`, { replace: true });
      }
    } catch (err) {
      setResult(null);
      setMsg({
        type: "danger",
        text: err?.response?.data?.message || err.message || "មិនអាចស្វែងរកសំណើបានទេ",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.requestNo) {
      setRequestNo(params.requestNo);
      fetchTrack(params.requestNo);
    }
  }, [params.requestNo]); // eslint-disable-line

  const onSubmit = (e) => {
    e.preventDefault();
    fetchTrack(requestNo);
  };

  return (
    <UserShell>
      <div className="tdcr-page">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Kantumruy+Pro:wght@400;500;600;700&display=swap');

          .tdcr-page{
            min-height:100vh;
            background:#f5f7fb;
            padding-bottom:40px;
            font-family:Inter,"Kantumruy Pro",sans-serif;
            color:#0f172a;
          }

          .tdcr-wrap{
            max-width:1080px;
            margin:0 auto;
            padding:20px 18px;
          }

          .tdcr-top{
            background:#fff;
            border:1px solid #d8e1ee;
            border-radius:14px;
            overflow:hidden;
            box-shadow:0 12px 30px rgba(15,23,42,.05);
            margin-bottom:18px;
          }

          .tdcr-line{
            height:8px;
            background:#0b61b0;
          }

          .tdcr-top-body{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            flex-wrap:wrap;
            padding:18px 22px;
          }

          .tdcr-title{
            margin:0;
            color:#0b3b78;
            font-size:27px;
            font-weight:800;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .tdcr-sub{
            margin:6px 0 0;
            color:#64748b;
            font-size:14px;
            font-weight:700;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .tdcr-search{
            background:#fff;
            border:1px solid #d8e1ee;
            border-radius:14px;
            padding:20px;
            box-shadow:0 10px 24px rgba(15,23,42,.04);
            margin-bottom:16px;
          }

          .tdcr-row{
            display:grid;
            grid-template-columns:1fr 160px;
            gap:12px;
          }

          .tdcr-input{
            width:100%;
            height:50px;
            border:1px solid #ccd7e5;
            border-radius:10px;
            padding:0 14px;
            font-size:16px;
            font-weight:700;
            outline:none;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .tdcr-input:focus{
            border-color:#2b73be;
            box-shadow:0 0 0 3px rgba(43,115,190,.08);
          }

          .tdcr-btn{
            border:none;
            border-radius:10px;
            background:#0b61b0;
            color:#fff;
            font-size:15px;
            font-weight:800;
            cursor:pointer;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .tdcr-btn:disabled{
            opacity:.7;
            cursor:not-allowed;
          }

          .tdcr-msg{
            margin-bottom:16px;
            padding:13px 15px;
            border-radius:10px;
            font-size:15px;
            font-weight:800;
            border:1px solid transparent;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .tdcr-msg.success{
            background:#edf9f0;
            color:#157347;
            border-color:#b9e2c2;
          }

          .tdcr-msg.danger{
            background:#fff3f3;
            color:#c62828;
            border-color:#f1c7c7;
          }

          .tdcr-card{
            background:#fff;
            border:1px solid #d8e1ee;
            border-radius:14px;
            box-shadow:0 10px 24px rgba(15,23,42,.04);
            overflow:hidden;
          }

          .tdcr-card-head{
            padding:16px 18px;
            background:#f8fbff;
            border-bottom:1px solid #e4eaf3;
            color:#0b4d96;
            font-size:18px;
            font-weight:800;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .tdcr-card-body{
            padding:18px;
          }

          .tdcr-badge{
            display:inline-flex;
            align-items:center;
            justify-content:center;
            min-width:110px;
            padding:7px 12px;
            border-radius:999px;
            font-size:13px;
            font-weight:800;
            border:1px solid transparent;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .tdcr-badge.pending{
            background:#fff7e8;
            color:#9a6700;
            border-color:#f3d08b;
          }

          .tdcr-badge.approved{
            background:#edf9f0;
            color:#157347;
            border-color:#b9e2c2;
          }

          .tdcr-badge.rejected{
            background:#fff3f3;
            color:#c62828;
            border-color:#f1c7c7;
          }

          .tdcr-info{
            display:grid;
            grid-template-columns:240px 1fr;
            gap:12px 16px;
            align-items:center;
          }

          .tdcr-label{
            text-align:right;
            font-size:15px;
            font-weight:800;
            color:#334155;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .tdcr-value{
            font-size:15px;
            font-weight:700;
            color:#0f172a;
            word-break:break-word;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .tdcr-empty{
            padding:30px 20px;
            text-align:center;
            color:#64748b;
            font-size:15px;
            font-weight:800;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          @media (max-width: 700px){
            .tdcr-row{
              grid-template-columns:1fr;
            }

            .tdcr-info{
              grid-template-columns:1fr;
            }

            .tdcr-label{
              text-align:left;
            }
          }
        `}</style>

        <div className="tdcr-wrap">
          <div className="tdcr-top">
            <div className="tdcr-line" />
            <div className="tdcr-top-body">
              <div>
                <h2 className="tdcr-title">តាមដានស្ថានភាពសំណើផ្លាស់ប្ដូរឯកសារ</h2>
                <p className="tdcr-sub">
                  បញ្ចូលលេខតាមដានដែលបានផ្ញើទៅអ៊ីមែលរបស់អ្នក ដើម្បីពិនិត្យស្ថានភាពសំណើ
                </p>
              </div>
            </div>
          </div>

          <form className="tdcr-search" onSubmit={onSubmit}>
            <div className="tdcr-row">
              <input
                className="tdcr-input"
                value={requestNo}
                onChange={(e) => setRequestNo(e.target.value)}
                placeholder="បញ្ចូលលេខតាមដាន ឧ. DCR-20260314-ABC123"
              />
              <button className="tdcr-btn" type="submit" disabled={loading}>
                {loading ? "កំពុងស្វែងរក..." : "ស្វែងរក"}
              </button>
            </div>
          </form>

          {msg && (
            <div className={`tdcr-msg ${msg.type === "success" ? "success" : "danger"}`}>
              {msg.text}
            </div>
          )}

          <div className="tdcr-card">
            <div className="tdcr-card-head">លទ្ធផលសំណើ</div>

            {!result ? (
              <div className="tdcr-empty">សូមបញ្ចូលលេខតាមដាន ហើយចុចប៊ូតុង ស្វែងរក</div>
            ) : (
              <div className="tdcr-card-body">
                <div className="tdcr-info">
                  <div className="tdcr-label">លេខតាមដាន</div>
                  <div className="tdcr-value">{result.request_no || "—"}</div>

                  <div className="tdcr-label">ស្ថានភាព</div>
                  <div className="tdcr-value">
                    <span className={`tdcr-badge ${statusClass(result.status)}`}>
                      {result.status}
                    </span>
                  </div>

                  <div className="tdcr-label">លេខអត្តសញ្ញាណចាស់</div>
                  <div className="tdcr-value">{result.old_id_number || "—"}</div>

                  <div className="tdcr-label">លេខអត្តសញ្ញាណថ្មី</div>
                  <div className="tdcr-value">{result.new_id_number || "—"}</div>

                  <div className="tdcr-label">អ៊ីមែល</div>
                  <div className="tdcr-value">
                    {result.requested_email || result.email || "—"}
                  </div>

                  <div className="tdcr-label">ថ្ងៃបង្កើតសំណើ</div>
                  <div className="tdcr-value">{fmtDate(result.created_at)}</div>

                  <div className="tdcr-label">ថ្ងៃពិនិត្យ</div>
                  <div className="tdcr-value">{fmtDate(result.reviewed_at)}</div>

                  <div className="tdcr-label">កំណត់សម្គាល់អ្នកគ្រប់គ្រង</div>
                  <div className="tdcr-value">{result.admin_note || "—"}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </UserShell>
  );
}