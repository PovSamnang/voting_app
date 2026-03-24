import { Link, useLocation } from "react-router-dom";

const REQUESTS_ROUTE = "/admin/AdminDocumentChangeRequestsPage";

function resolveActive(pathname = "") {
  if (pathname === "/admin") return "dashboard";
  if (pathname.startsWith("/admin/elections")) return "elections";
  if (pathname.startsWith("/admin/voters")) return "voters";
  if (pathname.startsWith(REQUESTS_ROUTE)) return "requests";
  return "dashboard";
}

export default function AdminShell({
  title = "",
  subtitle = "",
  children,
  headerAction = null,
  active,
  onLogout,
  adminName = "Admin",
}) {
  const location = useLocation();
  const current = active || resolveActive(location.pathname);
  const adminInitial =
    String(adminName || "A").trim().charAt(0).toUpperCase() || "A";

  const sideItems = [
    { key: "dashboard", label: "Dashboard", to: "/admin", icon: "dashboard" },
    {
      key: "elections",
      label: "Elections",
      to: "/admin/elections",
      icon: "how_to_vote",
    },
    { key: "voters", label: "Voters", to: "/admin/voters", icon: "group" },
    {
      key: "requests",
      label: "Change Requests",
      to: REQUESTS_ROUTE,
      icon: "edit_document",
    },
  ];

  return (
    <div className="sg-shell">
      <style>{`
        .sg-shell{
          min-height:100vh;
          background:#f8f9fa;
          color:#191c1d;
          font-family:Inter,"Kantumruy Pro",sans-serif;
        }

        .material-symbols-outlined{
          font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;
          line-height:1;
        }

        .sg-sidebar{
          position:fixed;
          left:0;
          top:0;
          bottom:0;
          width:224px;
          background:linear-gradient(180deg,#00113a 0%, #002366 100%);
          border-right:1px solid rgba(254,214,91,.18);
          box-shadow:0 20px 40px rgba(0,0,0,.20);
          display:flex;
          flex-direction:column;
          z-index:30;
        }

        .sg-brand{
          padding:22px 20px 18px;
          border-bottom:1px solid rgba(254,214,91,.16);
          display:flex;
          align-items:center;
          gap:14px;
        }

        .sg-brand-mark{
          width:36px;
          height:36px;
          border-radius:4px;
          background:#ffe088;
          color:#00113a;
          display:flex;
          align-items:center;
          justify-content:center;
          flex:0 0 auto;
        }

        .sg-brand-title{
          margin:0;
          color:#fed65b;
          font-size:12px;
          line-height:1.2;
          font-weight:900;
          letter-spacing:.14em;
          text-transform:uppercase;
        }

        .sg-brand-sub{
          margin-top:4px;
          color:#94a3b8;
          font-size:10px;
          font-weight:700;
          letter-spacing:.12em;
          text-transform:uppercase;
        }

        .sg-side-nav{
          padding:16px 0;
          display:flex;
          flex-direction:column;
          gap:2px;
        }

        .sg-side-link{
          display:flex;
          align-items:center;
          gap:12px;
          padding:13px 18px;
          text-decoration:none;
          color:rgba(255,255,255,.74);
          font-size:12px;
          font-weight:800;
          letter-spacing:.06em;
          text-transform:uppercase;
          border-left:4px solid transparent;
          transition:.18s ease;
        }

        .sg-side-link:hover{
          color:#fff;
          background:rgba(255,255,255,.05);
        }

        .sg-side-link.active{
          color:#fed65b;
          background:#002366;
          border-left-color:#fed65b;
        }

        .sg-side-bottom{
          margin-top:auto;
          padding:14px 0 16px;
          border-top:1px solid rgba(254,214,91,.16);
        }

        .sg-side-action{
          width:100%;
          display:flex;
          align-items:center;
          gap:12px;
          padding:12px 18px;
          color:#cbd5e1;
          background:transparent;
          border:none;
          text-align:left;
          font-size:12px;
          font-weight:800;
          cursor:pointer;
          transition:.18s ease;
        }

        .sg-side-action:hover{
          color:#fed65b;
          background:rgba(255,255,255,.04);
        }

        .sg-side-action.sg-danger:hover{
          color:#fca5a5;
        }

        .sg-main{
          margin-left:224px;
          min-height:100vh;
          display:flex;
          flex-direction:column;
        }

        .sg-topbar{
          position:sticky;
          top:0;
          z-index:20;
          background:#ffffff;
          border-bottom:2px solid rgba(115,92,0,.7);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:20px;
          padding:14px 28px;
        }

        .sg-topbar-left{
          display:flex;
          align-items:center;
          gap:24px;
          min-width:0;
        }

        .sg-top-title{
          font-size:18px;
          font-weight:900;
          color:#002366;
          white-space:nowrap;
        }

        .sg-search-wrap{
          position:relative;
          width:260px;
        }

        .sg-search-icon{
          position:absolute;
          left:12px;
          top:50%;
          transform:translateY(-50%);
          color:#757682;
          font-size:20px;
        }

        .sg-search{
          width:100%;
          height:36px;
          border:none;
          outline:none;
          border-radius:999px;
          background:#f3f4f5;
          padding:0 14px 0 38px;
          font-size:14px;
          color:#191c1d;
        }

        .sg-topbar-right{
          display:flex;
          align-items:center;
          gap:16px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .sg-status-pill{
          display:flex;
          align-items:center;
          gap:8px;
          padding:7px 12px;
          border-radius:999px;
          background:#fed65b;
          color:#745c00;
          font-size:10px;
          font-weight:900;
          letter-spacing:.10em;
          text-transform:uppercase;
          white-space:nowrap;
        }

        .sg-status-dot{
          width:8px;
          height:8px;
          border-radius:999px;
          background:#ef4444;
          box-shadow:0 0 0 4px rgba(239,68,68,.14);
          animation:sgPulse 1.6s infinite;
        }

        @keyframes sgPulse{
          0%{ transform:scale(1); opacity:1; }
          70%{ transform:scale(1.15); opacity:.65; }
          100%{ transform:scale(1); opacity:1; }
        }

        .sg-icon-btn{
          width:34px;
          height:34px;
          border:none;
          background:transparent;
          color:#002366;
          border-radius:999px;
          display:grid;
          place-items:center;
          cursor:pointer;
        }

        .sg-icon-btn:hover{
          background:#f3f4f5;
        }

        .sg-avatar{
          width:34px;
          height:34px;
          border-radius:999px;
          overflow:hidden;
          display:grid;
          place-items:center;
          background:linear-gradient(135deg,#1e3a8a,#d4af37);
          color:#fff;
          font-size:13px;
          font-weight:900;
          border:1px solid rgba(115,92,0,.18);
          flex:0 0 auto;
        }

        .sg-content{
          width:min(1160px, calc(100% - 40px));
          margin:0 auto;
          padding:28px 0 24px;
          flex:1;
        }

        .sg-page-head{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:16px;
          margin-bottom:22px;
        }

        .sg-page-title{
          margin:0;
          color:#00113a;
          font-size:32px;
          line-height:1.1;
          font-weight:900;
          letter-spacing:-.03em;
        }

        .sg-page-subtitle{
          margin:8px 0 0;
          color:#5f6672;
          font-size:14px;
          line-height:1.7;
          font-weight:600;
          max-width:760px;
        }

        .sg-footer{
          background:#ffffff;
          border-top:2px solid rgba(212,175,55,.18);
          padding:26px 28px;
        }

        .sg-footer-inner{
          width:min(1160px, calc(100% - 40px));
          margin:0 auto;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:24px;
          flex-wrap:wrap;
        }

        .sg-footer-left{
          display:flex;
          align-items:center;
          gap:16px;
        }

        .sg-footer-mark{
          width:40px;
          height:40px;
          background:#00113a;
          color:#ffe088;
          border-radius:4px;
          display:grid;
          place-items:center;
        }

        .sg-footer-title{
          font-size:12px;
          font-weight:900;
          letter-spacing:.16em;
          text-transform:uppercase;
          color:#00113a;
          margin:0;
        }

        .sg-footer-sub{
          margin:4px 0 0;
          font-size:10px;
          font-weight:700;
          letter-spacing:.08em;
          text-transform:uppercase;
          color:#757682;
        }

        .sg-footer-links{
          display:flex;
          align-items:center;
          gap:28px;
          flex-wrap:wrap;
        }

        .sg-footer-links a{
          text-decoration:none;
          color:#444650;
          font-size:10px;
          font-weight:900;
          letter-spacing:.12em;
          text-transform:uppercase;
        }

        .sg-footer-links a:hover{
          color:#735c00;
        }

        .sg-footer-right{
          text-align:right;
        }

        .sg-footer-ver{
          margin:0;
          font-size:11px;
          font-weight:900;
          letter-spacing:.12em;
          color:#00113a;
        }

        .sg-footer-copy{
          margin:4px 0 0;
          font-size:9px;
          color:#757682;
          font-weight:600;
        }

        @media (max-width: 1024px){
          .sg-sidebar{
            width:86px;
          }
          .sg-main{
            margin-left:86px;
          }
          .sg-brand-copy,
          .sg-side-link span:last-child,
          .sg-side-action span:last-child{
            display:none;
          }
          .sg-side-link,
          .sg-side-action{
            justify-content:center;
            padding-left:0;
            padding-right:0;
          }
          .sg-side-link.active{
            border-left-color:transparent;
            box-shadow:inset 4px 0 0 #fed65b;
          }
          .sg-search-wrap{
            display:none;
          }
        }

        @media (max-width: 640px){
          .sg-topbar{
            padding:12px 16px;
          }
          .sg-content{
            width:calc(100% - 24px);
            padding:18px 0 20px;
          }
          .sg-footer{
            padding:20px 16px;
          }
          .sg-footer-inner{
            width:100%;
          }
          .sg-status-pill{
            display:none;
          }
          .sg-page-title{
            font-size:26px;
          }
        }
      `}</style>

      <aside className="sg-sidebar">
        <div className="sg-brand">
          <div className="sg-brand-mark">
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24",
              }}
            >
              account_balance
            </span>
          </div>

          <div className="sg-brand-copy">
            <p className="sg-brand-title">Sovereign Envoy</p>
            <div className="sg-brand-sub">Official Administration</div>
          </div>
        </div>

        <nav className="sg-side-nav">
          {sideItems.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`sg-side-link ${current === item.key ? "active" : ""}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sg-side-bottom">
          <button type="button" className="sg-side-action">
            <span className="material-symbols-outlined">contact_support</span>
            <span>Support</span>
          </button>

          <button
            type="button"
            className="sg-side-action sg-danger"
            onClick={onLogout}
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="sg-main">
        <header className="sg-topbar">
          <div className="sg-topbar-left">
            <div className="sg-top-title">National Sovereign Dashboard</div>

            <div className="sg-search-wrap">
              <span className="material-symbols-outlined sg-search-icon">
                search
              </span>
              <input
                className="sg-search"
                placeholder="Search national records..."
                type="text"
              />
            </div>
          </div>

          <div className="sg-topbar-right">
            <div className="sg-status-pill">
              <span className="sg-status-dot" />
              <span>Current Election: Active</span>
            </div>

            <button type="button" className="sg-icon-btn">
              <span className="material-symbols-outlined">notifications</span>
            </button>

            <button type="button" className="sg-icon-btn">
              <span className="material-symbols-outlined">help_outline</span>
            </button>

            <div className="sg-avatar">{adminInitial}</div>
          </div>
        </header>

        <div className="sg-content">
          {(title || subtitle || headerAction) && (
            <section className="sg-page-head">
              <div>
                {title ? <h1 className="sg-page-title">{title}</h1> : null}
                {subtitle ? (
                  <p className="sg-page-subtitle">{subtitle}</p>
                ) : null}
              </div>
              {headerAction}
            </section>
          )}

          {children}
        </div>

        <footer className="sg-footer">
          <div className="sg-footer-inner">
            <div className="sg-footer-left">
              <div className="sg-footer-mark">
                <span className="material-symbols-outlined">
                  account_balance
                </span>
              </div>

              <div>
                <p className="sg-footer-title">National Election Committee</p>
                <p className="sg-footer-sub">
                  Kingdom of Cambodia • Office of Sovereign Data
                </p>
              </div>
            </div>

            <div className="sg-footer-links">
              <a href="/">Integrity Protocol</a>
              <a href="/">Privacy Charter</a>
              <a href="/">System Logs</a>
            </div>

            <div className="sg-footer-right">
              <p className="sg-footer-ver">VER 4.2.0-GOLD</p>
              <p className="sg-footer-copy">
                © 2024 Sovereignty Digital Initiative. All Rights Reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}