import { Link, useLocation } from "react-router-dom";

function resolveActive(pathname = "") {
  if (pathname.startsWith("/track-document-request")) return "tracking";
  if (pathname.startsWith("/official-voter-search")) return "search";
  if (pathname.startsWith("/document-change-request")) return "search";
  return "home";
}

export default function UserShell({
  children,
  active,
  notice = "",
  titleKh = "",
  titleEn = "",
  subtitle = "",
  heroIcon = "shield_person",
  container = "wide", // wide | narrow
}) {
  const location = useLocation();
  const current = active || resolveActive(location.pathname);

  return (
    <div className="us-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Kantumruy+Pro:wght@300;400;500;600;700&display=swap');

        .us-shell{
          --us-blue:#002b67;
          --us-blue-2:#0b3b78;
          --us-gold:#d4af37;
          --us-gold-dark:#b8860b;
          --us-text:#0f172a;
          --us-muted:#64748b;
          --us-bg:#f6f8fc;
          --us-border:rgba(15,23,42,.10);
          min-height:100vh;
          width:100%;
          background:var(--us-bg);
          color:var(--us-text);
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .us-shell *, .us-shell *::before, .us-shell *::after{
          box-sizing:border-box;
        }

        .us-shell a{
          text-decoration:none !important;
        }

        .us-kh{
          font-family:"Kantumruy Pro", Inter, sans-serif;
        }

        .material-symbols-outlined{
          font-variation-settings:'FILL' 0,'wght' 500,'GRAD' 0,'opsz' 24;
          line-height:1;
          vertical-align:middle;
        }

        .us-wrap{
          width:min(1360px, calc(100% - 32px));
          margin:0 auto;
        }

        .us-notice{
          background:#fff;
          border-bottom:1px solid rgba(212,175,55,.24);
          color:#b91c1c;
          font-size:14px;
          font-weight:700;
          padding:10px 0;
        }

        .us-royal{
          background:#fff;
          border-bottom:4px solid var(--us-gold);
          padding:22px 0;
        }

        .us-royal-row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:24px;
          flex-wrap:wrap;
        }

        .us-royal-left{
          display:flex;
          align-items:center;
          gap:20px;
          min-width:0;
        }

        .us-coat{
          width:88px;
          height:88px;
          flex:0 0 auto;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .us-coat img{
          width:100%;
          height:100%;
          object-fit:contain;
        }

        .us-royal-copy{
          min-width:0;
        }

        .us-kh-1{
          margin:0;
          color:var(--us-blue);
          font-size:22px;
          font-weight:800;
          line-height:1.15;
        }

        .us-kh-2{
          margin:2px 0 0 0;
          color:var(--us-blue);
          font-size:18px;
          font-weight:600;
          line-height:1.15;
        }

        .us-line{
          width:120px;
          height:2px;
          background:var(--us-gold);
          margin:8px 0;
        }

        .us-en-1{
          color:var(--us-blue);
          font-size:12px;
          font-weight:900;
          letter-spacing:.14em;
          text-transform:uppercase;
        }

        .us-en-2{
          color:#475569;
          font-size:11px;
          font-weight:700;
          letter-spacing:.08em;
          text-transform:uppercase;
        }

        .us-royal-right{
          display:flex;
          flex-direction:column;
          align-items:flex-end;
          gap:10px;
        }

        .us-flag{
          height:32px;
          border:1px solid rgba(15,23,42,.12);
        }

        .us-nec-title{
          text-align:right;
        }

        .us-nec-en{
          color:var(--us-blue);
          font-size:18px;
          font-weight:900;
          text-transform:uppercase;
        }

        .us-nec-kh{
          color:#475569;
          font-size:13px;
          font-weight:700;
        }

        .us-nav{
          position:sticky;
          top:0;
          z-index:30;
          background:linear-gradient(180deg,var(--us-blue),#001f4e);
          box-shadow:0 10px 20px rgba(15,23,42,.14);
        }

        .us-nav-row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:12px 0;
          flex-wrap:wrap;
        }

        .us-nav-links{
          display:flex;
          align-items:center;
          gap:24px;
          flex-wrap:wrap;
        }

        .us-nav-link{
          color:rgba(255,255,255,.88) !important;
          font-size:12px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.08em;
          padding:6px 0;
          border-bottom:2px solid transparent;
          display:inline-flex;
          align-items:center;
          gap:8px;
        }

        .us-nav-link:hover{
          color:var(--us-gold) !important;
        }

        .us-nav-link.active{
          color:var(--us-gold) !important;
          border-bottom-color:var(--us-gold);
        }

        .us-admin-btn{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 14px;
          border:1px solid rgba(212,175,55,.45);
          color:var(--us-gold) !important;
          font-size:12px;
          font-weight:900;
          letter-spacing:.08em;
          text-transform:uppercase;
          border-radius:6px;
          background:transparent;
        }

        .us-admin-btn:hover{
          color:#fff !important;
          border-color:rgba(255,255,255,.28);
        }

        .us-hero{
          background:
            linear-gradient(135deg, rgba(0,43,103,.96), rgba(11,59,120,.96)),
            radial-gradient(circle at top right, rgba(255,255,255,.12), transparent 30%);
          color:#fff;
          padding:34px 0 30px;
          border-bottom:4px solid var(--us-gold);
        }

        .us-hero-inner{
          text-align:center;
        }

        .us-hero-icon{
          width:60px;
          height:60px;
          border-radius:999px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          background:rgba(255,255,255,.12);
          border:1px solid rgba(255,255,255,.15);
          margin-bottom:14px;
        }

        .us-hero-icon .material-symbols-outlined{
          font-size:30px;
          color:#ffe9a3;
        }

        .us-hero-kh{
          margin:0;
          font-size:30px;
          font-weight:900;
          line-height:1.15;
        }

        .us-hero-en{
          margin:6px 0 0 0;
          font-size:22px;
          font-weight:800;
          color:#dbe8ff;
        }

        .us-hero-line{
          width:92px;
          height:4px;
          margin:16px auto 0;
          border-radius:999px;
          background:var(--us-gold);
        }

        .us-hero-sub{
          margin:16px auto 0;
          max-width:760px;
          font-size:14px;
          font-weight:600;
          color:rgba(255,255,255,.86);
        }

        .us-main{
          background:
            radial-gradient(circle at 1px 1px, rgba(212,175,55,.07) 1px, transparent 0);
          background-size:28px 28px;
          padding:34px 0 54px;
        }

        .us-main-inner.wide{
          width:min(1360px, calc(100% - 32px));
          margin:0 auto;
        }

        .us-main-inner.narrow{
          width:min(960px, calc(100% - 32px));
          margin:0 auto;
        }

        .us-footer{
          background:linear-gradient(180deg,#002b67,#001f4e);
          color:#fff;
          padding:42px 0 20px;
          margin-top:0;
        }

        .us-footer-grid{
          display:grid;
          grid-template-columns:1.3fr 1fr 1fr;
          gap:32px;
          padding-bottom:28px;
          border-bottom:1px solid rgba(255,255,255,.10);
        }

        .us-footer-title{
          margin:0 0 10px 0;
          color:var(--us-gold);
          font-size:12px;
          font-weight:900;
          letter-spacing:.14em;
          text-transform:uppercase;
        }

        .us-footer p,
        .us-footer a{
          margin:0;
          color:rgba(255,255,255,.84) !important;
          font-size:14px;
          font-weight:600;
          line-height:1.65;
        }

        .us-footer-links{
          display:flex;
          flex-direction:column;
          gap:8px;
        }

        .us-footer-bottom{
          padding-top:16px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:14px;
          flex-wrap:wrap;
        }

        .us-copy{
          color:rgba(255,255,255,.72);
          font-size:11px;
          font-weight:900;
          letter-spacing:.12em;
          text-transform:uppercase;
        }

        @media (max-width: 980px){
          .us-royal-right{
            display:none;
          }

          .us-footer-grid{
            grid-template-columns:1fr;
          }
        }

        @media (max-width: 640px){
          .us-wrap,
          .us-main-inner.wide,
          .us-main-inner.narrow{
            width:calc(100% - 20px);
          }

          .us-coat{
            width:70px;
            height:70px;
          }

          .us-kh-1{
            font-size:18px;
          }

          .us-kh-2{
            font-size:15px;
          }

          .us-hero-kh{
            font-size:24px;
          }

          .us-hero-en{
            font-size:18px;
          }
        }
      `}</style>

      {notice ? (
        <div className="us-notice">
          <div className="us-wrap us-kh">{notice}</div>
        </div>
      ) : null}

      <header className="us-royal">
        <div className="us-wrap">
          <div className="us-royal-row">
            <div className="us-royal-left">
              <div className="us-coat">
                <img
                  alt="Royal Coat of Arms of Cambodia"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAq5wOmTbLSzE_TUi9hbMtJxLBpV2Jq90llP65r01DSxP_KremgONUoLSe0i11vLlwUCBGsNgt5ao0ig41EsWGHzpca3c2wlZFcVOh7VL5cYrGtrd8RjDnFV2w8xiqbIG4TsGBpdFQi0mWQ6F1NFrMS4ERz7iXpVOeFTzJTmP9bmEyfEeQ5uzwoIFS7oh-NGtK2wP6ICnF82NzT7vWteVp_adRUSA6e5KGJ-mxG9KnBDkcZMyV-05mHK1nKmFyOMSFnxtIQ5Oo7fgv9"
                />
              </div>

              <div className="us-royal-copy">
                <p className="us-kh-1 us-kh">ព្រះរាជាណាចក្រកម្ពុជា</p>
                <p className="us-kh-2 us-kh">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
                <div className="us-line" />
                <div className="us-en-1">Kingdom of Cambodia</div>
                <div className="us-en-2">Nation Religion King</div>
              </div>
            </div>

            <div className="us-royal-right">
              <img
                className="us-flag"
                alt="Flag of Cambodia"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0KXjqArMbqW4FsyuntrHVomZmRCf_MFlpDeyXXl739VCWCs7hjsm9iNPjWksyukwXOUBGbQJvzaZ8GHe1CbQupXmwNq54QxzMIBIlChN6ndVtUeVxY-p4CIT9O5wktdQL6HE4abg1w2ZCuEuSSC3n1Nt2mw_LLRkPWgnoc3iiCXFZDJ5pE0FqAkSYZfzCbWtUXdefEEe-x95MxDDPux6gt2XsDUeqM-C-ScMp3QWUYTUvdrbL32QSGJF_eaeeuUs-DtA8u8tr_PsJ"
              />

              <div className="us-nec-title">
                <div className="us-nec-en">National Election Committee</div>
                <div className="us-nec-kh us-kh">
                  គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត (គ.ជ.ប)
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="us-nav">
        <div className="us-wrap">
          <div className="us-nav-row">
            <div className="us-nav-links">
              <Link to="/" className={`us-nav-link ${current === "home" ? "active" : ""}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  home
                </span>
                Home
              </Link>

              <Link
                to="/official-voter-search"
                className={`us-nav-link ${current === "search" ? "active" : ""}`}
              >
                ស្វែងរកឈ្មោះក្នុងបញ្ជីបោះឆ្នោតផ្លូវការ
              </Link>

              <Link
                to="/track-document-request"
                className={`us-nav-link ${current === "tracking" ? "active" : ""}`}
              >
                តាមដានដំណើរការស្នើសុំផ្លាស់ប្ដូរឯកសារ
              </Link>
            </div>

            <Link to="/admin/login" className="us-admin-btn">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                admin_panel_settings
              </span>
              Admin Login
            </Link>
          </div>
        </div>
      </div>

      {(titleKh || titleEn || subtitle) && (
        <section className="us-hero">
          <div className="us-wrap">
            <div className="us-hero-inner">
              <div className="us-hero-icon">
                <span className="material-symbols-outlined">{heroIcon}</span>
              </div>

              {titleKh ? <h1 className="us-hero-kh us-kh">{titleKh}</h1> : null}
              {titleEn ? <p className="us-hero-en">{titleEn}</p> : null}
              <div className="us-hero-line" />
              {subtitle ? <p className="us-hero-sub">{subtitle}</p> : null}
            </div>
          </div>
        </section>
      )}

      <main className="us-main">
        <div className={`us-main-inner ${container === "narrow" ? "narrow" : "wide"}`}>
          {children}
        </div>
      </main>

      <footer className="us-footer">
        <div className="us-wrap">
          <div className="us-footer-grid">
            <div>
              <h4 className="us-footer-title">National Election Committee</h4>
              <p>
                Ensuring transparent, lawful, and secure democratic participation for all
                eligible citizens of the Kingdom of Cambodia.
              </p>
            </div>

            <div>
              <h4 className="us-footer-title">Quick Links</h4>
              <div className="us-footer-links">
                <Link to="/register-request-token">Token Request</Link>
                <Link to="/official-voter-search">Official Voter Search</Link>
                <Link to="/admin/login">Administration</Link>
              </div>
            </div>

            <div>
              <h4 className="us-footer-title">Official Contact</h4>
              <p>
                National Election Committee, Phnom Penh, Kingdom of Cambodia.
              </p>
            </div>
          </div>

          <div className="us-footer-bottom">
            <p className="us-copy">© 2026 National Election Committee. All rights reserved.</p>
            <p className="us-copy">Kingdom of Cambodia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}