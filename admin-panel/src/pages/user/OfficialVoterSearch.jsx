import { useMemo, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";
import NecHeader from "../../components/NecHeader";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const PROVINCES = [
  "ភ្នំពេញ",
  "បន្ទាយមានជ័យ",
  "បាត់ដំបង",
  "កំពង់ចាម",
  "កំពង់ឆ្នាំង",
  "កំពង់ស្ពឺ",
  "កំពង់ធំ",
  "កំពត",
  "កណ្ដាល",
  "កោះកុង",
  "ក្រចេះ",
  "មណ្ឌលគិរី",
  "ឧត្តរមានជ័យ",
  "ប៉ៃលិន",
  "ព្រះសីហនុ",
  "ព្រះវិហារ",
  "ព្រៃវែង",
  "ពោធិ៍សាត់",
  "រតនគិរី",
  "សៀមរាប",
  "ស្ទឹងត្រែង",
  "ស្វាយរៀង",
  "តាកែវ",
  "ត្បូងឃ្មុំ",
  "កែប",
];

const DISTRICT_HINTS = {
  "ភ្នំពេញ": ["ដូនពេញ", "ចំការមន", "៧មករា", "ទួលគោក", "ដង្កោ", "មានជ័យ", "ឫស្សីកែវ", "សែនសុខ"],
  "បន្ទាយមានជ័យ": ["មង្គលបុរី", "ព្រះនេត្រព្រះ", "សិរីសោភ័ណ្ឌ", "ថ្មពួក", "ភ្នំស្រុក", "ម៉ាឡៃ", "អូរជ្រៅ", "ស្វាយចេក"],
  "បាត់ដំបង": ["បាត់ដំបង", "សង្កែ", "ថ្មគោល", "បាណន់", "រុក្ខគិរី", "មោងឫស្សី"],
  "សៀមរាប": ["សៀមរាប", "ពួក", "សូទ្រនិគម", "ប្រាសាទបាគង", "អង្គរធំ"],
  "កណ្ដាល": ["តាខ្មៅ", "កៀនស្វាយ", "ស្អាង", "ល្វាឯម", "ខ្សាច់កណ្ដាល", "ពញាឮ"],
};

function toKhGender(value) {
  const v = String(value || "").trim().toLowerCase();
  if (["m", "male", "ប្រុស"].includes(v)) return "ប្រុស";
  if (["f", "female", "ស្រី"].includes(v)) return "ស្រី";
  return value || "—";
}

function calcAgeFromIso(dobIso) {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

function parseDDMMYYYY(value) {
  const v = String(value || "").trim();
  if (!v) return null;

  const parts = v.split(/[./-]/);
  if (parts.length !== 3) return null;

  const [dd, mm, yyyy] = parts;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isExpiredCard(row) {
  const exp = parseDDMMYYYY(row?.expiry_date);
  if (!exp) return false;
  return exp.getTime() < Date.now();
}

function getVoterStatus(row) {
  const age = calcAgeFromIso(row?.dob_iso);

  if (age !== null && age < 18) {
    return { text: "មិនទាន់គ្រប់អាយុ", type: "underage" };
  }

  if (isExpiredCard(row)) {
    return { text: "ហួសសុពលភាព", type: "expired" };
  }

  if (row?.is_valid_voter === 1 || row?.is_valid_voter === true) {
    return { text: "មានសិទ្ធិបោះឆ្នោត", type: "valid" };
  }

  if (row?.is_valid_voter === 0 || row?.is_valid_voter === false) {
    return { text: "មិនមានសិទ្ធិបោះឆ្នោត", type: "invalid" };
  }

  return { text: "—", type: "unknown" };
}

function safeText(v) {
  return v && String(v).trim() ? String(v) : "—";
}

function formatDob(row) {
  if (row?.dob_display) return row.dob_display;

  if (row?.dob_iso) {
    const d = new Date(row.dob_iso);
    if (!Number.isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
  }

  return "—";
}

export default function OfficialVoterSearch() {
  const [form, setForm] = useState({
    province: "",
    district: "",
    lastName: "",
    firstName: "",
  });

  const [rows, setRows] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const districtOptions = useMemo(() => {
    return DISTRICT_HINTS[form.province] || [];
  }, [form.province]);

  const onChange = (e) => {
    const { name, value } = e.target;

    if (name === "province") {
      setForm((p) => ({
        ...p,
        province: value,
        district: "",
      }));
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  };

  const onReset = () => {
    setForm({
      province: "",
      district: "",
      lastName: "",
      firstName: "",
    });
    setRows([]);
    setSearched(false);
    setMsg(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!form.lastName.trim() && !form.firstName.trim()) {
      setMsg({
        type: "danger",
        text: "សូមបញ្ចូល នាមត្រកូល ឬ នាមខ្លួន យ៉ាងហោចណាស់មួយ។",
      });
      return;
    }

    try {
      setLoading(true);
      setSearched(true);

      const res = await axios.post(`${API_URL}/official-voter-search`, {
        province: form.province.trim(),
        district: form.district.trim(),
        lastName: form.lastName.trim(),
        firstName: form.firstName.trim(),
      });

      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setRows(items);

      if (!items.length) {
        setMsg({
          type: "danger",
          text: "រកមិនឃើញទិន្នន័យដែលត្រូវគ្នាទេ។",
        });
      } else {
        setMsg({
          type: "success",
          text: `រកឃើញទិន្នន័យចំនួន ${items.length} នាក់`,
        });
      }
    } catch (err) {
      const data = err?.response?.data;
      setRows([]);
      setMsg({
        type: "danger",
        text: data?.message || err.message || "Search failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NecHeader />

      <div className="ovs-page">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Kantumruy+Pro:wght@300;400;500;600;700&display=swap');

          .ovs-page{
            --primary:#0b3b78;
            --border:#d7dde8;
            --text:#0f172a;
            --muted:#64748b;
            --bg:#f5f7fb;
            --danger:#c62828;
            --success:#15803d;

            width:100vw;
            margin-left:calc(50% - 50vw);
            margin-right:calc(50% - 50vw);
            min-height:100vh;
            background:var(--bg);
            color:var(--text);
            font-family:Inter,"Kantumruy Pro",system-ui,sans-serif;
          }

          .ovs-page *, .ovs-page *::before, .ovs-page *::after{
            box-sizing:border-box;
          }

          .kh{
            font-family:"Kantumruy Pro", Inter, sans-serif;
          }

          .wrap{
            max-width:1420px;
            margin:0 auto;
            padding:0 18px;
          }

          .topNotice{
            background:#fff;
            border-bottom:1px solid #d9dee8;
            color:#d62828;
            font-weight:700;
            font-size:15px;
            line-height:1.6;
            padding:12px 0;
          }

          .heroTitle{
            padding:16px 14px;
            font-size:16px;
          }

          .topNav{
            background:#fff;
            border:1px solid var(--border);
            border-bottom:none;
            display:flex;
            flex-wrap:wrap;
          }

          .navTab{
            padding:10px 16px;
            color:#2660a8;
            font-size:15px;
            font-weight:700;
            border-right:1px solid var(--border);
          }

          .navTab.active{
            background:#f7fbff;
          }

          .card{
            background:#fff;
            border:1px solid var(--border);
            box-shadow:0 8px 24px rgba(15,23,42,.05);
            overflow:hidden;
          }

          .searchArea{
            padding:22px 22px 10px;
          }

          .desc{
            font-size:15px;
            font-weight:700;
            margin-bottom:18px;
          }

          .required{
            color:#d62828;
          }

          .formGrid{
            display:grid;
            grid-template-columns: 200px 1fr 200px 1fr;
            gap:10px 14px;
            align-items:center;
          }

          .lbl{
            font-size:18px;
            font-weight:700;
            text-align:right;
            padding-right:4px;
          }

          .field{
            width:100%;
            height:36px;
            border:1px solid #cfd7e6;
            border-radius:4px;
            background:#fff;
            padding:0 10px;
            font-size:14px;
            font-weight:500;
          }

          .field:focus{
            border-color:#3b82f6;
            outline:none;
          }

          .btnRow{
            display:flex;
            justify-content:flex-end;
            gap:12px;
            margin-top:16px;
          }

          .btn{
            border:none;
            border-radius:4px;
            padding:8px 18px;
            font-size:14px;
            font-weight:700;
          }

          .btn.primary{
            background:#2b6cb0;
            color:#fff;
          }

          .btn.secondary{
            background:#e8edf6;
            color:#12345b;
          }

          .btn:disabled{
            opacity:.7;
            cursor:not-allowed;
          }

          .msg{
            margin-top:16px;
            padding:12px 14px;
            border-radius:6px;
            font-size:15px;
            font-weight:700;
          }

          .msg.success{
            background:#eefbf3;
            color:var(--success);
            border:1px solid #b7ebc6;
          }

          .msg.danger{
            background:#fff3f3;
            color:var(--danger);
            border:1px solid #f3c3c3;
          }

          .resultHead{
            margin-top:28px;
            background:#0b55a4;
            color:#fff;
            padding:14px 18px;
            font-size:20px;
            font-weight:800;
          }

          .tableWrap{
            overflow:auto;
            border-top:1px solid var(--border);
          }

          table{
            width:100%;
            min-width:1240px;
            border-collapse:collapse;
            background:#fff;
          }

          th, td{
            border:1px solid #d8dee8;
            padding:8px 8px;
            font-size:13px;
            vertical-align:middle;
          }

          th{
            background:#f4f6fa;
            font-weight:800;
            text-align:center;
            white-space:nowrap;
          }

          td{
            font-weight:600;
          }

          td.center{
            text-align:center;
          }

          .statusBadge{
            display:inline-block;
            min-width:110px;
            padding:6px 10px;
            font-size:13px;
            font-weight:800;
            border:1px solid transparent;
            border-radius:999px;
          }

          .statusBadge.valid{
            color:#15803d;
            background:#eefbf3;
            border-color:#b7ebc6;
          }

          .statusBadge.invalid{
            color:#b91c1c;
            background:#fff1f2;
            border-color:#fecdd3;
          }

          .statusBadge.underage{
            color:#92400e;
            background:#fff7ed;
            border-color:#fed7aa;
          }

          .statusBadge.expired{
            color:#ffffff;
            background:#ef1f1f;
            border-color:#d10000;
            box-shadow: inset 0 0 0 2px rgba(255,255,255,0.15);
          }

          .statusBadge.unknown{
            color:#475569;
            background:#f1f5f9;
            border-color:#cbd5e1;
          }

          .actionCell{
            text-align:center;
          }

          .docLink{
            display:inline-block;
            padding:8px 12px;
            border-radius:4px;
            background:#ef1f1f;
            color:#fff !important;
            font-size:12px;
            font-weight:800;
            text-decoration:none !important;
            line-height:1.1;
            white-space:nowrap;
          }

          .docLink:hover{
            background:#d81313;
            color:#fff !important;
          }

          .count{
            padding:18px;
            font-size:16px;
            font-weight:700;
          }

          .muted{
            color:var(--muted);
          }

          .topBar{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:14px;
            margin-bottom:14px;
            flex-wrap:wrap;
          }

          .homeLink{
            text-decoration:none !important;
            color:#0b3b78 !important;
            font-weight:800;
          }

          @media (max-width: 1100px){
            .formGrid{
              grid-template-columns: 1fr;
            }

            .lbl{
              font-size:14px;
              font-weight:700;
              text-align:left;
            }

            .heroTitle{
              min-width:unset;
              width:100%;
            }

            .btnRow{
              justify-content:flex-start;
            }
          }
        `}</style>

        <div className="topNotice kh">
          <div className="wrap">
            គ.ជ.ប៖ ប្រជាពលរដ្ឋអាចស្វែងរកឈ្មោះក្នុងបញ្ជីបោះឆ្នោតផ្លូវការតាមរយៈប្រព័ន្ធនេះបាន។
          </div>
        </div>

        <div className="wrap">
          <div className="topBar">
            <div className="heroTitle kh">ស្វែងរកឈ្មោះក្នុងបញ្ជីបោះឆ្នោតផ្លូវការ</div>

            <Link className="homeLink" to="/">
              ← ត្រឡប់ទៅទំព័រដើម
            </Link>
          </div>

          <div className="topNav">
            <div className="navTab active kh">ស្វែងរកតាមឈ្មោះ</div>
            <div className="navTab kh">ស្វែងរកតាមអត្តសញ្ញាណ</div>
            <div className="navTab kh">ស្វែងរកតាមលេខសន្លឹក និងមណ្ឌលបោះឆ្នោត</div>
          </div>

          <div className="card">
            <div className="searchArea">
              <div className="desc kh">
                សូមបំពេញព័ត៌មានខាងក្រោម <span className="required">(*)</span> ដើម្បីស្វែងរកឈ្មោះ
              </div>

              <form onSubmit={onSubmit}>
                <div className="formGrid">
                  <label className="lbl kh">រាជធានី/ខេត្ត</label>
                  <select
                    className="field kh"
                    name="province"
                    value={form.province}
                    onChange={onChange}
                  >
                    <option value="">-- ជ្រើសរើស --</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>

                  <label className="lbl kh">
                    នាមត្រកូល <span className="required">*</span>
                  </label>
                  <input
                    className="field kh"
                    name="lastName"
                    value={form.lastName}
                    onChange={onChange}
                    placeholder="ឧ. ហេង"
                  />

                  <label className="lbl kh">ក្រុង/ស្រុក/ខណ្ឌ</label>
                  <div>
                    <input
                      className="field kh"
                      name="district"
                      value={form.district}
                      onChange={onChange}
                      list="district-list"
                      placeholder="វាយឈ្មោះក្រុង/ស្រុក/ខណ្ឌ"
                    />
                    <datalist id="district-list">
                      {districtOptions.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>

                  <label className="lbl kh">
                    នាមខ្លួន <span className="required">*</span>
                  </label>
                  <input
                    className="field kh"
                    name="firstName"
                    value={form.firstName}
                    onChange={onChange}
                    placeholder="ឧ. សេងហ្គាន"
                  />
                </div>

                <div className="btnRow">
                  <button
                    type="button"
                    className="btn secondary kh"
                    onClick={onReset}
                    disabled={loading}
                  >
                    សម្អាត
                  </button>

                  <button type="submit" className="btn primary kh" disabled={loading}>
                    {loading ? "កំពុងស្វែងរក..." : "ស្វែងរក"}
                  </button>
                </div>
              </form>

              {msg && (
                <div className={`msg ${msg.type === "success" ? "success" : "danger"} kh`}>
                  {msg.text}
                </div>
              )}

              <div className="resultHead kh">លទ្ធផលនៃការស្វែងរក</div>

              <div className="tableWrap">
                <table>
                  <thead>
                    <tr className="kh">
                      <th>ល.រ.</th>
                      <th>លេខអត្តសញ្ញាណ</th>
                      <th>ឈ្មោះជាភាសាខ្មែរ</th>
                      <th>ឈ្មោះអង់គ្លេស</th>
                      <th>ភេទ</th>
                      <th>ថ្ងៃខែឆ្នាំកំណើត</th>
                      <th>ទីកន្លែងកំណើត</th>
                      <th>អាសយដ្ឋាន</th>
                      <th>ស្ថានភាព</th>
                      <th>សកម្មភាព</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!searched && (
                      <tr>
                        <td colSpan="10" className="center muted kh">
                          សូមបញ្ចូលព័ត៌មានស្វែងរក ហើយចុចប៊ូតុង ស្វែងរក
                        </td>
                      </tr>
                    )}

                    {searched && rows.length === 0 && (
                      <tr>
                        <td colSpan="10" className="center kh">
                          មិនមានទិន្នន័យ
                        </td>
                      </tr>
                    )}

                    {rows.map((r, idx) => {
                      const status = getVoterStatus(r);

                      return (
                        <tr key={r.uuid || `${r.id_number}-${idx}`}>
                          <td className="center">{r.voter_no ?? idx + 1}</td>
                          <td className="center">{safeText(r.id_number)}</td>
                          <td className="kh">{safeText(r.name_kh)}</td>
                          <td>{safeText(r.name_en)}</td>
                          <td className="center kh">{toKhGender(r.gender)}</td>
                          <td className="center">{formatDob(r)}</td>
                          <td className="kh">{safeText(r.pob)}</td>
                          <td className="kh">{safeText(r.address)}</td>
                          <td className="center">
                            <span className={`statusBadge ${status.type} kh`}>
                              {status.text}
                            </span>
                          </td>
                          <td className="actionCell">
                            {status.type === "expired" ? (
                              <Link
                                className="docLink kh"
                                to="/document-change-request"
                                state={{ voter: r }}
                              >
                                ស្នើសុំផ្លាស់ប្ដូរឯកសារ
                              </Link>
                            ) : (
                              <span className="muted kh">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="count kh">[ ចំនួនសរុប៖ {rows.length} ]</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}