
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import path from 'path'; 

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'Iphone168$$', 
    database: 'voting_system'
};

const FACE_API_KEY = 'RrJE9m7vhloiaUVWj8M81eME5ECBtwb1';
const FACE_API_SECRET = 'j2TlQZqvXMoEU5Kr8gzNqiwH9YBSLQ7Z';


//  ADMIN 
// get all voter 
app.get('/api/voters', async (req, res) => {
    try {
        const connection = await mysql.createConnection(DB_CONFIG);
        const [rows] = await connection.execute(
            `SELECT uuid, id_number, name_en, name_kh, gender, dob_display, qr_token, 
             photo, qrcode, height, pob, address, issued_date, expiry_date, 
             mrz_line1, mrz_line2, mrz_line3 
             FROM voters`
        );
        await connection.end();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching voters' });
    }
});

// update voters data
app.put('/api/voters/:uuid', async (req, res) => {
    const { uuid } = req.params;
    const { name_en, name_kh, id_number, gender } = req.body;

    try {
        const connection = await mysql.createConnection(DB_CONFIG);
        await connection.execute(
            'UPDATE voters SET name_en=?, name_kh=?, id_number=?, gender=? WHERE uuid=?',
            [name_en, name_kh, id_number, gender, uuid]
        );
        await connection.end();
        res.json({ message: 'Voter updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating voter' });
    }
});


//scanner
app.get('/api/lookup-qr/:token', async (req, res) => {
    const token = req.params.token;
    try {
        const connection = await mysql.createConnection(DB_CONFIG);
        const [rows] = await connection.execute(
            'SELECT id_number, name_en FROM voters WHERE qr_token = ? LIMIT 1', 
            [token]
        );
        await connection.end();

        if (rows.length === 0) return res.status(404).json({ message: 'Invalid QR Token' });

        return res.status(200).json({ 
            message: 'QR Found', 
            id_number: rows[0].id_number,
            name: rows[0].name_en 
        });
    } catch (err) {
        res.status(500).json({ message: 'System Error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { identifier, face_base64 } = req.body;
    try {
        const connection = await mysql.createConnection(DB_CONFIG);
        const [rows] = await connection.execute('SELECT * FROM voters WHERE id_number = ?', [identifier]);
        await connection.end();

        if (rows.length === 0) return res.status(404).json({ message: 'ID not found' });

        const user = rows[0];
        
        const dbPhoto = user.photo.includes("base64,") ? user.photo.split("base64,")[1] : user.photo;
        
        const formData = new URLSearchParams();
        formData.append('api_key', FACE_API_KEY);
        formData.append('api_secret', FACE_API_SECRET);
        formData.append('image_base64_1', dbPhoto); 
        formData.append('image_base64_2', face_base64); 

        const faceRes = await axios.post('https://api-us.faceplusplus.com/facepp/v3/compare', formData);
        
        if (faceRes.data.confidence > 80) {
             const token = 'authorized-voter-' + user.uuid;
             return res.status(200).json({ message: 'Success', token: token });
        } else {
             return res.status(401).json({ message: 'Face ID mismatch' });
        }
    } catch (err) {
        const errorDetail = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
        res.status(500).json({ message: 'Error: ' + errorDetail });
    }
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
});