import { useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import NecHeader from "../../components/NecHeader";
import DocumentChangeRequestModal from "./DocumentChangeRequestModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export default function DocumentChangeRequestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const voter = location.state?.voter || null;

  const [msg, setMsg] = useState(null);
  const [submittingChange, setSubmittingChange] = useState(false);

  const handleDocumentChangeSubmit = async (payload) => {
    try {
      setSubmittingChange(true);
      setMsg(null);

      const res = await axios.post(`${API_URL}/document-change-request`, payload);

      const requestNo = res.data?.request_no;
      const baseMessage =
        res.data?.message || "បានផ្ញើសំណើផ្លាស់ប្ដូរឯកសារ ដោយជោគជ័យ។";

      setMsg({
        type: "success",
        text: requestNo
          ? `${baseMessage} លេខតាមដាន៖ ${requestNo}`
          : baseMessage,
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const data = err?.response?.data;
      setMsg({
        type: "danger",
        text: data?.message || err.message || "មិនអាចផ្ញើសំណើបានទេ",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmittingChange(false);
    }
  };

  return (
    <>
      <NecHeader />

      <div className="dcr-page">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Kantumruy+Pro:wght@400;500;600;700&display=swap');

          .dcr-page{
            min-height:100vh;
            background:#f3f6fb;
            padding-bottom:48px;
            font-family:Inter,"Kantumruy Pro",sans-serif;
            color:#0f172a;
          }

          .dcr-wrap{
            max-width:1360px;
            margin:0 auto;
            padding:20px 18px;
          }

          .dcr-topbar{
            background:#ffffff;
            border:1px solid #d8e1ee;
            box-shadow:0 10px 30px rgba(15,23,42,.04);
            overflow:hidden;
            margin-bottom:18px;
          }

          .dcr-topbar-line{
            height:8px;
            background:#0b5cab;
          }

          .dcr-topbar-body{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:16px;
            flex-wrap:wrap;
            padding:18px 22px;
          }

          .dcr-title-wrap{
            display:flex;
            flex-direction:column;
            gap:6px;
          }

          .dcr-title{
            margin:0;
            color:#0b3b78;
            font-size:28px;
            font-weight:800;
            line-height:1.2;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .dcr-subtitle{
            margin:0;
            color:#475569;
            font-size:14px;
            font-weight:600;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .dcr-back{
            text-decoration:none !important;
            color:#0b4d96 !important;
            font-weight:800;
            font-size:15px;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .dcr-alert{
            margin-bottom:16px;
            border-radius:10px;
            padding:14px 16px;
            font-size:15px;
            font-weight:800;
            border:1px solid transparent;
            font-family:"Kantumruy Pro", Inter, sans-serif;
            box-shadow:0 8px 22px rgba(15,23,42,.04);
          }

          .dcr-alert.success{
            background:#edf9f0;
            color:#157347;
            border-color:#b9e2c2;
          }

          .dcr-alert.danger{
            background:#fff3f3;
            color:#c62828;
            border-color:#f1c7c7;
          }

          .emptyCard{
            background:#fff;
            border:1px solid #d7dde8;
            border-radius:12px;
            padding:28px 24px;
            box-shadow:0 10px 28px rgba(15,23,42,.05);
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .emptyTitle{
            margin:0 0 10px;
            font-size:21px;
            font-weight:800;
            color:#0b3b78;
          }

          .emptyText{
            margin:0 0 18px;
            font-size:15px;
            font-weight:700;
            color:#334155;
          }

          .backBtn{
            border:none;
            border-radius:8px;
            padding:11px 18px;
            background:#0b61b0;
            color:#fff;
            font-size:15px;
            font-weight:800;
            cursor:pointer;
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          @media (max-width: 900px){
            .dcr-title{
              font-size:23px;
            }

            .dcr-topbar-body{
              padding:16px;
            }
          }
        `}</style>

        <div className="dcr-wrap">
          <div className="dcr-topbar">
            <div className="dcr-topbar-line" />
            <div className="dcr-topbar-body">
              <div className="dcr-title-wrap">
                <h2 className="dcr-title">ស្នើសុំផ្លាស់ប្ដូរឯកសារផ្លូវការ</h2>
                <p className="dcr-subtitle">
                  សម្រាប់អ្នកបោះឆ្នោតដែលអត្តសញ្ញាណប័ណ្ណអស់សុពលភាព ឬត្រូវការកែប្រែព័ត៌មានឯកសារ
                </p>
              </div>

              <Link className="dcr-back" to="/official-voter-search">
                ← ត្រឡប់ទៅទំព័រស្វែងរក
              </Link>
            </div>
          </div>

          {msg && (
            <div className={`dcr-alert ${msg.type === "success" ? "success" : "danger"}`}>
              {msg.text}
            </div>
          )}

          {!voter ? (
            <div className="emptyCard">
              <h3 className="emptyTitle">មិនមានទិន្នន័យអ្នកស្នើសុំទេ</h3>
              <p className="emptyText">
                សូមត្រឡប់ទៅទំព័រស្វែងរក ហើយជ្រើសអ្នកបោះឆ្នោតដែលត្រូវការស្នើសុំផ្លាស់ប្ដូរឯកសារជាមុនសិន។
              </p>
              <button className="backBtn" onClick={() => navigate("/official-voter-search")}>
                ត្រឡប់ទៅស្វែងរក
              </button>
            </div>
          ) : (
            <DocumentChangeRequestModal
              open={true}
              inline={true}
              voter={voter}
              onClose={() => navigate("/official-voter-search")}
              onSubmit={handleDocumentChangeSubmit}
              submitting={submittingChange}
            />
          )}
        </div>
      </div>
    </>
  );
}