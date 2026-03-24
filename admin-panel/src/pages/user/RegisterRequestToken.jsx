// src/RegisterRequestToken.jsx
import { useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:3000/api";

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

  const onChange = (e) => setF((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onPickFile = (e) => {
    const picked = e.target.files?.[0] || null;
    setFile(picked);

    if (preview) URL.revokeObjectURL(preview);
    setPreview(picked ? URL.createObjectURL(picked) : null);
  };

  const reset = () => {
    setF({ id_number: "", name_kh: "", name_en: "", phone: "", email: "" });
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setMsg(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!file) {
      setMsg({ type: "danger", text: "Please upload your ID card image." });
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("id_number", f.id_number.trim());
      fd.append("name_kh", f.name_kh.trim());
      fd.append("name_en", f.name_en.trim());
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

        /* FULL WIDTH even if parent uses container */
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

        /* Bootstrap-proof reset (scope only this page) */
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

        /* Material Symbols (match HTML) */
        .material-symbols-outlined{
          font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24;
          line-height: 1;
          vertical-align: middle;
        }

        .wrap{ max-width: 80rem; margin: 0 auto; padding: 0 24px; }

        /* ===== Royal Header Section ===== */
        .royalHeader{
          background:#fff;
          border-bottom: 4px solid var(--gold);
          padding: 24px 0;
        }
        .royalRow{
          display:flex; align-items:center; justify-content:space-between; gap: 24px;
        }
        .royalLeft{ display:flex; align-items:center; gap: 24px; min-width: 0; }
        .coat{ width: 96px; height: 96px; display:flex; align-items:center; justify-content:center; }
        .coat img{ width: 100%; height: 100%; object-fit: contain; }
        .royalText{ color: var(--primary); min-width: 0; }
        .royalText .kh1{ margin:0; font-weight: 700; font-size: 20px; line-height:1.1; }
        .royalText .kh2{ margin:0; font-weight: 500; font-size: 18px; line-height:1.1; }
        .royalText .line{ height:1px; width: 128px; background: var(--gold); margin: 6px 0; }
        .royalText .en1{ font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; }
        .royalText .en2{ font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; opacity: .9; }

        .royalRight{ display:none; align-items:flex-end; gap: 12px; }
        .royalRight img{ height: 32px; border: 1px solid rgba(15,23,42,0.12); }
        .necName{ text-align:right; }
        .necName .enTitle{ font-size: 20px; font-weight: 900; color: var(--primary); text-transform: uppercase; }
        .necName .khTitle{ font-size: 14px; font-weight: 700; color: #475569; }

        @media (min-width: 1024px){
          .royalRight{ display:flex; flex-direction:column; }
        }

        /* ===== Navigation Bar ===== */
        .navBar{
          position: sticky; top: 0; z-index: 50;
          background: var(--primary) !important;
          border-bottom: 1px solid rgba(226,232,240,0.35);
          box-shadow: 0 8px 20px rgba(15,23,42,0.18);
        }
        .navInner{
          display:flex; align-items:center; justify-content:space-between;
          padding: 12px 0;
          gap: 14px;
        }
        .navLinks{ display:flex; align-items:center; gap: 40px; flex-wrap: wrap; }
        .navA{
          display:flex; align-items:center; gap: 6px;
          color: rgba(255,255,255,0.92) !important;
          font-weight: 800;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .08em;
          padding: 6px 0;
        }
        .navA.muted{ color: rgba(226,232,240,0.92) !important; }
        .navA:hover{ color: var(--gold) !important; }
        .navRight{ display:flex; align-items:center; gap: 20px; }
        .divider{ width:1px; height:16px; background: rgba(255,255,255,0.20); }

        .adminBtn{
          display:inline-flex; align-items:center; gap: 8px;
          padding: 6px 16px;
          border-radius: 4px;
          border: 1px solid rgba(212,175,55,0.5);
          color: var(--gold) !important;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: .08em;
          background: transparent;
        }
        .adminBtn:hover{ color:#fff !important; border-color: rgba(255,255,255,0.35); }

        /* ===== Main background pattern ===== */
        .mainBg{
          background-image: url('https://www.transparenttextures.com/patterns/natural-paper.png');
          padding: 48px 0 64px;
        }
        .mainMax{ max-width: 56rem; margin: 0 auto; }

        /* ===== Registration Header ===== */
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

        /* ===== Alerts ===== */
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

        /* ===== Main Card ===== */
        .cardOuter{
          background:#fff;
          border-top: 4px solid var(--gold);
          border-left: 1px solid rgba(15,23,42,0.10);
          border-right: 1px solid rgba(15,23,42,0.10);
          border-bottom: 1px solid rgba(15,23,42,0.10);
          box-shadow: 0 25px 50px -12px rgba(15,23,42,0.25);
          overflow:hidden;
        }

        /* Progress header */
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

        /* Form padding */
        .formPad{ padding: 40px; }
        @media (max-width: 640px){
          .progressHead{ padding: 20px 20px; }
          .formPad{ padding: 22px; }
          .navLinks{ gap: 18px; }
        }

        /* Sections */
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

        .help{
          margin-top: 10px;
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          font-style: italic;
        }

        /* Upload box */
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

        /* Preview (kept your feature, styled to match) */
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

        /* Submit area */
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

        /* Declaration */
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

        /* Metadata footer */
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

        /* Helpful cards */
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
        .infoIco{ font-size: 30px; }
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

        /* Global footer */
        .footer{
          background: var(--primary);
          color:#fff;
          padding: 48px 0;
          margin-top: 0;
        }
        .footerGrid{
          display:grid;
          grid-template-columns: 1fr;
          gap: 36px;
          padding-bottom: 48px;
          border-bottom: 1px solid rgba(255,255,255,0.10);
        }
        @media (min-width: 768px){
          .footerGrid{ grid-template-columns: 1fr 1fr 1fr; gap: 48px; }
        }
        .footerBrand{ display:flex; align-items:center; gap: 12px; }
        .footerBrand img{ height: 48px; filter: brightness(0) invert(1); }
        .footer h4{
          margin:0 0 10px 0;
          color: var(--gold);
          font-weight: 900;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .12em;
        }
        .footer p, .footer a{
          color: rgba(226,232,240,0.85) !important;
          font-weight: 600;
          font-size: 14px;
        }
        .footer a:hover{ color:#fff !important; }
        .footerBottom{
          padding-top: 20px;
          display:flex;
          flex-direction: column;
          gap: 12px;
          align-items:center;
          justify-content:space-between;
        }
        @media (min-width: 768px){
          .footerBottom{ flex-direction: row; }
        }
        .copy{
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: rgba(148,163,184,0.95);
          margin: 0;
        }
      `}</style>

      {/* Royal Header (matches HTML) */}
      <div className="royalHeader">
        <div className="wrap">
          <div className="royalRow">
            <div className="royalLeft">
              <div className="coat">
                <img
                  alt="Royal Coat of Arms of Cambodia"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAq5wOmTbLSzE_TUi9hbMtJxLBpV2Jq90llP65r01DSxP_KremgONUoLSe0i11vLlwUCBGsNgt5ao0ig41EsWGHzpca3c2wlZFcVOh7VL5cYrGtrd8RjDnFV2w8xiqbIG4TsGBpdFQi0mWQ6F1NFrMS4ERz7iXpVOeFTzJTmP9bmEyfEeQ5uzwoIFS7oh-NGtK2wP6ICnF82NzT7vWteVp_adRUSA6e5KGJ-mxG9KnBDkcZMyV-05mHK1nKmFyOMSFnxtIQ5Oo7fgv9"
                />
              </div>

              <div className="royalText">
                <p className="khmer-motto kh1">ព្រះរាជាណាចក្រកម្ពុជា</p>
                <p className="khmer-motto kh2">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
                <div className="line" />
                <div className="en1">Kingdom of Cambodia</div>
                <div className="en2">Nation Religion King</div>
              </div>
            </div>

            <div className="royalRight">
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <img
                  alt="Flag of Cambodia"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0KXjqArMbqW4FsyuntrHVomZmRCf_MFlpDeyXXl739VCWCs7hjsm9iNPjWksyukwXOUBGbQJvzaZ8GHe1CbQupXmwNq54QxzMIBIlChN6ndVtUeVxY-p4CIT9O5wktdQL6HE4abg1w2ZCuEuSSC3n1Nt2mw_LLRkPWgnoc3iiCXFZDJ5pE0FqAkSYZfzCbWtUXdefEEe-x95MxDDPux6gt2XsDUeqM-C-ScMp3QWUYTUvdrbL32QSGJF_eaeeuUs-DtA8u8tr_PsJ"
                />
              </div>
              <div className="necName">
                <div className="enTitle">National Election Committee</div>
                <div className="khTitle khmer-motto">
                  គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត (គ.ជ.ប)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav (matches HTML) */}
      <div className="navBar">
        <div className="wrap">
          <div className="navInner">
            <nav className="navLinks">
              <a className="navA" href="#">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  home
                </span>
                HOME
              </a>
              <Link className="navA muted" to="/official-voter-search">
                ស្វែងរកឈ្មោះក្នុងបញ្ជីបោះឆ្នោតផ្លូវការ
              </Link>
              <a className="navA muted" href="#">
                POLLING STATIONS
              </a>
            </nav>

            <div className="navRight">
              <div className="divider" />
              <Link to="/admin/login" className="adminBtn">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  admin_panel_settings
                </span>
                ADMIN LOGIN
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="mainBg">
        <div className="wrap">
          <div className="mainMax">
            {/* Header */}
            <div className="regHeader">
              <div className="badgeCircle">
                <span className="material-symbols-outlined">how_to_reg</span>
              </div>
              <h1 className="khmer-motto">ការចុះឈ្មោះបោះឆ្នោតឌីជីថល</h1>
              <h2>Digital Voter Registration</h2>
              <div className="goldLine" />
              <p>Official secure portal for enrollment in upcoming national elections.</p>
            </div>

            {/* Msg */}
            {msg && (
              <div className={`alertBox ${msg.type === "success" ? "success" : "danger"}`}>
                <span className="material-symbols-outlined">
                  {msg.type === "success" ? "verified" : "error"}
                </span>
                <div className="alertText">{msg.text}</div>
              </div>
            )}

            {/* Card */}
            <div className="cardOuter">
              {/* Progress */}
              <div className="progressHead">
                <div className="progressTop">
                  <div className="stepLeft">
                    <div className="stepCircle">1</div>
                    <div className="stepText">Identity Verification (ជំហានទី ១)</div>
                  </div>
                  <div className="progressPct">50% Complete</div>
                </div>
                <div className="bar">
                  <div className="barFill" />
                </div>
              </div>

              {/* FORM (same logic) */}
              <form className="formPad" onSubmit={submit}>
                {/* Section 1 */}
                <div className="section">
                  <div className="sectionHead">
                    <h3>
                      <span className="material-symbols-outlined">id_card</span>
                      អត្តសញ្ញាណប័ណ្ណផ្លូវការ / Official Identification
                    </h3>
                    <p>Please provide details exactly as they appear on your National ID.</p>
                  </div>

                  <div className="grid2">
                    <div className="field" style={{ gridColumn: "1 / -1" }}>
                      <label>ID Number (លេខអត្តសញ្ញាណប័ណ្ណ)</label>
                      <div className="inputWrap">
                        <span className="leftIcon">
                          <span className="material-symbols-outlined">badge</span>
                        </span>
                        <input
                          className="in plIcon"
                          name="id_number"
                          value={f.id_number}
                          onChange={onChange}
                          placeholder="Enter your 9 or 12 digit ID number"
                          type="text"
                          required
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>Full Name in Khmer (ឈ្មោះពេញ ជាភាសាខ្មែរ)</label>
                      <input
                        className="in khmer-motto"
                        name="name_kh"
                        value={f.name_kh}
                        onChange={onChange}
                        placeholder="ឈ្មោះពេញ (ភាសាខ្មែរ)"
                        type="text"
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Full Name in English (ឈ្មោះពេញ ជាអក្សរឡាតាំង)</label>
                      <input
                        className="in"
                        name="name_en"
                        value={f.name_en}
                        onChange={onChange}
                        placeholder="FULL NAME (LATIN)"
                        type="text"
                        required
                        style={{ textTransform: "uppercase", fontWeight: 900 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
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
                      />
                      <div className="help">Token will be sent to this email.</div>
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
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
                      className="fileInput"
                      type="file"
                      accept="image/*"
                      onChange={onPickFile}
                      required
                    />

                    <div className="uploadInner">
                      <div className="uploadCircle">
                        <span className="material-symbols-outlined">cloud_upload</span>
                      </div>
                      <div className="uploadTitle">Click to upload or drag and drop</div>
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

                  {/* Preview (kept your feature) */}
                  <div className="previewWrap">
                    <div className="previewTop">
                      <strong>ID Card Preview</strong>
                      {preview && (
                        <button
                          type="button"
                          className="miniBtn"
                          onClick={() => {
                            setFile(null);
                            if (preview) URL.revokeObjectURL(preview);
                            setPreview(null);
                          }}
                          disabled={loading}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="imgArea">
                      {preview ? (
                        <img src={preview} alt="preview" />
                      ) : (
                        <div style={{ color: "#64748b", fontWeight: 700 }}>No image selected.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div style={{ paddingTop: 40 }}>
                  <button className="submitBtn" type="submit" disabled={loading}>
                    <span className="material-symbols-outlined">how_to_reg</span>
                    {loading
                      ? "PROCESSING..."
                      : "បញ្ជាក់ និងផ្ញើកូដផ្ទៀងផ្ទាត់ / CONFIRM & PROCEED"}
                  </button>

                  {/* Declaration */}
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

              {/* Metadata footer */}
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
                  <a href="#">SECURITY POLICY</a>
                  <a href="#">USER TERMS</a>
                </div>
              </div>
            </div>

            {/* Helpful Info Grid */}
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

      {/* Global Footer */}
      <footer className="footer">
        <div className="wrap">
          <div className="footerGrid">
            <div>
              <div className="footerBrand">
                <img
                  alt="NEC"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1VASMuWY5mi24FjGFDWilxT_QzMGj1sFslggAFl65Emx9L-7RPyuvACj_Zuzz0DiKKEriCAoRgpUgclm_eMl4Oz6ucYVrqvqbuDfiI40hdKv-Nguz9lcjZirCHjbeRJGuznP2vxN3B6ghxWrZ8XRgIB5mEkCrr-pZAB6d4CMPLxtHSj6CasdUhK-2u2Fv4viG64nh0gCKpwy9ogdVeXmY6lUr8ES4dZdYwKHvjs0e6WRdvvioWOCIJte-X0ZWp1oV7D0dJXlqIMLM"
                />
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: 18 }}>NEC CAMBODIA</h3>
              </div>
              <p style={{ marginTop: 12 }}>
                Ensuring free and fair elections for the future of the Khmer Nation.
              </p>
            </div>

            <div>
              <h4>Quick Links</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a href="#">Election Laws</a>
                <a href="#">Voter Statistics</a>
                <a href="#">News & Announcements</a>
              </div>
            </div>

            <div>
              <h4>Official Contact</h4>
              <p>
                Building No. 1, Street No. 3, Sangkat Chakto Mukh, Khan Daun Penh, Phnom Penh, Cambodia.
              </p>
            </div>
          </div>

          <div className="footerBottom">
            <p className="copy">© 2026 National Election Committee. All rights reserved.</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="copy" style={{ margin: 0 }}>
                Kingdom of Cambodia
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}