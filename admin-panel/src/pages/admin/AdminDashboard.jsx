import { Link, useNavigate } from "react-router-dom";
import AdminShell from "../../components/AdminShell";

const REQUESTS_ROUTE = "/admin/AdminDocumentChangeRequestsPage";

const stats = [
  {
    label: "Total Voters",
    value: "14.8M",
    note: "+1.2% from last cycle",
    noteIcon: "trending_up",
    icon: "group",
    accent: "primary",
  },
  {
    label: "Total Elections",
    value: "24",
    note: "Active tracking since 1993",
    noteIcon: "history",
    icon: "how_to_vote",
    accent: "gold",
  },
  {
    label: "Pending Requests",
    value: "1.4K",
    note: "Requires Immediate Attention",
    noteIcon: "priority_high",
    icon: "edit_document",
    accent: "error",
  },
];

const regions = [
  {
    name: "Phnom Penh",
    sub: "Capital Municipality",
    progress: 94,
    voters: "2.1M",
    status: "Verified Official",
  },
  {
    name: "Siem Reap",
    sub: "Northwestern Region",
    progress: 88,
    voters: "1.2M",
    status: "Verified Official",
  },
  {
    name: "Kandal",
    sub: "Central Plain",
    progress: 91,
    voters: "1.5M",
    status: "Verified Official",
  },
];

const consoles = [
  {
    titleKh: "គ្រប់គ្រងការបោះឆ្នោត",
    titleEn: "Election Management Console",
    to: "/admin/elections",
    icon: "how_to_vote",
    featured: true,
  },
  {
    titleKh: "ចុះឈ្មោះអ្នកបោះឆ្នោត",
    titleEn: "Voter Registration Hub",
    to: "/admin/voters",
    icon: "person_add",
    featured: false,
  },
  {
    titleKh: "សំណើផ្លាស់ប្តូរ",
    titleEn: "Change Request Gateway",
    to: REQUESTS_ROUTE,
    icon: "edit_document",
    featured: false,
  },
];

export default function AdminDashboard() {
  const nav = useNavigate();

  const logout = () => {
    localStorage.removeItem("admin_token");
    nav("/admin/login", { replace: true });
  };

  return (
    <AdminShell active="dashboard" onLogout={logout} adminName="Admin">
      <style>{`
        .dash-watermark{
          background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L35 25L55 30L35 35L30 55L25 35L5 30L25 25Z' fill='%23735c00' fill-opacity='0.05'/%3E%3C/svg%3E");
        }

        .dash-hero{
          position:relative;
          overflow:hidden;
          background:#002366;
          color:#fff;
          border-radius:12px;
          padding:30px 28px;
          box-shadow:0 16px 28px rgba(0,17,58,.12);
          border-bottom:4px solid #fed65b;
          margin-bottom:28px;
        }

        .dash-hero-inner{
          position:relative;
          z-index:2;
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:20px;
          flex-wrap:wrap;
        }

        .dash-kicker{
          display:flex;
          align-items:center;
          gap:12px;
          margin-bottom:12px;
        }

        .dash-kicker-line{
          width:34px;
          height:1px;
          background:#ffe088;
        }

        .dash-kicker-text{
          color:#ffe088;
          font-size:13px;
          font-weight:900;
          letter-spacing:.18em;
          text-transform:uppercase;
        }

        .dash-title-kh{
          margin:0;
          font-size:42px;
          line-height:1.08;
          font-weight:900;
          letter-spacing:-.03em;
        }

        .dash-title-en{
          margin:8px 0 0;
          font-size:18px;
          color:#b3c5ff;
          font-weight:700;
        }

        .dash-live{
          display:flex;
          align-items:center;
          gap:14px;
          padding:16px 18px;
          background:rgba(255,255,255,.08);
          border:1px solid rgba(255,255,255,.10);
          border-radius:8px;
          backdrop-filter:blur(8px);
          min-width:315px;
        }

        .dash-live .material-symbols-outlined{
          color:#ffe088;
          font-size:36px;
          font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24;
        }

        .dash-live-small{
          margin:0 0 4px;
          font-size:10px;
          letter-spacing:.16em;
          text-transform:uppercase;
          color:rgba(255,255,255,.62);
          font-weight:800;
        }

        .dash-live-title{
          margin:0;
          font-size:16px;
          font-weight:900;
          color:#fff;
        }

        .dash-stats{
          display:grid;
          grid-template-columns:repeat(3, minmax(0, 1fr));
          gap:18px;
          margin-bottom:28px;
        }

        .dash-stat{
          background:#fff;
          border-radius:8px;
          padding:22px 22px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          transition:.18s ease;
          min-height:110px;
          position:relative;
          overflow:hidden;
        }

        .dash-stat::before{
          content:"";
          position:absolute;
          left:0;
          top:0;
          bottom:0;
          width:4px;
        }

        .dash-stat.primary::before{ background:#00113a; }
        .dash-stat.gold::before{ background:#735c00; }
        .dash-stat.error::before{ background:#ba1a1a; }

        .dash-stat:hover{
          transform:translateY(-1px);
          box-shadow:0 8px 18px rgba(0,17,58,.06);
        }

        .dash-stat-label{
          margin:0 0 8px;
          font-size:12px;
          color:#c5c6d2;
          font-weight:900;
          letter-spacing:.14em;
          text-transform:uppercase;
        }

        .dash-stat-value{
          margin:0 0 6px;
          font-size:24px;
          color:#00113a;
          font-weight:900;
          line-height:1;
        }

        .dash-stat-note{
          display:flex;
          align-items:center;
          gap:4px;
          margin:0;
          font-size:11px;
          font-weight:700;
        }

        .dash-stat.primary .dash-stat-note{ color:#1d4f40; }
        .dash-stat.gold .dash-stat-note{ color:#757682; }
        .dash-stat.error .dash-stat-note{ color:#ba1a1a; }

        .dash-stat-icon{
          font-size:54px;
          opacity:.10;
        }

        .dash-stat.primary .dash-stat-icon{ color:#00113a; }
        .dash-stat.gold .dash-stat-icon{ color:#735c00; }
        .dash-stat.error .dash-stat-icon{ color:#ba1a1a; }

        .dash-grid{
          display:grid;
          grid-template-columns:minmax(0, 2fr) minmax(320px, 1fr);
          gap:26px;
          align-items:start;
        }

        .dash-section-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:14px;
          padding:0 6px;
        }

        .dash-section-head-left{
          display:flex;
          align-items:center;
          gap:12px;
        }

        .dash-section-bar{
          width:6px;
          height:24px;
          background:#735c00;
        }

        .dash-section-title{
          margin:0;
          color:#00113a;
          font-size:18px;
          font-weight:900;
          letter-spacing:-.02em;
        }

        .dash-section-link{
          text-decoration:none;
          color:#735c00;
          font-size:11px;
          font-weight:900;
          letter-spacing:.14em;
          text-transform:uppercase;
        }

        .dash-table-wrap{
          overflow:hidden;
          border-radius:12px;
          background:#fff;
          border:1px solid rgba(117,118,130,.15);
        }

        .dash-table{
          width:100%;
          border-collapse:collapse;
        }

        .dash-table thead tr{
          background:#f3f4f5;
        }

        .dash-table th{
          text-align:left;
          padding:16px 20px;
          font-size:10px;
          font-weight:900;
          letter-spacing:.14em;
          color:#444650;
          text-transform:uppercase;
        }

        .dash-table td{
          padding:18px 20px;
          border-top:1px solid #edeeef;
          vertical-align:middle;
        }

        .dash-region-name{
          margin:0 0 4px;
          color:#00113a;
          font-size:16px;
          font-weight:900;
        }

        .dash-region-sub{
          margin:0;
          color:#757682;
          font-size:11px;
          font-weight:700;
        }

        .dash-progress-track{
          width:100%;
          max-width:130px;
          height:6px;
          border-radius:999px;
          overflow:hidden;
          background:#edeeef;
        }

        .dash-progress-fill{
          height:100%;
          background:#735c00;
        }

        .dash-progress-text{
          display:inline-block;
          margin-top:8px;
          font-size:11px;
          font-weight:900;
          color:#191c1d;
        }

        .dash-status-badge{
          display:inline-flex;
          align-items:center;
          padding:6px 10px;
          border-radius:4px;
          background:#baeed9;
          color:#002117;
          font-size:9px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.06em;
          white-space:nowrap;
        }

        .dash-side-stack{
          display:flex;
          flex-direction:column;
          gap:18px;
        }

        .dash-console-wrap{
          display:flex;
          flex-direction:column;
          gap:12px;
        }

        .dash-console{
          position:relative;
          overflow:hidden;
          text-decoration:none;
          border-radius:8px;
          padding:18px 18px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          transition:.18s ease;
        }

        .dash-console:hover{
          transform:translateY(-1px);
        }

        .dash-console.featured{
          background:#00113a;
          color:#fff;
          border-bottom:2px solid #fed65b;
        }

        .dash-console.normal{
          background:#fff;
          color:#00113a;
          border:1px solid rgba(117,118,130,.22);
        }

        .dash-console-t1{
          margin:0 0 6px;
          font-size:15px;
          font-weight:900;
          letter-spacing:.01em;
        }

        .dash-console.featured .dash-console-t1{
          color:#ffe088;
        }

        .dash-console-t2{
          margin:0;
          font-size:12px;
          font-weight:600;
        }

        .dash-console.featured .dash-console-t2{
          color:rgba(255,255,255,.72);
        }

        .dash-console.normal .dash-console-t2{
          color:#757682;
        }

        .dash-console-icon{
          width:42px;
          height:42px;
          border-radius:8px;
          display:grid;
          place-items:center;
          flex:0 0 auto;
        }

        .dash-console.featured .dash-console-icon{
          background:rgba(255,255,255,.10);
          color:#ffe088;
        }

        .dash-console.normal .dash-console-icon{
          background:rgba(255,224,136,.35);
          color:#735c00;
        }

        .dash-console-bg{
          position:absolute;
          right:-10px;
          bottom:-16px;
          opacity:.06;
          font-size:90px;
          pointer-events:none;
        }

        .dash-seal{
          background:#e7e8e9;
          border-top:2px solid rgba(0,17,58,.16);
          border-radius:8px;
          padding:26px 20px;
          text-align:center;
        }

        .dash-seal-icon{
          display:flex;
          justify-content:center;
          margin-bottom:10px;
        }

        .dash-seal-icon .material-symbols-outlined{
          font-size:48px;
          color:#735c00;
          font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24;
        }

        .dash-seal-title{
          margin:0 0 6px;
          font-size:10px;
          color:#00113a;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.18em;
        }

        .dash-seal-sub{
          margin:0;
          font-size:11px;
          color:#757682;
          font-style:italic;
          font-weight:700;
        }

        @media (max-width: 1100px){
          .dash-grid{
            grid-template-columns:1fr;
          }
        }

        @media (max-width: 820px){
          .dash-stats{
            grid-template-columns:1fr;
          }
          .dash-title-kh{
            font-size:30px;
          }
          .dash-live{
            min-width:auto;
            width:100%;
          }
          .dash-table{
            min-width:720px;
          }
          .dash-table-wrap{
            overflow:auto;
          }
        }
      `}</style>

      <section className="dash-hero dash-watermark">
        <div className="dash-hero-inner">
          <div>
            <div className="dash-kicker">
              <span className="dash-kicker-line" />
              <span className="dash-kicker-text">
                Sovereign State of Cambodia
              </span>
            </div>

            <h2 className="dash-title-kh">បណ្ណសារអ្នកបោះឆ្នោតជាតិ</h2>
            <p className="dash-title-en">National Voter Archive Dashboard</p>
          </div>

          <div className="dash-live">
            <span className="material-symbols-outlined">verified</span>
            <div>
              <p className="dash-live-small">Live Election Status</p>
              <p className="dash-live-title">2024 General Election: ACTIVE</p>
            </div>
          </div>
        </div>
      </section>

      <section className="dash-stats">
        {stats.map((item) => (
          <div key={item.label} className={`dash-stat ${item.accent}`}>
            <div>
              <p className="dash-stat-label">{item.label}</p>
              <p className="dash-stat-value">{item.value}</p>
              <p className="dash-stat-note">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 14 }}
                >
                  {item.noteIcon}
                </span>
                {item.note}
              </p>
            </div>

            <span className="material-symbols-outlined dash-stat-icon">
              {item.icon}
            </span>
          </div>
        ))}
      </section>

      <section className="dash-grid">
        <div>
          <div className="dash-section-head">
            <div className="dash-section-head-left">
              <div className="dash-section-bar" />
              <h3 className="dash-section-title">Regional Performance</h3>
            </div>

            <Link to="/admin/voters" className="dash-section-link">
              View All Regions
            </Link>
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Province / City</th>
                  <th>Reg. Progress</th>
                  <th>Voter Count</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {regions.map((region) => (
                  <tr key={region.name}>
                    <td>
                      <p className="dash-region-name">{region.name}</p>
                      <p className="dash-region-sub">{region.sub}</p>
                    </td>

                    <td>
                      <div className="dash-progress-track">
                        <div
                          className="dash-progress-fill"
                          style={{ width: `${region.progress}%` }}
                        />
                      </div>
                      <span className="dash-progress-text">
                        {region.progress}%
                      </span>
                    </td>

                    <td style={{ fontWeight: 700 }}>{region.voters}</td>

                    <td>
                      <span className="dash-status-badge">{region.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dash-side-stack">
          <div>
            <div className="dash-section-head">
              <div className="dash-section-head-left">
                <div className="dash-section-bar" />
                <h3 className="dash-section-title">Quick Console</h3>
              </div>
            </div>

            <div className="dash-console-wrap">
              {consoles.map((item) => (
                <Link
                  key={item.titleEn}
                  to={item.to}
                  className={`dash-console ${
                    item.featured ? "featured" : "normal"
                  }`}
                >
                  <div>
                    <p className="dash-console-t1">{item.titleKh}</p>
                    <p className="dash-console-t2">{item.titleEn}</p>
                  </div>

                  <div className="dash-console-icon">
                    <span className="material-symbols-outlined">
                      {item.icon}
                    </span>
                  </div>

                  {item.featured ? (
                    <span className="material-symbols-outlined dash-console-bg">
                      ballot
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>

          <div className="dash-seal">
            <div className="dash-seal-icon">
              <span className="material-symbols-outlined">shield</span>
            </div>

            <p className="dash-seal-title">Authenticated Session</p>
            <p className="dash-seal-sub">Administrator #KH-9921-X-SEC</p>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}