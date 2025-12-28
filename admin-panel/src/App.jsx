import { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'react-qr-code';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_URL = 'http://localhost:3000/api';

function App() {
  const [voters, setVoters] = useState([]);
  const [editingVoter, setEditingVoter] = useState(null);
  const [viewingCard, setViewingCard] = useState(null);
  const [refresh, setRefresh] = useState(false);

  // hav voters
  useEffect(() => {
    axios
      .get(`${API_URL}/voters`)
      .then((res) => setVoters(res.data))
      .catch((err) => console.error(err));
  }, [refresh]);

  // Edit
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingVoter((prev) => ({ ...prev, [name]: value }));
  };

  // Submit 
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/voters/${editingVoter.uuid}`, editingVoter);
      setEditingVoter(null);
      setRefresh((r) => !r);
      alert('Voter updated successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to update.');
    }
  };

  const openEdit = (voter) => setEditingVoter({ ...voter });
  const openCard = (voter) => setViewingCard({ ...voter });

  return (
    <div className="container mt-4">
      <h1 className="mb-4 text-center">🗳️ Voting System Admin</h1>

      {/* edit*/}
      {editingVoter && (
        <div className="card mb-4 shadow p-3 bg-light">
          <h3>Edit Voter</h3>
          <form onSubmit={handleUpdate}>
            <div className="row">
              <div className="col-md-3">
                <label>ID Number</label>
                <input
                  className="form-control"
                  name="id_number"
                  value={editingVoter.id_number || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-md-3">
                <label>Name (EN)</label>
                <input
                  className="form-control"
                  name="name_en"
                  value={editingVoter.name_en || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-md-3">
                <label>Name (KH)</label>
                <input
                  className="form-control"
                  name="name_kh"
                  value={editingVoter.name_kh || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-md-3">
                <label>Gender</label>
                <select
                  className="form-control"
                  name="gender"
                  value={editingVoter.gender || 'M'}
                  onChange={handleInputChange}
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <button type="submit" className="btn btn-success me-2">
                Save Changes
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingVoter(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* id card popup */}
      {viewingCard && (
        <div style={styles.overlay}>
          <div style={styles.modalContent}>
            <h5 className="text-center mb-3 text-white">Digital ID Card</h5>

            <div style={styles.cardContainer}>
              {/* ID Number */}
              <div style={styles.idNumber}>{viewingCard.id_number}</div>

              {/* Main Content Row */}
              <div style={styles.mainRow}>
                {/* Col 1: Photo */}
                <div style={styles.photoBox}>
                  <img
                    src={
                      viewingCard.photo
                        ? `data:image/jpeg;base64,${String(viewingCard.photo).replace(
                            'data:image/jpeg;base64,',
                            ''
                          )}`
                        : 'https://via.placeholder.com/85x110'
                    }
                    alt="User"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '3px',
                    }}
                  />
                </div>

                <div style={styles.detailsCol}>
                  <div style={styles.textLine}>
                    <span style={styles.labelKh}>គោត្តនាម និងនាម: </span>
                    <span style={styles.valueKhBold}>{viewingCard.name_kh || ''}</span>
                  </div>

                  <div style={styles.textLine}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                      {viewingCard.name_en ? viewingCard.name_en.toUpperCase() : ''}
                    </span>
                  </div>

                  <div style={styles.textLine}>
                    <span style={styles.labelKh}>ថ្ងៃខែឆ្នាំកំណើត: </span>
                    <span style={{ ...styles.valueKhBold, marginRight: '6px' }}>
                      {viewingCard.dob_display || ''}
                    </span>

                    <span style={styles.labelKh}>ភេទ: </span>
                    <span style={{ ...styles.valueKhBold, marginRight: '6px' }}>
                      {viewingCard.gender || ''}
                    </span>

                    <span style={styles.labelKh}>កម្ពស់: </span>
                    <span style={styles.valueKhBold}>{(viewingCard.height || '170') + 'cm'}</span>
                  </div>

                  <div style={styles.textLine}>
                    <span style={styles.labelKh}>ទីកន្លែងកំណើត: </span>
                    <span style={styles.valueKh}>{viewingCard.pob || 'Cambodia'}</span>
                  </div>

                  <div style={styles.textLine}>
                    <span style={styles.labelKh}>អាសយដ្ឋាន: </span>
                    <span style={styles.valueKh}>{viewingCard.address || 'Phnom Penh'}</span>
                  </div>

                  <div style={styles.textLine}>
                    <span style={styles.labelKh}>សុពលភាព: </span>
                    <span style={styles.labelKh}>
                      {viewingCard.issued_date || '01.01.2023'} ដល់ថ្ងៃ{' '}
                      {viewingCard.expiry_date || '01.01.2033'}
                    </span>
                  </div>
                </div>

                {/* qr */}
                <div style={styles.qrCol}>
                  <div style={styles.qrBox}>
                    {viewingCard.qrcode ? (
                      <img
                        src={
                          String(viewingCard.qrcode).startsWith('data:')
                            ? viewingCard.qrcode
                            : `data:image/png;base64,${viewingCard.qrcode}`
                        }
                        style={{ width: '65px', height: '65px' }}
                        alt="QR"
                      />
                    ) : (
                      <QRCode value={viewingCard.qr_token || 'no-token'} size={65} />
                    )}
                  </div>
                </div>
              </div>

              {/* MRZ Code */}
              <div style={styles.mrzContainer}>
                <div style={styles.mrzText}>
                  {viewingCard.mrz_line1 || `IDKHM${viewingCard.id_number}<<<<<<<<<<<<<<<`}
                </div>
                <div style={styles.mrzText}>
                  {viewingCard.mrz_line2 || `9901018M3001014KHM<<<<<<<<<<<0`}
                </div>
                <div style={styles.mrzText}>
                  {viewingCard.mrz_line3 ||
                    `${(viewingCard.name_en || '').replace(/ /g, '<')}<<<<<<<<<<<<<<<`}
                </div>
              </div>
            </div>

            <button className="btn btn-danger mt-3" onClick={() => setViewingCard(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <table className="table table-striped table-bordered table-hover">
        <thead className="table-dark">
          <tr>
            <th>ID Number</th>
            <th>Name (EN)</th>
            <th>Name (KH)</th>
            <th>Gender</th>
            <th>DOB</th>
            <th>POB</th>
            <th>Create Date</th>
            <th>Expire Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {voters.map((voter) => (
            <tr key={voter.uuid}>
              <td>{voter.id_number}</td>
              <td>{voter.name_en}</td>
              <td>{voter.name_kh}</td>
              <td>{voter.gender}</td>
              <td>{voter.dob_display}</td>
              <td>{voter.pob}</td>
              <td>{voter.issued_date}</td>
              <td>{voter.expiry_date}</td>
              <td>
                <button className="btn btn-primary btn-sm me-2" onClick={() => openEdit(voter)}>
                  ✏️ Edit
                </button>
                <button className="btn btn-info btn-sm text-white" onClick={() => openCard(voter)}>
                  🪪 Show ID Card
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// css
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px',
  },

  modalContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '10px',
  },

  cardContainer: {
    position: 'relative',
    width: '380px',
    minHeight: '240px',
    height: 'auto', 
    backgroundColor: '#fff',
    borderRadius: '12px',
    backgroundImage: 'url("https://www.transparenttextures.com/patterns/black-thread-light.png")',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
    padding: '10px',
    fontFamily: 'Arial, sans-serif',

    display: 'flex', 
    flexDirection: 'column',
    overflow: 'visible',
  },

  idNumber: {
    position: 'absolute',
    top: '10px',
    right: '14px',
    color: '#000',
    fontSize: '18px',
    fontWeight: '900',
  },

  mainRow: {
    display: 'flex',
    marginTop: '35px',
    alignItems: 'flex-start',
    gap: '8px',
    height: 'auto', 
  },

  photoBox: {
    width: '85px',
    height: '110px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '2px',
    flex: '0 0 85px',
  },

  detailsCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    minWidth: 0, 
    overflow: 'visible',
    paddingRight: '4px',
  },

  qrCol: {
    width: '70px',
    flex: '0 0 70px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  qrBox: {
    padding: '2px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: 'white',
  },

  textLine: {
    whiteSpace: 'normal', 
    wordBreak: 'break-word',
    overflow: 'visible',
    textOverflow: 'clip',
    marginBottom: '2px',
    lineHeight: '0.9',
  },

  labelKh: {
    fontFamily: '"Khmer OS Battambang", sans-serif',
    fontSize: '9px',
    color: '#333',
  },

  valueKh: {
    fontFamily: '"Khmer OS Battambang", sans-serif',
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#000',
  },

  valueKhBold: {
    fontFamily: '"Khmer OS Battambang", sans-serif',
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#000',
  },

  mrzContainer: {
    marginTop: 'auto', 
    paddingTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    lineHeight: '1.1',
  },

  mrzText: {
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '1px',
    color: '#333',
  },
};

export default App;
