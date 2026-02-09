// src/RegisterRequestToken.jsx
import { useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

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

  const [msg, setMsg] = useState(null); // {type:'success'|'danger'|'info', text:string}
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
      fd.append("id_card_image", file); // ✅ must match backend field name

      const res = await axios.post(`${API_URL}/register-request-token`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg({
        type: "success",
        text: `${res.data?.message || "Success"}${res.data?.tx_hash ? ` (TX: ${res.data.tx_hash})` : ""}`,
      });
    } catch (err) {
      setMsg({
        type: "danger",
        text: err?.response?.data?.message || err.message || "Request failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h3 className="mb-1">🪪 Voter Registration</h3>
          <div className="text-muted">
            Fill your ID info + phone/email. If valid (age ≥ 18 & not expired), blockchain will generate a token and email it to you.
          </div>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type} shadow-sm`}>{msg.text}</div>}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={submit} className="row g-3">
            {/* ID number */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">ID Number</label>
              <input
                className="form-control"
                name="id_number"
                value={f.id_number}
                onChange={onChange}
                placeholder="e.g. 1234567890"
                required
              />
            </div>

            {/* Phone */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Phone</label>
              <input
                className="form-control"
                name="phone"
                value={f.phone}
                onChange={onChange}
                placeholder="e.g. 012345678"
                required
              />
            </div>

            {/* Name KH */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Name (KH)</label>
              <input
                className="form-control"
                name="name_kh"
                value={f.name_kh}
                onChange={onChange}
                placeholder="e.g. កែវ ដារ៉ា"
                required
              />
            </div>

            {/* Name EN */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Name (EN)</label>
              <input
                className="form-control"
                name="name_en"
                value={f.name_en}
                onChange={onChange}
                placeholder="e.g. KEO DARA"
                required
              />
            </div>

            {/* Email */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Email</label>
              <input
                className="form-control"
                type="email"
                name="email"
                value={f.email}
                onChange={onChange}
                placeholder="e.g. you@gmail.com"
                required
              />
              <div className="form-text">
                Token will be sent to this email.
              </div>
            </div>

            {/* Upload */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Upload ID Card Image</label>
              <input
                className="form-control"
                type="file"
                accept="image/*"
                onChange={onPickFile}
                required
              />
              <div className="form-text">JPG/PNG up to 6MB.</div>
            </div>

            {/* Preview */}
            <div className="col-12">
              <div className="border rounded-3 p-3 bg-light">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-semibold">ID Card Preview</div>
                  {preview && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setFile(null);
                        if (preview) URL.revokeObjectURL(preview);
                        setPreview(null);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="mt-3" style={{ minHeight: 120 }}>
                  {preview ? (
                    <img
                      src={preview}
                      alt="preview"
                      style={{
                        width: "100%",
                        maxHeight: 280,
                        objectFit: "contain",
                        borderRadius: 10,
                      }}
                    />
                  ) : (
                    <div className="text-muted">No image selected.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="col-12 d-flex gap-2">
              <button className="btn btn-success flex-grow-1" disabled={loading}>
                {loading ? "Processing..." : "Confirm & Send Token"}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={reset}
                disabled={loading}
              >
                Reset
              </button>
            </div>

            {/* Small note */}
            <div className="col-12">
              <div className="small text-muted">
                Note: Your input name must match the voter database exactly. If valid, you will receive a blockchain-generated token by email.
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-3 text-muted small">
        Endpoint: <code>{API_URL}/register-request-token</code> (multipart/form-data)
      </div>
    </div>
  );
}
