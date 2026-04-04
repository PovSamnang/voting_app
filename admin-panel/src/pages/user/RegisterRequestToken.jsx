import { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import UserShell from "../../components/UserShell";

const API_URL = "http://localhost:3000/api";

function formatCountdown(sec) {
  const s = Math.max(0, Number(sec || 0));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m ${secs}s`;
  return `${hours}h ${mins}m ${secs}s`;
}

export default function RegisterRequestToken() {
  const [f, setF] = useState({
    id_number: "",
    name_kh: "",
    name_en: "",
    phone: "",
    email: "",
  });

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [readingQr, setReadingQr] = useState(false);

  const [votingStatus, setVotingStatus] = useState({
    election_id: 0,
    phase: "NONE",
    phase_label_kh: "មិនទាន់បើកវគ្គ",
    next_transition_ts: 0,
    chain_now_ts: 0,
  });

  const countdownToNext =
    votingStatus.next_transition_ts && votingStatus.chain_now_ts
      ? Math.max(0, votingStatus.next_transition_ts - votingStatus.chain_now_ts)
      : 0;

  const onChange = (e) =>
    setF((p) => ({
      ...p,
      [e.target.name]: e.target.value,
    }));

  const loadVotingStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/voting-status`);
      const s = res.data || {};
      setVotingStatus({
        election_id: Number(s.election_id || 0),
        phase: String(s.phase || "NONE").toUpperCase(),
        phase_label_kh: String(s.phase_label_kh || ""),
        next_transition_ts: Number(s.next_transition_ts || 0),
        chain_now_ts: Number(s.chain_now_ts || 0),
      });
    } catch {
      setVotingStatus({
        election_id: 0,
        phase: "NONE",
        phase_label_kh: "មិនអាចទាញស្ថានភាពបាន",
        next_transition_ts: 0,
        chain_now_ts: 0,
      });
    }
  };

  useEffect(() => {
    loadVotingStatus();
    const t = setInterval(loadVotingStatus, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const clearAutoFields = () => {
    setF((p) => ({
      ...p,
      id_number: "",
      name_kh: "",
      name_en: "",
    }));
  };

  const onPickFile = async (e) => {
    const picked = e.target.files?.[0] || null;

    setFile(picked);
    setMsg(null);

    if (preview) URL.revokeObjectURL(preview);
    setPreview(picked ? URL.createObjectURL(picked) : null);

    if (!picked) {
      clearAutoFields();
      return;
    }

    try {
      setReadingQr(true);

      const fd = new FormData();
      fd.append("id_card_image", picked);

      const res = await axios.post(
        `${API_URL}/register-request-token/preview`,
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const voter = res.data?.voter || {};

      setF((p) => ({
        ...p,
        id_number: voter.id_number || "",
        name_kh: voter.name_kh || "",
        name_en: voter.name_en || "",
      }));

      setMsg({
        type: "success",
        text: "QR read successfully. ID information was filled automatically.",
      });
    } catch (err) {
      const data = err?.response?.data;
      clearAutoFields();
      setMsg({
        type: "danger",
        text: data?.message || err.message || "Could not read QR from image.",
      });
    } finally {
      setReadingQr(false);
    }
  };

  const removeSelectedFile = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    clearAutoFields();
    setMsg(null);

    const input = document.getElementById("id-card-upload-input");
    if (input) input.value = "";
  };

  const reset = () => {
    setF({
      id_number: "",
      name_kh: "",
      name_en: "",
      phone: "",
      email: "",
    });
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setMsg(null);

    const input = document.getElementById("id-card-upload-input");
    if (input) input.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (votingStatus.phase !== "DRAFT") {
      setMsg({
        type: "danger",
        text:
          votingStatus.phase === "BEFORE_START"
            ? `ការស្នើ token ត្រូវបានបិទ។ ${votingStatus.phase_label_kh} កំពុងដំណើរការ។`
            : votingStatus.phase === "ACTIVE"
            ? "ការស្នើ token ត្រូវបានបិទ។ ការបោះឆ្នោតកំពុងដំណើរការ។"
            : votingStatus.phase === "ENDED"
            ? "ការស្នើ token ត្រូវបានបិទ។ វគ្គបោះឆ្នោតបានបញ្ចប់។"
            : "មិនទាន់បើកដំណាក់កាលចុះឈ្មោះទេ។",
      });
      return;
    }

    if (!file) {
      setMsg({ type: "danger", text: "Please upload your ID card image." });
      return;
    }

    if (readingQr) {
      setMsg({
        type: "danger",
        text: "Please wait for QR reading to finish first.",
      });
      return;
    }

    if (!f.id_number || !f.name_kh || !f.name_en) {
      setMsg({
        type: "danger",
        text: "Please upload a valid ID card image so the system can read your QR data first.",
      });
      return;
    }

    if (!f.phone.trim() || !f.email.trim()) {
      setMsg({
        type: "danger",
        text: "Please enter phone number and email.",
      });
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("phone", f.phone.trim());
      fd.append("email", f.email.trim());
      fd.append("id_card_image", file);

      const res = await axios.post(`${API_URL}/register-request-token`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg({
        type: "success",
        text: `${res.data?.message || "Success"}${
          res.data?.tx_hash ? ` (TX: ${res.data.tx_hash})` : ""
        }`,
      });
    } catch (err) {
      const data = err?.response?.data;
      const extra = data?.reason ? ` (${data.reason})` : "";
      setMsg({
        type: "danger",
        text: `${data?.message || err.message || "Request failed"}${extra}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserShell
      active="register"
      hideNotice={true}
      hideHeader={true}
      hideNav={true}
      hideHero={true}
      hideFooter={true}
      unstyledMain={true}
    >
      <div className="nec-fullbleed">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Kantumruy+Pro:wght@300;400;500;600;700&display=swap');

          :root{
            --primary:#003366;
            --primary-dark:#001f3f;
            --gold:#D4AF37;
            --gold-dark:#B8860B;
            --red:#E02020;
            --bg:#F9FAFB;
            --slate:#0f172a;
            --muted:#64748b;
            --border:rgba(15,23,42,0.12);
          }

          .nec-fullbleed{
            width: 100vw;
            margin-left: calc(50% - 50vw);
            margin-right: calc(50% - 50vw);
            min-height: 100vh;
            background: var(--bg);
            overflow-x: hidden;
            font-family: Inter, "Kantumruy Pro", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            color: var(--slate);
          }

          .nec-fullbleed *, .nec-fullbleed *::before, .nec-fullbleed *::after{ box-sizing: border-box; }
          .nec-fullbleed a{ text-decoration: none !important; }
          .nec-fullbleed button, .nec-fullbleed input{
            box-shadow: none !important;
            outline: none !important;
          }
          .nec-fullbleed input:focus{
            box-shadow: none !important;
          }

          .khmer-motto{ font-family: "Kantumruy Pro", Inter, sans-serif; letter-spacing: 0.05em; }

          .material-symbols-outlined{
            font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24;
            line-height: 1;
            vertical-align: middle;
          }

          .wrap{ max-width: 80rem; margin: 0 auto; padding: 0 24px; }

          .mainBg{
            background-image: url('https://www.transparenttextures.com/patterns/natural-paper.png');
            padding: 48px 0 64px;
          }
          .mainMax{ max-width: 56rem; margin: 0 auto; }

          .regHeader{ text-align:center; margin-bottom: 48px; }
          .badgeCircle{
            width: 56px; height: 56px;
            border-radius: 999px;
            background: rgba(0,51,102,0.05);
            border: 1px solid rgba(0,51,102,0.10);
            display:inline-flex; align-items:center; justify-content:center;
            margin-bottom: 16px;
          }
          .badgeCircle .material-symbols-outlined{ color: var(--primary); font-size: 32px; }
          .regHeader h1{
            margin: 0;
            font-size: 32px;
            font-weight: 900;
            color: var(--primary);
          }
          .regHeader h2{
            margin: 4px 0 0 0;
            font-size: 24px;
            font-weight: 800;
            color: #1f2937;
          }
          .goldLine{
            width: 96px; height: 4px;
            background: var(--gold);
            border-radius: 999px;
            margin: 16px auto 0;
          }
          .regHeader p{
            margin-top: 16px;
            color: #475569;
            font-weight: 600;
            font-style: italic;
            font-size: 14px;
          }

          .alertBox{
            display:flex; gap: 10px; align-items:flex-start;
            background:#fff;
            border: 1px solid rgba(15,23,42,0.10);
            padding: 12px 14px;
            margin-bottom: 18px;
          }
          .alertBox.success{ border-left: 4px solid #16a34a; }
          .alertBox.danger{ border-left: 4px solid var(--red); }
          .alertBox .material-symbols-outlined{ font-size: 20px; }
          .alertBox.success .material-symbols-outlined{ color:#16a34a; }
          .alertBox.danger .material-symbols-outlined{ color: var(--red); }
          .alertText{ font-weight: 700; font-size: 13px; color:#0f172a; line-height: 1.45; }

          .phaseBox{
            background:#fff;
            border-left: 4px solid var(--gold);
            padding: 14px 16px;
            margin-bottom: 18px;
            box-shadow: 0 6px 14px rgba(15,23,42,0.10);
          }
          .phaseTitle{
            font-weight: 900;
            color: var(--primary);
            margin-bottom: 6px;
          }
          .phaseText{
            color:#334155;
            font-weight:700;
          }

          .cardOuter{
            background:#fff;
            border-top: 4px solid var(--gold);
            border-left: 1px solid rgba(15,23,42,0.10);
            border-right: 1px solid rgba(15,23,42,0.10);
            border-bottom: 1px solid rgba(15,23,42,0.10);
            box-shadow: 0 25px 50px -12px rgba(15,23,42,0.25);
            overflow:hidden;
          }

          .progressHead{
            background: #f8fafc;
            padding: 24px 40px;
            border-bottom: 1px solid rgba(15,23,42,0.06);
          }
          .progressTop{
            display:flex; align-items:center; justify-content:space-between;
            gap: 12px; flex-wrap: wrap;
            margin-bottom: 12px;
          }
          .stepLeft{ display:flex; align-items:center; gap: 10px; }
          .stepCircle{
            width: 24px; height: 24px;
            border-radius: 999px;
            background: var(--primary);
            color:#fff;
            display:flex; align-items:center; justify-content:center;
            font-size: 12px;
            font-weight: 900;
          }
          .stepText{
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .12em;
            color: var(--primary);
          }
          .progressPct{
            font-size: 12px;
            font-weight: 900;
            color: var(--primary);
          }
          .bar{
            height: 12px;
            border-radius: 999px;
            background: rgba(15,23,42,0.12);
            overflow:hidden;
          }
          .barFill{
            height: 100%;
            width: 50%;
            background: var(--primary);
            transition: width .6s ease;
          }

          .formPad{ padding: 40px; }
          @media (max-width: 640px){
            .progressHead{ padding: 20px 20px; }
            .formPad{ padding: 22px; }
          }

          .section{ margin-top: 0; }
          .sectionHead{
            border-bottom: 1px solid rgba(212,175,55,0.20);
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .sectionHead h3{
            margin:0;
            font-size: 20px;
            font-weight: 800;
            color: var(--primary);
            display:flex; align-items:center; gap: 10px;
          }
          .sectionHead p{
            margin: 6px 0 0 0;
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
          }

          .grid2{
            display:grid;
            grid-template-columns: 1fr;
            gap: 20px;
          }
          @media (min-width: 768px){
            .grid2{ grid-template-columns: 1fr 1fr; gap: 32px; }
          }

          .field label{
            display:block;
            font-size: 12px;
            font-weight: 900;
            color:#1f2937;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: .02em;
          }

          .inputWrap{ position: relative; }
          .leftIcon{
            position:absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(0,51,102,0.60);
          }
          .leftIcon .material-symbols-outlined{ font-size: 22px; }

          .prefix855{
            position:absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            font-weight: 900;
            font-size: 12px;
          }

          .in{
            width: 100%;
            border: 2px solid rgba(226,232,240,1) !important;
            background: rgba(248,250,252,0.6) !important;
            padding: 16px 16px;
            font-size: 18px;
            font-weight: 600;
            color: #0f172a;
            border-radius: 0 !important;
            transition: border-color .18s ease, background .18s ease;
          }
          .in:focus{
            border-color: rgba(0,51,102,1) !important;
            background: #fff !important;
          }
          .plIcon{ padding-left: 48px !important; }
          .plPhone{ padding-left: 64px !important; }

          .readOnlyInput{
            background: rgba(241,245,249,0.95) !important;
            color: #334155 !important;
            cursor: not-allowed;
          }

          .help{
            margin-top: 10px;
            font-size: 12px;
            color: #64748b;
            font-weight: 600;
            font-style: italic;
          }

          .uploadBox{
            position: relative;
            border: 2px dashed rgba(203,213,225,1);
            background: rgba(248,250,252,1);
            padding: 48px;
            cursor: pointer;
            transition: border-color .2s ease, background .2s ease;
          }
          .uploadBox:hover{
            border-color: rgba(0,51,102,0.7);
            background: rgba(241,245,249,1);
          }
          .fileInput{
            position:absolute;
            inset:0;
            opacity:0;
            cursor:pointer;
          }
          .uploadInner{
            display:flex;
            flex-direction:column;
            align-items:center;
            text-align:center;
          }
          .uploadCircle{
            width: 80px; height: 80px;
            border-radius: 999px;
            background: rgba(0,51,102,0.10);
            color: var(--primary);
            display:flex; align-items:center; justify-content:center;
            margin-bottom: 20px;
          }
          .uploadCircle .material-symbols-outlined{ font-size: 40px; }
          .uploadTitle{
            font-weight: 900;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: .08em;
            font-size: 14px;
          }
          .uploadSub{ margin-top: 8px; color:#64748b; font-weight: 600; font-size: 14px; font-style: italic; }
          .uploadSmall{ margin-top: 4px; color:#94a3b8; font-weight: 600; font-size: 12px; }

          .previewWrap{
            margin-top: 18px;
            background: #fff;
            border: 1px solid rgba(226,232,240,1);
            padding: 14px;
          }
          .previewTop{
            display:flex; align-items:center; justify-content:space-between;
            gap: 10px; flex-wrap: wrap;
            margin-bottom: 12px;
          }
          .previewTop strong{ color: var(--primary); font-weight: 900; }
          .miniBtn{
            border: 1px solid rgba(148,163,184,0.6);
            background: #fff;
            padding: 6px 12px;
            border-radius: 0;
            font-weight: 900;
            font-size: 12px;
            cursor:pointer;
            text-transform: uppercase;
          }
          .miniBtn:hover{ border-color: rgba(0,51,102,0.45); color: var(--primary); }
          .miniBtn:disabled{ opacity:.7; cursor:not-allowed; }

          .imgArea{
            border: 1px dashed rgba(203,213,225,1);
            background: #fff;
            min-height: 260px;
            display:flex; align-items:center; justify-content:center;
            padding: 10px;
          }
          .imgArea img{
            width: 100%;
            max-height: 520px;
            object-fit: contain;
          }

          .submitBtn{
            width: 100%;
            display:flex;
            align-items:center;
            justify-content:center;
            gap: 10px;
            background: var(--primary) !important;
            color:#fff !important;
            padding: 20px 20px;
            font-size: 20px;
            font-weight: 900;
            border: none;
            cursor:pointer;
            border-bottom: 4px solid var(--gold) !important;
            border-radius: 0 !important;
            box-shadow: 0 20px 30px rgba(0,51,102,0.20);
          }
          .submitBtn:hover{ filter: brightness(1.02); }
          .submitBtn:disabled{ opacity: .7; cursor:not-allowed; }

          .decl{
            margin-top: 24px;
            display:flex;
            gap: 10px;
            padding: 16px;
            border: 1px solid rgba(191,219,254,1);
            background: rgba(239,246,255,1);
            border-radius: 4px;
          }
          .decl .material-symbols-outlined{ color: var(--primary); font-size: 20px; margin-top: 2px; }
          .decl p{
            margin:0;
            font-size: 12px;
            font-weight: 600;
            color:#334155;
            line-height: 1.55;
          }
          .decl b{ color: var(--primary); }
          .decl em{
            display:block;
            margin-top: 6px;
            font-size: 10px;
            color:#475569;
            font-weight: 600;
          }

          .meta{
            background: #f8fafc;
            border-top: 1px solid rgba(226,232,240,1);
            padding: 24px;
            display:flex;
            flex-direction: column;
            gap: 16px;
          }
          @media (min-width: 768px){
            .meta{ flex-direction: row; align-items:center; justify-content:space-between; }
          }
          .metaLeft{ display:flex; align-items:center; gap: 12px; }
          .secIcon{
            width: 32px; height: 32px;
            background: var(--primary);
            color:#fff;
            display:flex; align-items:center; justify-content:center;
            border-radius: 4px;
          }
          .metaSmall{
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .12em;
            color:#94a3b8;
            margin:0;
          }
          .metaVer{
            font-size: 14px;
            font-weight: 800;
            color: var(--primary);
            margin: 2px 0 0 0;
          }
          .metaLinks{ display:flex; gap: 24px; flex-wrap: wrap; }
          .metaLinks a{
            font-size: 12px;
            font-weight: 900;
            color: var(--primary) !important;
            text-transform: uppercase;
            letter-spacing: .06em;
          }
          .metaLinks a:hover{ text-decoration: underline !important; }

          .infoGrid{
            margin-top: 48px;
            display:grid;
            grid-template-columns: 1fr;
            gap: 24px;
          }
          @media (min-width: 640px){
            .infoGrid{ grid-template-columns: 1fr 1fr; }
          }
          .infoCard{
            background:#fff;
            border-left: 4px solid var(--primary);
            box-shadow: 0 6px 14px rgba(15,23,42,0.10);
            padding: 24px;
            display:flex;
            gap: 16px;
            align-items:flex-start;
          }
          .infoCard.gold{ border-left-color: var(--gold); }
          .infoCard .material-symbols-outlined{ font-size: 30px; }
          .infoCard h5{
            margin: 0;
            font-size: 12px;
            font-weight: 900;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: .08em;
          }
          .infoCard p{
            margin: 6px 0 0 0;
            font-size: 12px;
            font-weight: 600;
            color:#475569;
            line-height: 1.55;
          }
        `}</style>

        <main className="mainBg">
          <div className="wrap">
            <div className="mainMax">
              <div className="regHeader">
                <div className="badgeCircle">
                  <span className="material-symbols-outlined">how_to_reg</span>
                </div>
                <h1 className="khmer-motto">ការចុះឈ្មោះបោះឆ្នោតឌីជីថល</h1>
                <h2>Digital Voter Registration</h2>
                <div className="goldLine" />
                <p>Official secure portal for enrollment in upcoming national elections.</p>
              </div>

              {msg && (
                <div className={`alertBox ${msg.type === "success" ? "success" : "danger"}`}>
                  <span className="material-symbols-outlined">
                    {msg.type === "success" ? "verified" : "error"}
                  </span>
                  <div className="alertText">{msg.text}</div>
                </div>
              )}

              <div className="phaseBox">
                <div className="phaseTitle">
                  ស្ថានភាពបច្ចុប្បន្ន៖ {votingStatus.phase_label_kh || votingStatus.phase}
                </div>

                {votingStatus.phase === "DRAFT" && (
                  <div className="phaseText">
                    អ្នកអាចស្នើសុំ token បានក្នុងដំណាក់កាលនេះ។
                  </div>
                )}

                {votingStatus.phase === "BEFORE_START" && (
                  <div className="phaseText">
                    មិនអាចស្នើ token បានទេ។ ការបោះឆ្នោតចាប់ផ្ដើមក្នុង{" "}
                    <b>{formatCountdown(countdownToNext)}</b>
                  </div>
                )}

                {votingStatus.phase === "ACTIVE" && (
                  <div className="phaseText">
                    ការស្នើ token ត្រូវបានបិទ។ ឥឡូវនេះអនុញ្ញាតតែបោះឆ្នោតប៉ុណ្ណោះ។
                  </div>
                )}

                {votingStatus.phase === "ENDED" && (
                  <div className="phaseText">វគ្គបោះឆ្នោតបានបញ្ចប់។</div>
                )}

                {votingStatus.phase === "NONE" && (
                  <div className="phaseText">មិនទាន់បើកដំណាក់កាលចុះឈ្មោះទេ។</div>
                )}
              </div>

              <div className="cardOuter">
                <div className="progressHead">
                  <div className="progressTop">
                    <div className="stepLeft">
                      <div className="stepCircle">1</div>
                      <div className="stepText">Identity Verification (ជំហានទី ១)</div>
                    </div>
                    <div className="progressPct">
                      {readingQr ? "Reading QR..." : "50% Complete"}
                    </div>
                  </div>
                  <div className="bar">
                    <div
                      className="barFill"
                      style={{ width: readingQr ? "70%" : "50%" }}
                    />
                  </div>
                </div>

                <form className="formPad" onSubmit={submit}>
                  <div className="section">
                    <div className="sectionHead">
                      <h3>
                        <span className="material-symbols-outlined">id_card</span>
                        អត្តសញ្ញាណប័ណ្ណផ្លូវការ / Official Identification
                      </h3>
                      <p>
                        ID number and names will be read automatically from your ID card QR.
                        Please enter only phone and email.
                      </p>
                    </div>

                    <div className="grid2">
                      <div className="field" style={{ gridColumn: "1 / -1" }}>
                        <label>ID Number (លេខអត្តសញ្ញាណប័ណ្ណ)</label>
                        <div className="inputWrap">
                          <span className="leftIcon">
                            <span className="material-symbols-outlined">badge</span>
                          </span>
                          <input
                            className="in plIcon readOnlyInput"
                            name="id_number"
                            value={f.id_number}
                            placeholder={
                              readingQr
                                ? "Reading from QR..."
                                : "Will be filled automatically from QR"
                            }
                            type="text"
                            readOnly
                            required
                          />
                        </div>
                      </div>

                      <div className="field">
                        <label>Full Name in Khmer (ឈ្មោះពេញ ជាភាសាខ្មែរ)</label>
                        <input
                          className="in khmer-motto readOnlyInput"
                          name="name_kh"
                          value={f.name_kh}
                          placeholder={
                            readingQr
                              ? "កំពុងអានពី QR..."
                              : "នឹងបំពេញដោយស្វ័យប្រវត្តិពី QR"
                          }
                          type="text"
                          readOnly
                          required
                        />
                      </div>

                      <div className="field">
                        <label>Full Name in English (ឈ្មោះពេញ ជាអក្សរឡាតាំង)</label>
                        <input
                          className="in readOnlyInput"
                          name="name_en"
                          value={f.name_en}
                          placeholder={
                            readingQr
                              ? "Reading from QR..."
                              : "Will be filled automatically from QR"
                          }
                          type="text"
                          readOnly
                          required
                          style={{ textTransform: "uppercase", fontWeight: 900 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 40 }} />

                  <div className="section">
                    <div className="sectionHead">
                      <h3>
                        <span className="material-symbols-outlined">contact_phone</span>
                        ព័ត៌មានទំនាក់ទំនង / Contact Information
                      </h3>
                    </div>

                    <div className="grid2">
                      <div className="field">
                        <label>Phone Number (លេខទូរស័ព្ទ)</label>
                        <div className="inputWrap">
                          <span className="prefix855">+855</span>
                          <input
                            className="in plPhone"
                            name="phone"
                            value={f.phone}
                            onChange={onChange}
                            placeholder="12 345 678"
                            type="tel"
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="field">
                        <label>Email Address (អាសយដ្ឋានអ៊ីមែល)</label>
                        <input
                          className="in"
                          name="email"
                          value={f.email}
                          onChange={onChange}
                          placeholder="example@mail.com"
                          type="email"
                          required
                          disabled={loading}
                        />
                        <div className="help">Token will be sent to this email.</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 40 }} />

                  <div className="section">
                    <div className="sectionHead">
                      <h3>
                        <span className="material-symbols-outlined">add_a_photo</span>
                        រូបថតអត្តសញ្ញាណប័ណ្ណ / ID Document Photo
                      </h3>
                    </div>

                    <div className="uploadBox">
                      <input
                        id="id-card-upload-input"
                        className="fileInput"
                        type="file"
                        accept="image/*"
                        onChange={onPickFile}
                        required
                        disabled={loading || readingQr}
                      />

                      <div className="uploadInner">
                        <div className="uploadCircle">
                          <span className="material-symbols-outlined">
                            {readingQr ? "qr_code_scanner" : "cloud_upload"}
                          </span>
                        </div>
                        <div className="uploadTitle">
                          {readingQr
                            ? "Reading QR from uploaded image..."
                            : "Click to upload or drag and drop"}
                        </div>
                        <div className="uploadSub">
                          Please upload a clear photo of the FRONT of your National ID Card
                        </div>
                        <div className="uploadSmall">(Formats: PNG, JPG, Max Size: 6MB)</div>

                        {file && (
                          <div className="help" style={{ marginTop: 14 }}>
                            Selected file: <b>{file.name}</b>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="previewWrap">
                      <div className="previewTop">
                        <strong>ID Card Preview</strong>
                        {preview && (
                          <button
                            type="button"
                            className="miniBtn"
                            onClick={removeSelectedFile}
                            disabled={loading || readingQr}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="imgArea">
                        {preview ? (
                          <img src={preview} alt="preview" />
                        ) : (
                          <div style={{ color: "#64748b", fontWeight: 700 }}>
                            No image selected.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ paddingTop: 40 }}>
                    <button
                      className="submitBtn"
                      type="submit"
                      disabled={
                        loading ||
                        readingQr ||
                        votingStatus.phase !== "DRAFT"
                      }
                    >
                      <span className="material-symbols-outlined">how_to_reg</span>
                      {loading
                        ? "PROCESSING..."
                        : readingQr
                        ? "READING QR..."
                        : "បញ្ជាក់ និងផ្ញើកូដផ្ទៀងផ្ទាត់ / CONFIRM & PROCEED"}
                    </button>

                    <div className="decl">
                      <span className="material-symbols-outlined">gavel</span>
                      <p>
                        <b>DECLARATION:</b> ដោយចុះហត្ថលេខាលើទម្រង់បែបបទនេះ
                        អ្នកបញ្ជាក់ថាព័ត៌មានដែលបានផ្តល់ឱ្យគឺជាការពិត។ ការផ្តល់ព័ត៌មានមិនពិតគឺជាបទល្មើសច្បាប់។
                        <em>
                          By submitting this form, you certify that the information provided is accurate and truthful.
                          Providing false information is a punishable offense under national election law.
                        </em>
                      </p>
                    </div>
                  </div>
                </form>

                <div className="meta">
                  <div className="metaLeft">
                    <div className="secIcon">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        security
                      </span>
                    </div>
                    <div>
                      <p className="metaSmall">Portal Version</p>
                      <p className="metaVer">NEC-VOTER-SECURE-V2.4.0</p>
                      <p className="metaSmall" style={{ marginTop: 10 }}>
                        Endpoint:{" "}
                        <code style={{ color: "var(--primary)", fontWeight: 900 }}>
                          {API_URL}/register-request-token
                        </code>
                      </p>
                    </div>
                  </div>

                  <div className="metaLinks">
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      SECURITY POLICY
                    </a>
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      USER TERMS
                    </a>
                  </div>
                </div>
              </div>

              <div className="infoGrid">
                <div className="infoCard">
                  <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>
                    verified_user
                  </span>
                  <div>
                    <h5>Government Grade Security</h5>
                    <p>
                      Your biometric and identity data is protected by AES-256 encryption and stored in sovereign data
                      centers within the Kingdom of Cambodia.
                    </p>
                  </div>
                </div>

                <div className="infoCard gold">
                  <span className="material-symbols-outlined" style={{ color: "var(--gold)" }}>
                    contact_support
                  </span>
                  <div>
                    <h5>Citizen Assistance</h5>
                    <p>
                      If you experience technical issues, please contact the NEC National Registration Hotline at{" "}
                      <b style={{ color: "var(--primary)" }}>1288</b> (Toll-Free).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </UserShell>
  );
}