import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  API_URL,
  clearAdminSession,
  saveAdminSession,
} from "../../utils/adminAuth";

export default function AdminLogin() {
  const nav = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("login"); // "login" | "forgot" | "reset"
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [forgotEmail, setForgotEmail] = useState("");

  const [resetForm, setResetForm] = useState({
    email: "",
    resetId: "",
    otp: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      nav("/admin", { replace: true });
    }
  }, [nav]);

  const logout = () => {
    clearAdminSession();
    setMsg({ type: "info", text: "Logged out." });
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setMsg(null);

    const username = String(loginForm.username || "").trim();
    const password = String(loginForm.password || "");

    if (!username || !password) {
      setMsg({
        type: "danger",
        text: "Please enter username/email and password.",
      });
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(`${API_URL}/admin/login`, {
        username,
        password,
      });

      const token = res.data?.token;
      if (!token) {
        throw new Error("No admin token returned from server");
      }

      saveAdminSession({
        token,
        admin: res.data?.admin || null,
      });

      setMsg({ type: "success", text: "Login success. Redirecting..." });

      const from = location.state?.from;
      const goTo =
        typeof from === "string"
          ? from
          : from?.pathname
          ? from.pathname
          : "/admin";

      nav(goTo, { replace: true });
    } catch (err) {
      console.error("Admin login error:", err);
      setMsg({
        type: "danger",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Admin login failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setMsg(null);

    const email = String(forgotEmail || "").trim().toLowerCase();

    if (!email) {
      setMsg({ type: "danger", text: "Please enter your admin email." });
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(`${API_URL}/admin/forgot-password`, {
        email,
      });

      const resetId = res.data?.resetId || "";

      setMsg({
        type: "success",
        text:
          res.data?.message ||
          "If the account exists, a reset code was sent to your email.",
      });

      setResetForm((prev) => ({
        ...prev,
        email,
        resetId: resetId || prev.resetId,
      }));

      setMode("reset");
    } catch (err) {
      console.error("Forgot password error:", err);
      setMsg({
        type: "danger",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Request failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setMsg(null);

    const email = String(resetForm.email || "").trim().toLowerCase();
    const resetId = String(resetForm.resetId || "").trim();
    const otp = String(resetForm.otp || "").trim();
    const new_password = String(resetForm.new_password || "");
    const confirm_password = String(resetForm.confirm_password || "");

    if (!email || !resetId || !otp || !new_password || !confirm_password) {
      setMsg({ type: "danger", text: "Please fill all reset fields." });
      return;
    }

    if (new_password.length < 8) {
      setMsg({
        type: "danger",
        text: "Password must be at least 8 characters.",
      });
      return;
    }

    if (new_password !== confirm_password) {
      setMsg({ type: "danger", text: "Passwords do not match." });
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(`${API_URL}/admin/reset-password`, {
        email,
        resetId,
        otp,
        new_password,
      });

      setMsg({
        type: "success",
        text: res.data?.message || "Password reset successful.",
      });

      setMode("login");
      setShowPw(false);
      setLoginForm({
        username: email,
        password: "",
      });
    } catch (err) {
      console.error("Reset password error:", err);
      setMsg({
        type: "danger",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Reset failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const tokenExists = Boolean(localStorage.getItem("admin_token"));

  return (
    <div className="nec-fullbleed">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        :root{
          --navPrimary:#003366;
          --primary:#1a3b60;
          --accent:#d4af37;
          --bg:#f6f7f8;
          --border:#e2e8f0;
        }

        .nec-fullbleed{
          width:100vw;
          margin-left:calc(50% - 50vw);
          margin-right:calc(50% - 50vw);
          min-height:100vh;
          background:var(--bg);
          overflow-x:hidden;
          font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
          color:#0f172a;
        }

        .nec-fullbleed a{ text-decoration:none !important; }
        .nec-fullbleed input, .nec-fullbleed button{ box-shadow:none !important; outline:none !important; }
        .nec-fullbleed input:focus{ box-shadow:none !important; }

        .material-symbols-outlined{
          font-variation-settings:'FILL' 0,'wght' 650,'GRAD' 0,'opsz' 24;
          line-height:1;
          vertical-align:middle;
        }

        .kh-nav{
          position: sticky;
          top:0;
          z-index:50;
          background: var(--navPrimary);
          border-bottom:1px solid rgba(226,232,240,0.22);
          box-shadow: 0 10px 24px rgba(15,23,42,0.18);
        }
        .kh-nav-inner{
          max-width:1200px;
          margin:0 auto;
          padding: 12px 18px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
        }
        .kh-links{
          display:flex;
          align-items:center;
          gap:40px;
          flex-wrap:wrap;
        }
        .kh-a{
          color: rgba(255,255,255,0.90) !important;
          font-weight:900;
          font-size:12px;
          letter-spacing:.08em;
          text-transform:uppercase;
          display:flex;
          align-items:center;
          gap:8px;
        }
        .kh-a:hover{ color: var(--accent) !important; }
        .kh-adminBtn{
          display:inline-flex;
          align-items:center;
          gap:10px;
          padding: 8px 14px;
          border-radius: 6px;
          border: 1px solid rgba(212,175,55,0.55);
          color: var(--accent) !important;
          font-weight:900;
          font-size:12px;
          letter-spacing:.08em;
          text-transform:uppercase;
          background: rgba(255,255,255,0.04);
          white-space:nowrap;
        }
        .kh-adminBtn:hover{ color:#fff !important; border-color: rgba(255,255,255,0.35); }

        .main{
          padding: 56px 16px 64px;
          display:flex;
          justify-content:center;
        }
        .center{
          width:100%;
          max-width: 980px;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap: 22px;
        }

        .hero{
          text-align:center;
        }
        .heroBadge{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding: 14px;
          border-radius: 999px;
          background:#fff;
          border:1px solid rgba(212,175,55,0.20);
          box-shadow: 0 14px 26px rgba(15,23,42,0.12);
          margin-bottom: 14px;
        }
        .heroBadge img{ width: 92px; height: 92px; object-fit:contain; }
        .hero h2{
          margin:0;
          font-size: 34px;
          font-weight: 900;
          color: var(--primary);
          letter-spacing: -0.02em;
        }
        .hero small{
          display:block;
          margin-top: 6px;
          font-size: 12px;
          font-weight: 800;
          color:#64748b;
          letter-spacing: .22em;
          text-transform: uppercase;
        }

        .card{
          width:100%;
          max-width: 420px;
          background:#fff;
          border:1px solid var(--border);
          border-radius: 16px;
          overflow:hidden;
          box-shadow: 0 30px 46px rgba(15,23,42,0.18);
        }

        .cardHead{
          padding: 18px 22px;
          background:#f8fafc;
          border-bottom:1px solid var(--border);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }
        .cardHeadTitle{
          font-weight: 900;
          color: var(--primary);
          display:flex;
          align-items:center;
          gap:10px;
        }
        .logoutBtn{
          border:1px solid rgba(15,23,42,0.15);
          background:#fff;
          border-radius:10px;
          padding: 8px 12px;
          font-weight: 900;
          font-size: 12px;
          cursor:pointer;
        }
        .logoutBtn:hover{ border-color: rgba(26,59,96,0.35); color: var(--primary); }

        .body{ padding: 22px; }

        .alert{
          display:flex; gap:10px; align-items:flex-start;
          padding: 12px 12px;
          border:1px solid rgba(15,23,42,0.10);
          border-radius: 12px;
          margin-bottom: 14px;
          background:#fff;
        }
        .alert.success{ border-left:4px solid #16a34a; }
        .alert.danger{ border-left:4px solid #ef4444; }
        .alert.info{ border-left:4px solid #3b82f6; }
        .alertText{ font-size:13px; font-weight:700; line-height:1.45; }

        .title{
          margin:0 0 14px 0;
          font-size: 18px;
          font-weight: 900;
          color:#0f172a;
        }
        .title span{
          font-weight: 600;
          color:#94a3b8;
          font-size: 12px;
          margin-left: 8px;
        }

        .field{ margin-bottom: 14px; }
        .label{
          display:block;
          font-size: 13px;
          font-weight: 800;
          color:#334155;
          margin-bottom: 6px;
        }

        .inputWrap{ position:relative; }
        .icon{
          position:absolute; left:12px; top:50%;
          transform: translateY(-50%);
          color:#94a3b8;
        }
        .input{
          width:100%;
          height:44px;
          border-radius: 12px;
          border: 1px solid rgba(148,163,184,0.55) !important;
          background:#fff !important;
          padding: 0 14px 0 40px;
          font-size: 14px;
          font-weight: 600;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .input:focus{
          border-color: rgba(26,59,96,0.85) !important;
          box-shadow: 0 0 0 4px rgba(26,59,96,0.12) !important;
        }

        .eye{
          position:absolute; right:10px; top:50%;
          transform: translateY(-50%);
          border:none; background:transparent;
          color:#94a3b8; cursor:pointer;
        }
        .eye:hover{ color:#64748b; }

        .row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin: 10px 0 14px;
          color:#64748b;
          font-size: 12px;
          font-weight: 700;
          flex-wrap: wrap;
        }
        .remember{ display:flex; align-items:center; gap:8px; }

        .submit{
          width:100%;
          height:48px;
          border:none;
          border-radius:12px;
          background: var(--primary);
          color:#fff;
          font-weight: 900;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          box-shadow: 0 18px 26px rgba(26,59,96,0.18);
          border-bottom: 4px solid rgba(212,175,55,0.45);
          transition: transform .05s ease, filter .15s ease;
        }
        .submit:hover{ filter: brightness(1.02); }
        .submit:active{ transform: translateY(1px); border-bottom-width:0; }
        .submit:disabled{ opacity:.7; cursor:not-allowed; }

        .textLink{
          border: none;
          background: transparent;
          padding: 0;
          color: var(--primary);
          font-weight: 900;
          cursor: pointer;
          text-decoration: underline;
        }
        .textLink:disabled{ opacity: .6; cursor: not-allowed; }

        .cardFoot{
          padding: 14px 22px;
          background:#f8fafc;
          border-top: 1px solid rgba(226,232,240,1);
          display:flex;
          gap:10px;
          align-items:flex-start;
        }
        .cardFoot p{
          margin:0;
          font-size: 10px;
          font-weight: 800;
          color:#64748b;
          letter-spacing:.08em;
          text-transform: uppercase;
          line-height: 1.4;
        }

        .footer{
          border-top:1px solid rgba(226,232,240,1);
          padding: 20px 24px;
          text-align:center;
          color:#64748b;
          font-weight:700;
          font-size: 12px;
        }
      `}</style>

      <div className="kh-nav">
        <div className="kh-nav-inner">
          <div className="kh-links">
            <Link className="kh-a" to="/">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                home
              </span>
              HOME
            </Link>
            <Link className="kh-a" to="/official-voter-search">
              VERIFY STATUS
            </Link>
            <Link className="kh-a" to="/polling-stations">
              POLLING STATIONS
            </Link>
          </div>

          <Link className="kh-adminBtn" to="/">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              how_to_reg
            </span>
            VOTER PORTAL
          </Link>
        </div>
      </div>

      <main className="main">
        <div className="center">
          <div className="hero">
            <div className="heroBadge">
              <img
                alt="Royal Coat of Arms of Cambodia"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBD41NCyIlnRV76Wadg4GjEgCHOulWCPtYSzHynKllmIoVkdfbmfjLQConxEnDGv4AEwg2wtA587t6uILBhcS2_AVv_ClIoXwj9WwgICFTytCjE3uSkXhyGLUGswEJ3_Mgh_rj-UXCemcRIrFtF6yjW5smTFr10sOpWA9D7dNIJ1s4sF1gx8Z3VJFSJLRrlOSRkt0ZOB_PGFZflsOQYubzYYNNyt0UR-71offiId9j5mbAvn_-Nfr8j8lwPGvke4klG5Nygti0R9Svo"
              />
            </div>
            <h2>KampuVote</h2>
            <small>Nation • Religion • King</small>
          </div>

          <div className="card">
            <div className="cardHead">
              <div className="cardHeadTitle">
                <span className="material-symbols-outlined">
                  admin_panel_settings
                </span>
                {mode === "login"
                  ? "Admin Login"
                  : mode === "forgot"
                  ? "Forgot Password"
                  : "Reset Password"}
              </div>

              {tokenExists ? (
                <button
                  className="logoutBtn"
                  type="button"
                  onClick={logout}
                  disabled={loading}
                >
                  Logout
                </button>
              ) : null}
            </div>

            <div className="body">
              <h3 className="title">
                System Access <span>ច្រកចូលប្រព័ន្ធ</span>
              </h3>

              {msg && (
                <div className={`alert ${msg.type}`}>
                  <span className="material-symbols-outlined">
                    {msg.type === "success"
                      ? "verified"
                      : msg.type === "info"
                      ? "info"
                      : "error"}
                  </span>
                  <div className="alertText">{msg.text}</div>
                </div>
              )}

              {mode === "login" && (
                <form onSubmit={submitLogin}>
                  <div className="field">
                    <label className="label">
                      Username / ឈ្មោះអ្នកប្រើប្រាស់
                    </label>
                    <div className="inputWrap">
                      <span className="material-symbols-outlined icon">person</span>
                      <input
                        className="input"
                        value={loginForm.username}
                        onChange={(e) =>
                          setLoginForm((prev) => ({
                            ...prev,
                            username: e.target.value,
                          }))
                        }
                        placeholder="Enter username or email"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Password / ពាក្យសម្ងាត់</label>
                    <div className="inputWrap">
                      <span className="material-symbols-outlined icon">lock</span>
                      <input
                        className="input"
                        type={showPw ? "text" : "password"}
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        placeholder="••••••••"
                        disabled={loading}
                        style={{ paddingRight: 44 }}
                      />
                      <button
                        type="button"
                        className="eye"
                        onClick={() => setShowPw((s) => !s)}
                        disabled={loading}
                        aria-label="Toggle password visibility"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 18 }}
                        >
                          {showPw ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="row">
                    <label className="remember">
                      <input type="checkbox" disabled={loading} />
                      <span>Remember me / ចងចាំខ្ញុំ</span>
                    </label>

                    <button
                      type="button"
                      className="textLink"
                      onClick={() => {
                        setMsg(null);
                        setMode("forgot");
                      }}
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button className="submit" disabled={loading}>
                    <span>{loading ? "Signing in..." : "Sign In / ចូលប្រព័ន្ធ"}</span>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18 }}
                    >
                      login
                    </span>
                  </button>

                  <div
                    className="row"
                    style={{ marginTop: 12, justifyContent: "flex-end" }}
                  >
                    <span style={{ fontSize: 11, opacity: 0.9 }}>
                      API: {API_URL}
                    </span>
                  </div>
                </form>
              )}

              {mode === "forgot" && (
                <form onSubmit={submitForgot}>
                  <div className="field">
                    <label className="label">Admin Email</label>
                    <div className="inputWrap">
                      <span className="material-symbols-outlined icon">mail</span>
                      <input
                        className="input"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="admin@example.com"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <button className="submit" disabled={loading}>
                    <span>{loading ? "Sending..." : "Send OTP Code"}</span>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18 }}
                    >
                      send
                    </span>
                  </button>

                  <div className="row" style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="textLink"
                      onClick={() => {
                        setMsg(null);
                        setMode("login");
                      }}
                      disabled={loading}
                    >
                      Back to login
                    </button>

                    <button
                      type="button"
                      className="textLink"
                      onClick={() => {
                        setMsg(null);
                        setMode("reset");
                      }}
                      disabled={loading}
                    >
                      Already have OTP? Reset
                    </button>
                  </div>
                </form>
              )}

              {mode === "reset" && (
                <form onSubmit={submitReset}>
                  <div className="field">
                    <label className="label">Email</label>
                    <div className="inputWrap">
                      <span className="material-symbols-outlined icon">mail</span>
                      <input
                        className="input"
                        type="email"
                        value={resetForm.email}
                        onChange={(e) =>
                          setResetForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="admin@example.com"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Reset ID</label>
                    <div className="inputWrap">
                      <span className="material-symbols-outlined icon">key</span>
                      <input
                        className="input"
                        value={resetForm.resetId}
                        onChange={(e) =>
                          setResetForm((prev) => ({
                            ...prev,
                            resetId: e.target.value,
                          }))
                        }
                        placeholder="from email"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">OTP Code (6 digits)</label>
                    <div className="inputWrap">
                      <span className="material-symbols-outlined icon">pin</span>
                      <input
                        className="input"
                        value={resetForm.otp}
                        onChange={(e) =>
                          setResetForm((prev) => ({
                            ...prev,
                            otp: e.target.value,
                          }))
                        }
                        placeholder="123456"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">New Password</label>
                    <div className="inputWrap">
                      <span className="material-symbols-outlined icon">
                        lock_reset
                      </span>
                      <input
                        className="input"
                        type="password"
                        value={resetForm.new_password}
                        onChange={(e) =>
                          setResetForm((prev) => ({
                            ...prev,
                            new_password: e.target.value,
                          }))
                        }
                        placeholder="min 8 chars"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Confirm New Password</label>
                    <div className="inputWrap">
                      <span className="material-symbols-outlined icon">
                        check_circle
                      </span>
                      <input
                        className="input"
                        type="password"
                        value={resetForm.confirm_password}
                        onChange={(e) =>
                          setResetForm((prev) => ({
                            ...prev,
                            confirm_password: e.target.value,
                          }))
                        }
                        placeholder="repeat password"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <button className="submit" disabled={loading}>
                    <span>{loading ? "Resetting..." : "Reset Password"}</span>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18 }}
                    >
                      published_with_changes
                    </span>
                  </button>

                  <div className="row" style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="textLink"
                      onClick={() => {
                        setMsg(null);
                        setMode("login");
                      }}
                      disabled={loading}
                    >
                      Back to login
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="cardFoot">
              <span
                className="material-symbols-outlined"
                style={{ color: "var(--accent)" }}
              >
                verified_user
              </span>
              <p>
                This is a secure government system. Unauthorized access is
                strictly prohibited and subject to legal action.
              </p>
            </div>
          </div>
        </div>
      </main>

      <div className="footer">
        © 2026 National Election Committee. All rights reserved.
      </div>
    </div>
  );
}