import { Link } from "react-router-dom";

export default function NecHeader() {
  return (
    <>
      {/* Royal Header */}
      <div className="royalHeader">
        <div className="wrap">
          <div className="royalRow">

            {/* LEFT */}
            <div className="royalLeft">
              <div className="coat">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAq5wOmTbLSzE_TUi9hbMtJxLBpV2Jq90llP65r01DSxP_KremgONUoLSe0i11vLlwUCBGsNgt5ao0ig41EsWGHzpca3c2wlZFcVOh7VL5cYrGtrd8RjDnFV2w8xiqbIG4TsGBpdFQi0mWQ6F1NFrMS4ERz7iXpVOeFTzJTmP9bmEyfEeQ5uzwoIFS7oh-NGtK2wP6ICnF82NzT7vWteVp_adRUSA6e5KGJ-mxG9KnBDkcZMyV-05mHK1nKmFyOMSFnxtIQ5Oo7fgv9"
                  alt="Royal Coat"
                />
              </div>

              <div className="royalText">
                <p className="khmer-motto kh1">ព្រះរាជាណាចក្រកម្ពុជា</p>
                <p className="khmer-motto kh2">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>

                <div className="line"></div>

                <div className="en1">KINGDOM OF CAMBODIA</div>
                <div className="en2">NATION RELIGION KING</div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="royalRight">

              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0KXjqArMbqW4FsyuntrHVomZmRCf_MFlpDeyXXl739VCWCs7hjsm9iNPjWksyukwXOUBGbQJvzaZ8GHe1CbQupXmwNq54QxzMIBIlChN6ndVtUeVxY-p4CIT9O5wktdQL6HE4abg1w2ZCuEuSSC3n1Nt2mw_LLRkPWgnoc3iiCXFZDJ5pE0FqAkSYZfzCbWtUXdefEEe-x95MxDDPux6gt2XsDUeqM-C-ScMp3QWUYTUvdrbL32QSGJF_eaeeuUs-DtA8u8tr_PsJ"
                  alt="Cambodia Flag"
                />
              </div>

              <div className="necName">
                <div className="enTitle">
                  NATIONAL ELECTION COMMITTEE
                </div>

                <div className="khTitle khmer-motto">
                  គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត (គ.ជ.ប)
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <div className="navBar">
        <div className="wrap">
          <div className="navInner">

            <nav className="navLinks">

              <Link className="navA" to="/">
                <span className="material-symbols-outlined" style={{fontSize:18}}>
                  home
                </span>
                HOME
              </Link>

              <Link className="navA muted" to="/official-voter-search">
                ស្វែងរកឈ្មោះក្នុងបញ្ជីបោះឆ្នោតផ្លូវការ
              </Link>
              <Link className="navA muted" to="/track-document-request">
                តាមដានដំណើរការស្នើសុំផ្លាស់ប្ដូរឯកសារ
              </Link>

            </nav>

            <div className="navRight">
              <div className="divider"></div>

              <Link to="/admin/login" className="adminBtn">
                <span className="material-symbols-outlined" style={{fontSize:20}}>
                  admin_panel_settings
                </span>
                ADMIN LOGIN
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}