import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const KHMER_MONTHS = [
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
  "សីហា",
  "កញ្ញា",
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
];

function splitKhName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { lastName: "", firstName: "" };
  if (parts.length === 1) return { lastName: parts[0], firstName: "" };
  return {
    lastName: parts[0],
    firstName: parts.slice(1).join(" "),
  };
}

function maskIdNumber(id) {
  const s = String(id || "").trim();
  if (!s) return "";
  if (s.length <= 3) return s;
  return `${"*".repeat(Math.max(0, s.length - 3))}${s.slice(-3)}`;
}

function toKhGenderValue(value) {
  const v = String(value || "").trim().toLowerCase();
  if (["m", "male", "ប្រុស"].includes(v)) return "ប្រុស";
  if (["f", "female", "ស្រី"].includes(v)) return "ស្រី";
  return "";
}

function getDobParts(voter) {
  if (voter?.dob_display) {
    const raw = String(voter.dob_display).trim().replace(/-/g, ".");
    const parts = raw.split(/[./-]/);
    if (parts.length === 3) {
      return {
        day: parts[0].padStart(2, "0"),
        month: parts[1].padStart(2, "0"),
        year: parts[2],
      };
    }
  }

  if (voter?.dob_iso) {
    const d = new Date(voter.dob_iso);
    if (!Number.isNaN(d.getTime())) {
      return {
        day: String(d.getDate()).padStart(2, "0"),
        month: String(d.getMonth() + 1).padStart(2, "0"),
        year: String(d.getFullYear()),
      };
    }
  }

  return { day: "", month: "", year: "" };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentChangeRequestModal({
  open,
  voter,
  onClose,
  onSubmit,
  submitting = false,
  inline = false,
}) {
  const nameParts = useMemo(() => splitKhName(voter?.name_kh), [voter]);
  const dobParts = useMemo(() => getDobParts(voter), [voter]);
  const [emailMsg, setEmailMsg] = useState(null);
const [checkingEmail, setCheckingEmail] = useState(false);
const checkEmailNow = async () => {
  const email = String(form.email || "").trim().toLowerCase();

  if (!email) {
    setEmailVerified(false);
    setEmailMsg({
      type: "danger",
      text: "សូមបញ្ចូលអ៊ីមែលជាមុនសិន",
    });
    return false;
  }

  try {
    setCheckingEmail(true);
    setEmailMsg(null);

    const res = await axios.post(`${API_URL}/document-change-request/check-email`, {
      voter_uuid: voter.uuid,
      email,
    });

    setEmailVerified(true);
    setEmailMsg({
      type: "success",
      text: res.data?.message || "អ៊ីមែលនេះអាចប្រើបាន",
    });

    return true;
  } catch (err) {
    setEmailVerified(false);
    setEmailMsg({
      type: "danger",
      text:
        err?.response?.data?.message ||
        err.message ||
        "អ៊ីមែលនេះមិនអាចប្រើបានទេ",
    });
    return false;
  } finally {
    setCheckingEmail(false);
  }
};
const [emailVerified, setEmailVerified] = useState(false);

  const [form, setForm] = useState({
    new_document_no: "",
    name_kh_last: "",
    name_kh_first: "",
    gender: "",
    dob_day: "",
    dob_month: "",
    dob_year: "",
    phone: "",
    email: "",
    note: "",
    photo_name: "",
    photo_base64: "",
    photo_preview: "",
  });

  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState(null);
  const [verifiedNewId, setVerifiedNewId] = useState(false);
  const [verifiedValue, setVerifiedValue] = useState("");

  useEffect(() => {
        setEmailMsg(null);
    setCheckingEmail(false);
    setEmailVerified(false);
    if (!open || !voter) return;

    setForm({
      new_document_no: "",
      name_kh_last: nameParts.lastName || "",
      name_kh_first: nameParts.firstName || "",
      gender: toKhGenderValue(voter?.gender),
      dob_day: dobParts.day || "",
      dob_month: dobParts.month || "",
      dob_year: dobParts.year || "",
      phone: voter?.phone || "",
      email: voter?.email || "",
      note: "",
      photo_name: "",
      photo_base64: "",
      photo_preview: "",
    });

    setVerifyMsg(null);
    setVerifiedNewId(false);
    setVerifiedValue("");
  }, [
    open,
    voter,
    nameParts.lastName,
    nameParts.firstName,
    dobParts.day,
    dobParts.month,
    dobParts.year,
  ]);

  if (!open || !voter) return null;

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 1900; y--) years.push(String(y));

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

  const formLocked = !verifiedNewId;

  const setField = (name, value) => {
  setForm((p) => ({ ...p, [name]: value }));

  if (name === "new_document_no") {
    const normalized = String(value || "").trim();
    if (normalized !== verifiedValue) {
      setVerifiedNewId(false);
    }
    setVerifyMsg(null);
  }

  if (name === "email") {
    setEmailVerified(false);
    setEmailMsg(null);
  }
};

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((p) => ({
        ...p,
        photo_name: file.name,
        photo_base64: dataUrl,
        photo_preview: dataUrl,
      }));
    } catch {
      setVerifyMsg({
        type: "danger",
        text: "មិនអាចអានរូបភាពបានទេ។ សូមជ្រើសរើសរូបភាពម្ដងទៀត។",
      });
    }
  };

  const handleVerify = async () => {
    const newId = String(form.new_document_no || "").trim();

    if (!newId) {
      setVerifyMsg({
        type: "danger",
        text: "សូមបញ្ចូលលេខអត្តសញ្ញាណប័ណ្ណថ្មីជាមុនសិន",
      });
      return;
    }

    try {
      setVerifying(true);
      setVerifyMsg(null);
      setVerifiedNewId(false);

      const res = await axios.post(`${API_URL}/document-change-request/check-new-id`, {
        voter_uuid: voter.uuid,
        old_id_number: voter.id_number,
        new_id_number: newId,
      });

      const ok = res.data?.ok !== false;

      if (!ok) {
        setVerifyMsg({
          type: "danger",
          text: res.data?.message || "លេខអត្តសញ្ញាណប័ណ្ណថ្មីនេះមិនអាចប្រើបានទេ",
        });
        return;
      }

      setVerifiedNewId(true);
      setVerifiedValue(newId);
      setVerifyMsg({
        type: "success",
        text: res.data?.message || "លេខអត្តសញ្ញាណប័ណ្ណថ្មីនេះអាចប្រើបាន។ សូមបំពេញព័ត៌មានខាងក្រោមបន្ត។",
      });
    } catch (err) {
      const data = err?.response?.data;
      setVerifyMsg({
        type: "danger",
        text: data?.message || err.message || "ផ្ទៀងផ្ទាត់លេខអត្តសញ្ញាណមិនជោគជ័យ",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!verifiedNewId) {
    setVerifyMsg({
      type: "danger",
      text: "សូមផ្ទៀងផ្ទាត់លេខអត្តសញ្ញាណប័ណ្ណថ្មីជាមុនសិន",
    });
    return;
  }

  if (!form.photo_base64) {
    setVerifyMsg({
      type: "danger",
      text: "សូមបញ្ចូលរូបភាពឯកសារថ្មី",
    });
    return;
  }

  const emailOk = await checkEmailNow();
  if (!emailOk) return;

  onSubmit?.({
    voter_uuid: voter.uuid,
    id_number: voter.id_number,
    new_document_no: form.new_document_no,
    name_kh: `${String(form.name_kh_last || "").trim()} ${String(form.name_kh_first || "").trim()}`.trim(),
    gender: form.gender,
    dob_day: form.dob_day,
    dob_month: form.dob_month,
    dob_year: form.dob_year,
    phone: form.phone,
    email: form.email,
    note: form.note,
    new_card_photo_name: form.photo_name,
    new_card_photo_base64: form.photo_base64,
  });
};

  return (
    <div
      className={inline ? "dcrm-inline-host" : "dcrm-overlay"}
      onClick={inline ? undefined : onClose}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Kantumruy+Pro:wght@400;500;600;700&display=swap');

        .dcrm-inline-host{
          width:100%;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .dcrm-overlay{
          position:fixed;
          inset:0;
          background:rgba(15,23,42,.35);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:9999;
          padding:20px;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .dcrm-shell{
          width:100%;
        }

        .dcrm-modal{
          width:min(1360px, 96vw);
          background:#f8fbff;
          border:1px solid #d8e1ee;
          border-radius:14px;
          box-shadow:0 24px 60px rgba(15,23,42,.12);
          overflow:hidden;
        }

        .dcrm-modal.inline{
          width:100%;
          background:transparent;
          border:none;
          box-shadow:none;
          overflow:visible;
        }

        .dcrm-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:18px 22px;
          background:#ffffff;
          border-bottom:1px solid #d8e1ee;
        }

        .dcrm-modal.inline .dcrm-head{
          background:#ffffff;
          border:1px solid #d8e1ee;
          border-radius:12px 12px 0 0;
          border-bottom:none;
        }

        .dcrm-title{
          margin:0;
          color:#0b4d96;
          font-size:22px;
          font-weight:800;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-close{
          border:none;
          background:#e2e8f0;
          width:40px;
          height:40px;
          border-radius:10px;
          font-size:22px;
          cursor:pointer;
        }

        .dcrm-body{
          padding:0;
        }

        .dcrm-modal.inline .dcrm-body{
          padding:0;
        }

        .dcrm-banner{
          background:#fff7f7;
          color:#d32f2f;
          border:1px solid #f3c8c8;
          border-radius:0;
          padding:13px 20px;
          font-size:14px;
          font-weight:800;
          line-height:1.6;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-modal.inline .dcrm-banner{
          border-left:1px solid #d8e1ee;
          border-right:1px solid #d8e1ee;
        }

        .dcrm-content{
          background:#ffffff;
          border-left:1px solid #d8e1ee;
          border-right:1px solid #d8e1ee;
          border-bottom:1px solid #d8e1ee;
          border-radius:0 0 12px 12px;
          padding:18px;
        }

        .dcrm-section{
          background:#fff;
          border:1px solid #d9e2ef;
          border-radius:10px;
          overflow:hidden;
          margin-bottom:18px;
          box-shadow:0 8px 20px rgba(15,23,42,.04);
        }

        .dcrm-section-title{
          margin:0;
          padding:14px 18px;
          font-size:18px;
          font-weight:800;
          color:#0b4d96;
          background:#f5f9ff;
          border-bottom:1px solid #d9e2ef;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-section-body{
          padding:18px;
        }

        .dcrm-old-grid{
          display:grid;
          grid-template-columns:220px 1fr 220px 1fr;
          gap:14px 18px;
          align-items:center;
        }

        .dcrm-grid{
          display:grid;
          grid-template-columns:minmax(0, 1.4fr) minmax(280px, .9fr);
          gap:18px;
          align-items:start;
        }

        .dcrm-form-grid{
          display:grid;
          grid-template-columns:240px 1fr;
          gap:14px 18px;
          align-items:center;
        }

        .dcrm-label{
          color:#111827;
          font-size:16px;
          font-weight:800;
          text-align:right;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-req{
          color:#dc2626;
        }

        .dcrm-input,
        .dcrm-select,
        .dcrm-textarea{
          width:100%;
          border:2px solid #d4dce8;
          border-radius:8px;
          background:#fff;
          color:#0f172a;
          font-size:16px;
          font-weight:700;
          outline:none;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-input,
        .dcrm-select{
          height:48px;
          padding:0 14px;
        }

        .dcrm-textarea{
          min-height:130px;
          padding:12px 14px;
          resize:vertical;
        }

        .dcrm-input:focus,
        .dcrm-select:focus,
        .dcrm-textarea:focus{
          border-color:#2970c7;
          box-shadow:0 0 0 3px rgba(41,112,199,.08);
        }

        .dcrm-input[readonly]{
          background:#f6f8fb;
          color:#334155;
        }

        .dcrm-verify-row{
          display:grid;
          grid-template-columns:minmax(0, 1fr) 170px;
          gap:12px;
        }

        .dcrm-inline2{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
        }

        .dcrm-dob{
          display:grid;
          grid-template-columns:120px 1fr 120px;
          gap:12px;
        }

        .dcrm-msg{
          margin-top:14px;
          padding:12px 14px;
          border-radius:8px;
          font-size:15px;
          font-weight:800;
          font-family:"Kantumruy Pro", Inter, sans-serif;
          border:1px solid transparent;
        }

        .dcrm-msg.success{
          background:#edf9f0;
          color:#157347;
          border-color:#b9e2c2;
        }

        .dcrm-msg.danger{
          background:#fff3f3;
          color:#c62828;
          border-color:#f1c7c7;
        }

        .dcrm-btn{
          border:none;
          border-radius:8px;
          padding:12px 18px;
          font-size:16px;
          font-weight:800;
          cursor:pointer;
          font-family:"Kantumruy Pro", Inter, sans-serif;
          transition:.18s ease;
        }

        .dcrm-btn.verify{
          background:#2e73ba;
          color:#fff;
        }

        .dcrm-btn.verify:hover{
          background:#195eab;
        }

        .dcrm-btn.cancel{
          background:#e8eef6;
          color:#0f172a;
        }

        .dcrm-btn.submit{
          background:#0b61b0;
          color:#fff;
          min-width:160px;
        }

        .dcrm-btn.submit:hover{
          background:#084b8b;
        }

        .dcrm-btn:disabled{
          opacity:.7;
          cursor:not-allowed;
        }

        .dcrm-photoBox{
          background:#fbfdff;
          border:1px solid #d9e2ef;
          border-radius:10px;
          padding:18px;
        }

        .dcrm-photoPreview{
          width:100%;
          aspect-ratio:4 / 4.5;
          border:1px dashed #c4d0e0;
          border-radius:10px;
          background:#f7fafc;
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
          margin-bottom:14px;
        }

        .dcrm-photoPreview img{
          width:100%;
          height:100%;
          object-fit:cover;
        }

        .dcrm-photoPlaceholder{
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:8px;
          color:#64748b;
          font-size:14px;
          font-weight:700;
          text-align:center;
          padding:16px;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-avatarCircle{
          width:88px;
          height:88px;
          border-radius:50%;
          background:#dbe3ef;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:42px;
        }

        .dcrm-uploadBtn{
          width:100%;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          height:46px;
          border:none;
          border-radius:8px;
          background:#2e73ba;
          color:#fff;
          font-size:15px;
          font-weight:800;
          cursor:pointer;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-hiddenInput{
          display:none;
        }

        .dcrm-fileName{
          margin-top:10px;
          font-size:13px;
          font-weight:700;
          color:#475569;
          word-break:break-word;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-sideCard{
          background:#fff;
          border:1px solid #d9e2ef;
          border-radius:10px;
          overflow:hidden;
          box-shadow:0 8px 20px rgba(15,23,42,.04);
        }

        .dcrm-sideHead{
          padding:14px 16px;
          background:#f5f9ff;
          border-bottom:1px solid #d9e2ef;
          font-size:17px;
          font-weight:800;
          color:#0b4d96;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-sideBody{
          padding:16px;
        }

        .dcrm-sideText{
          margin:0 0 12px;
          font-size:14px;
          font-weight:700;
          line-height:1.7;
          color:#334155;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-statusBox{
          display:grid;
          gap:10px;
          margin-top:10px;
        }

        .dcrm-statusItem{
          border:1px solid #dbe4ef;
          background:#f8fbff;
          border-radius:8px;
          padding:12px 13px;
        }

        .dcrm-statusLabel{
          display:block;
          font-size:12px;
          color:#64748b;
          font-weight:800;
          margin-bottom:4px;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-statusValue{
          display:block;
          font-size:15px;
          color:#0f172a;
          font-weight:800;
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .dcrm-locked{
          opacity:.58;
          pointer-events:none;
          filter:grayscale(.08);
        }

        .dcrm-actions{
          display:flex;
          justify-content:flex-end;
          gap:12px;
          margin-top:18px;
          flex-wrap:wrap;
        }

        @media (max-width: 1120px){
          .dcrm-grid{
            grid-template-columns:1fr;
          }
        }

        @media (max-width: 980px){
          .dcrm-old-grid,
          .dcrm-form-grid{
            grid-template-columns:1fr;
          }

          .dcrm-label{
            text-align:left;
          }

          .dcrm-inline2{
            grid-template-columns:1fr;
          }

          .dcrm-dob{
            grid-template-columns:1fr;
          }
        }

        @media (max-width: 700px){
          .dcrm-content{
            padding:14px;
          }

          .dcrm-head{
            padding:16px;
          }

          .dcrm-title{
            font-size:19px;
          }

          .dcrm-verify-row{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div
        className={`dcrm-modal ${inline ? "inline" : ""}`}
        onClick={inline ? undefined : (e) => e.stopPropagation()}
      >
        <div className="dcrm-head">
          <h3 className="dcrm-title">បែបបទស្នើសុំផ្លាស់ប្ដូរឯកសារផ្លូវការ</h3>
          {!inline && (
            <button type="button" className="dcrm-close" onClick={onClose}>
              ×
            </button>
          )}
        </div>

        <div className="dcrm-body">
          <div className="dcrm-banner">
            សូមបញ្ចូលលេខអត្តសញ្ញាណប័ណ្ណថ្មីជាមុនសិន ហើយចុច “ផ្ទៀងផ្ទាត់”។ បន្ទាប់ពីផ្ទៀងផ្ទាត់បានជោគជ័យ
            អ្នកអាចបំពេញព័ត៌មាន និងផ្ញើសំណើបាន។
          </div>

          <div className="dcrm-content">
            <div className="dcrm-section">
              <h4 className="dcrm-section-title">ព័ត៌មានបច្ចុប្បន្នរបស់អ្នកបោះឆ្នោត</h4>

              <div className="dcrm-section-body">
                <div className="dcrm-old-grid">
                  <div className="dcrm-label">នាមត្រកូល-នាមខ្លួន</div>
                  <div className="dcrm-inline2">
                    <input className="dcrm-input" readOnly value={nameParts.lastName || ""} />
                    <input className="dcrm-input" readOnly value={nameParts.firstName || ""} />
                  </div>

                  <div className="dcrm-label">ឯកសារបច្ចុប្បន្ន</div>
                  <input className="dcrm-input" readOnly value="អ.ខ ៣" />

                  <div className="dcrm-label">លេខអត្តសញ្ញាណប័ណ្ណចាស់</div>
                  <input className="dcrm-input" readOnly value={maskIdNumber(voter.id_number)} />

                  <div className="dcrm-label">ថ្ងៃខែឆ្នាំកំណើត</div>
                  <input className="dcrm-input" readOnly value={voter.dob_display || ""} />

                  <div className="dcrm-label">ភេទ</div>
                  <input className="dcrm-input" readOnly value={toKhGenderValue(voter.gender)} />

                  <div className="dcrm-label">អ៊ីមែល</div>
                  <input className="dcrm-input" readOnly value={voter.email || "—"} />
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="dcrm-section">
                <h4 className="dcrm-section-title">ព័ត៌មានស្នើសុំឯកសារថ្មី</h4>

                <div className="dcrm-section-body">
                  <div className="dcrm-grid">
                    <div>
                      <div className="dcrm-form-grid">
                        <div className="dcrm-label">
                          លេខអត្តសញ្ញាណប័ណ្ណថ្មី <span className="dcrm-req">*</span>
                        </div>
                        <div className="dcrm-verify-row">
                          <input
                            className="dcrm-input"
                            value={form.new_document_no}
                            onChange={(e) => setField("new_document_no", e.target.value)}
                            placeholder="បញ្ចូលលេខអត្តសញ្ញាណប័ណ្ណថ្មី"
                            required
                          />
                          <button
                            type="button"
                            className="dcrm-btn verify"
                            onClick={handleVerify}
                            disabled={verifying}
                          >
                            {verifying ? "កំពុងផ្ទៀងផ្ទាត់..." : "ផ្ទៀងផ្ទាត់"}
                          </button>
                        </div>
                      </div>

                      {verifyMsg && (
                        <div className={`dcrm-msg ${verifyMsg.type}`}>
                          {verifyMsg.text}
                        </div>
                      )}

                      <div className={formLocked ? "dcrm-locked" : ""}>
                        <div className="dcrm-form-grid" style={{ marginTop: 18 }}>
                          <div className="dcrm-label">
                            រូបភាពឯកសារថ្មី <span className="dcrm-req">*</span>
                          </div>

                          <div className="dcrm-photoBox">
                            <div className="dcrm-photoPreview">
                              {form.photo_preview ? (
                                <img src={form.photo_preview} alt="preview" />
                              ) : (
                                <div className="dcrm-photoPlaceholder">
                                  <div className="dcrm-avatarCircle">👤</div>
                                  <div>សូមបញ្ចូលរូបភាពឯកសារថ្មី</div>
                                </div>
                              )}
                            </div>

                            <label className="dcrm-uploadBtn">
                              បញ្ចូលរូបភាពឯកសារថ្មី
                              <input
                                className="dcrm-hiddenInput"
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                disabled={formLocked}
                              />
                            </label>

                            {form.photo_name ? (
                              <div className="dcrm-fileName">{form.photo_name}</div>
                            ) : null}
                          </div>

                          <div className="dcrm-label">
                            នាមត្រកូល-នាមខ្លួន <span className="dcrm-req">*</span>
                          </div>
                          <div className="dcrm-inline2">
                            <input
                              className="dcrm-input"
                              value={form.name_kh_last}
                              onChange={(e) => setField("name_kh_last", e.target.value)}
                              placeholder="នាមត្រកូល"
                              disabled={formLocked}
                              required
                            />
                            <input
                              className="dcrm-input"
                              value={form.name_kh_first}
                              onChange={(e) => setField("name_kh_first", e.target.value)}
                              placeholder="នាមខ្លួន"
                              disabled={formLocked}
                              required
                            />
                          </div>

                          <div className="dcrm-label">
                            ភេទ <span className="dcrm-req">*</span>
                          </div>
                          <select
                            className="dcrm-select"
                            value={form.gender}
                            onChange={(e) => setField("gender", e.target.value)}
                            disabled={formLocked}
                            required
                          >
                            <option value="">ជ្រើសរើស</option>
                            <option value="ប្រុស">ប្រុស</option>
                            <option value="ស្រី">ស្រី</option>
                          </select>

                          <div className="dcrm-label">
                            ថ្ងៃខែឆ្នាំកំណើត <span className="dcrm-req">*</span>
                          </div>
                          <div className="dcrm-dob">
                            <select
                              className="dcrm-select"
                              value={form.dob_day}
                              onChange={(e) => setField("dob_day", e.target.value)}
                              disabled={formLocked}
                              required
                            >
                              <option value="">ថ្ងៃ</option>
                              {days.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>

                            <select
                              className="dcrm-select"
                              value={form.dob_month}
                              onChange={(e) => setField("dob_month", e.target.value)}
                              disabled={formLocked}
                              required
                            >
                              <option value="">ខែ</option>
                              {months.map((m, i) => (
                                <option key={m} value={m}>
                                  {KHMER_MONTHS[i]}
                                </option>
                              ))}
                            </select>

                            <select
                              className="dcrm-select"
                              value={form.dob_year}
                              onChange={(e) => setField("dob_year", e.target.value)}
                              disabled={formLocked}
                              required
                            >
                              <option value="">ឆ្នាំ</option>
                              {years.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="dcrm-label">លេខទូរស័ព្ទ</div>
                          <input
                            className="dcrm-input"
                            value={form.phone}
                            onChange={(e) => setField("phone", e.target.value)}
                            placeholder="លេខទូរស័ព្ទ"
                            disabled={formLocked}
                          />

                          <div className="dcrm-label">
  អ៊ីមែល <span className="dcrm-req">*</span>
</div>

<div>
  <input
    className="dcrm-input"
    value={form.email}
    onChange={(e) => setField("email", e.target.value)}
    onBlur={checkEmailNow}
    placeholder="example@gmail.com"
    disabled={formLocked || checkingEmail}
    required
  />

  {checkingEmail && (
    <div className="dcrm-msg success" style={{ marginTop: 10 }}>
      កំពុងពិនិត្យអ៊ីមែល...
    </div>
  )}

  {emailMsg && (
    <div className={`dcrm-msg ${emailMsg.type}`} style={{ marginTop: 10 }}>
      {emailMsg.text}
    </div>
  )}
</div>

                          <div className="dcrm-label">មូលហេតុ (ស្រេចចិត្ត)</div>
                          <textarea
                            className="dcrm-textarea"
                            value={form.note}
                            onChange={(e) => setField("note", e.target.value)}
                            placeholder="សរសេរព័ត៌មានបន្ថែម ឬមូលហេតុនៃការស្នើសុំ..."
                            disabled={formLocked}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="dcrm-sideCard" style={{ marginBottom: 18 }}>
                        <div className="dcrm-sideHead">ព័ត៌មានណែនាំ</div>
                        <div className="dcrm-sideBody">
                          <p className="dcrm-sideText">
                            សូមបំពេញព័ត៌មានឱ្យត្រឹមត្រូវតាមឯកសារថ្មី។ ព័ត៌មានដែលអ្នកបញ្ចូល
                            នឹងត្រូវបញ្ជូនទៅកាន់អ្នកគ្រប់គ្រងដើម្បីពិនិត្យផ្ទៀងផ្ទាត់។
                          </p>
                          <p className="dcrm-sideText">
                            ក្រោយពេលស្នើសុំបានជោគជ័យ ប្រព័ន្ធនឹងផ្ញើលេខតាមដានទៅអ៊ីមែលរបស់អ្នក។
                          </p>
                        </div>
                      </div>

                      <div className="dcrm-sideCard">
                        <div className="dcrm-sideHead">ស្ថានភាពសំណើ</div>
                        <div className="dcrm-sideBody">
                          <div className="dcrm-statusBox">
                            <div className="dcrm-statusItem">
                              <span className="dcrm-statusLabel">ការផ្ទៀងផ្ទាត់លេខថ្មី</span>
                              <span className="dcrm-statusValue">
                                {verifiedNewId ? "បានផ្ទៀងផ្ទាត់រួច" : "មិនទាន់ផ្ទៀងផ្ទាត់"}
                              </span>
                            </div>

                            <div className="dcrm-statusItem">
                              <span className="dcrm-statusLabel">លេខចាស់</span>
                              <span className="dcrm-statusValue">
                                {maskIdNumber(voter.id_number)}
                              </span>
                            </div>

                            <div className="dcrm-statusItem">
                              <span className="dcrm-statusLabel">លេខថ្មី</span>
                              <span className="dcrm-statusValue">
                                {form.new_document_no || "—"}
                              </span>
                            </div>

                            <div className="dcrm-statusItem">
                              <span className="dcrm-statusLabel">រូបភាពឯកសារ</span>
                              <span className="dcrm-statusValue">
                                {form.photo_name ? "បានបញ្ចូលរួច" : "មិនទាន់បញ្ចូល"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="dcrm-actions">
                    <button type="button" className="dcrm-btn cancel" onClick={onClose}>
                      បោះបង់
                    </button>
                    <button
                      type="submit"
                      className="dcrm-btn submit"
                      disabled={submitting || !verifiedNewId || checkingEmail}
                    >
                      {submitting ? "កំពុងផ្ញើ..." : "ស្នើសុំ"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}