import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "#f8f9fa",
      }}
    >
      <div className="card border-0 shadow-sm" style={{ width: "100%", maxWidth: 520 }}>
        <div className="card-body p-4 p-md-5 text-center">
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-4"
            style={{
              width: 72,
              height: 72,
              background: "rgba(13,110,253,0.10)",
              border: "1px solid rgba(13,110,253,0.20)",
            }}
          >
            <span style={{ fontSize: 30 }}>⚠️</span>
          </div>
          <div className="text-muted fw-semibold mb-1">KampuVote</div>
          <h1 className="display-5 fw-bold mb-1">404</h1>
          <div className="h5 fw-semibold mb-2">Page not found</div>
          <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
            <button className="btn btn-outline-secondary px-4" onClick={() => navigate(-1)}>
              Go Back
            </button>
            <Link className="btn btn-primary px-4" to="/">
              Registration
            </Link>
            <Link className="btn btn-outline-dark px-4" to="/admin/login">
              Admin Login
            </Link>
          </div>
          <div className="mt-4 pt-3 border-top small text-muted">
          </div>
        </div>
      </div>
    </div>
  );
}