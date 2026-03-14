import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

export default function AdminDashboard() {
  const nav = useNavigate();

  const logout = () => {
    localStorage.removeItem("admin_token");
    nav("/admin/login", { replace: true });
  };

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h3 className="mb-1"> Admin Dashboard</h3>
          <div className="text-muted">Choose what you want to manage.</div>
        </div>

        <button className="btn btn-outline-danger" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5>🗳️ Elections Console</h5>
              <div className="text-muted mb-3">
                Create draft election, add candidates, set period, monitor report.
              </div>
              <Link className="btn btn-primary" to="/admin/elections">
                Open Elections
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5>🪪 Voters Management</h5>
              <div className="text-muted mb-3">
                View/edit voter records and ID card details.
              </div>
              <Link className="btn btn-primary" to="/admin/voters">
                Open Voters
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}