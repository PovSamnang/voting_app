// server.js
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';

import fs from 'fs';
import path from 'path';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// =========================
// DB config
// =========================
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Iphone168$$',
  database: process.env.DB_NAME || 'voting_system',
};

// =========================
// Face++ (better in .env, but kept)
// =========================
const FACE_API_KEY = process.env.FACE_API_KEY || 'RrJE9m7vhloiaUVWj8M81eME5ECBtwb1';
const FACE_API_SECRET = process.env.FACE_API_SECRET || 'j2TlQZqvXMoEU5Kr8gzNqiwH9YBSLQ7Z';

// =========================
// Upload ID card image
// =========================
const uploadDir = path.resolve(process.cwd(), 'uploads', 'id_cards');
fs.mkdirSync(uploadDir, { recursive: true });

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname || '.jpg') || '.jpg').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype);
    if (!ok) return cb(new Error('Only JPG/PNG images are allowed'), false);
    cb(null, true);
  },
});

// =========================
// Helpers
// =========================
function norm(s) {
  return String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function parseDDMMYYYY(s) {
  const v = String(s ?? '').trim();
  const parts = v.split('.');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

function calcAge(dob) {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function stripDataUrl(b64) {
  const s = String(b64 || '');
  return s.includes('base64,') ? s.split('base64,')[1] : s;
}

async function readFileToBase64(filePath) {
  const buf = await fs.promises.readFile(filePath);
  return buf.toString('base64');
}

async function safeUnlink(filePath) {
  try {
    if (filePath) await fs.promises.unlink(filePath);
  } catch (_) {}
}

async function compareFacePlusPlus(base64_1, base64_2) {
  const formData = new URLSearchParams();
  formData.append('api_key', FACE_API_KEY);
  formData.append('api_secret', FACE_API_SECRET);
  formData.append('image_base64_1', stripDataUrl(base64_1));
  formData.append('image_base64_2', stripDataUrl(base64_2));

  const r = await axios.post('https://api-us.faceplusplus.com/facepp/v3/compare', formData);

  if (r.data?.error_message) {
    throw new Error(`Face++ error: ${r.data.error_message}`);
  }

  return Number(r.data?.confidence ?? 0);
}

// =========================
// Email
// =========================
async function sendEmail(to, subject, text) {
  const port = Number(process.env.SMTP_PORT || '587');
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
  });
}

// =========================
// Blockchain (Ganache)
// =========================
const RPC_URL = process.env.RPC_URL || 'http:/172.20.10.5:3000';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || '1800');

if (!CONTRACT_ADDRESS || !ADMIN_PRIVATE_KEY) {
  console.warn('⚠️ Missing CONTRACT_ADDRESS or ADMIN_PRIVATE_KEY in .env');
}

const abiPath = path.resolve(
  process.cwd(),
  process.env.ABI_PATH || '../voting-chain-ganache/abi/VotingTokenIssuer.json'
);
const contractAbi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
const tokenContract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, wallet);

// ✅ Reuse token if active; otherwise issue new
async function issueBlockchainTokenForId(id_number) {
  const id = String(id_number).trim();
  const idHash = ethers.keccak256(ethers.toUtf8Bytes(id));

  // 1) Read current token from contract
  const info = await tokenContract.tokens(idHash);

  const existingToken = info?.token ?? info?.[0] ?? ethers.ZeroHash;
  const existingExpiresAt = Number(info?.expiresAt ?? info?.[1] ?? 0);
  const existingUsed = Boolean(info?.used ?? info?.[2] ?? false);

  // 2) If token exists, ask contract if it is valid (BEST check)
  if (existingToken && existingToken !== ethers.ZeroHash && !existingUsed) {
    const isValid = await tokenContract.validateToken(idHash, existingToken);
    if (isValid) {
      return {
        tokenHex: existingToken,
        txHash: null,
        reused: true,
        expiresAt: existingExpiresAt,
      };
    }
  }

  // 3) Issue new token
  try {
    const tx = await tokenContract.issueToken(idHash, TOKEN_TTL_SECONDS);
    const receipt = await tx.wait();

    // Read token from event (best), fallback to mapping
    let tokenHex = null;
    for (const log of receipt.logs) {
      try {
        if (String(log.address).toLowerCase() !== String(CONTRACT_ADDRESS).toLowerCase()) continue;
        const parsed = tokenContract.interface.parseLog(log);
        if (parsed?.name === 'TokenIssued') {
          tokenHex = parsed.args.token;
          break;
        }
      } catch (_) {}
    }

    if (!tokenHex) {
      const info2 = await tokenContract.tokens(idHash);
      tokenHex = info2?.token ?? info2?.[0] ?? ethers.ZeroHash;
    }

    const info3 = await tokenContract.tokens(idHash);
    const expiresAt = Number(info3?.expiresAt ?? info3?.[1] ?? 0);

    return { tokenHex, txHash: receipt.hash, reused: false, expiresAt };
  } catch (e) {
    // 4) If revert says active token exists, reuse using validateToken
    const msg = String(
      e?.shortMessage ||
        e?.info?.error?.message ||
        e?.reason ||
        e?.message ||
        ''
    );

    if (msg.includes('Active token exists')) {
      const info4 = await tokenContract.tokens(idHash);
      const token4 = info4?.token ?? info4?.[0] ?? ethers.ZeroHash;
      const exp4 = Number(info4?.expiresAt ?? info4?.[1] ?? 0);
      const used4 = Boolean(info4?.used ?? info4?.[2] ?? false);

      if (token4 !== ethers.ZeroHash && !used4) {
        const isValid4 = await tokenContract.validateToken(idHash, token4);
        if (isValid4) {
          return { tokenHex: token4, txHash: null, reused: true, expiresAt: exp4 };
        }
      }
    }

    throw e;
  }
}


// =========================
// ADMIN: Get all voters (+ contacts)
// =========================
app.get('/api/voters', async (_req, res) => {
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    const [rows] = await connection.execute(
      `SELECT v.uuid, v.id_number, v.name_en, v.name_kh, v.gender, v.dob_display, v.qr_token,
              v.photo, v.qrcode, v.height, v.pob, v.address, v.issued_date, v.expiry_date,
              v.mrz_line1, v.mrz_line2, v.mrz_line3,
              c.phone, c.email, c.id_photo
       FROM voters v
       LEFT JOIN voter_contacts c ON c.voter_uuid = v.uuid`
    );
    await connection.end();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching voters' });
  }
});

// =========================
// Registration + Request Token + ID IMAGE MATCH
// =========================
app.post('/api/register-request-token', upload.single('id_card_image'), async (req, res) => {
  let connection;
  try {
    const { id_number, name_kh, name_en, phone, email } = req.body;

    if (!id_number || !name_kh || !name_en || !phone || !email || !req.file) {
      await safeUnlink(req.file?.path);
      return res.status(400).json({ message: 'Missing fields or ID card image' });
    }

    const id = String(id_number).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();

    connection = await mysql.createConnection(DB_CONFIG);

    // 1) voter exists
    const [rows] = await connection.execute(
      `SELECT uuid, id_number, name_kh, name_en, dob_iso, expiry_date, photo
       FROM voters WHERE id_number=? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      await safeUnlink(req.file.path);
      return res.status(404).json({ message: 'ID not found' });
    }

    const voter = rows[0];

    // 2) name matches
    if (norm(voter.name_kh) !== norm(name_kh) || norm(voter.name_en) !== norm(name_en)) {
      await safeUnlink(req.file.path);
      return res.status(401).json({ message: 'Name does not match voter database' });
    }

    // 3) age >= 18
    if (!voter.dob_iso) {
      await safeUnlink(req.file.path);
      return res.status(400).json({ message: 'DOB missing in database for this voter' });
    }
    const age = calcAge(new Date(voter.dob_iso));
    if (age < 18) {
      await safeUnlink(req.file.path);
      return res.status(403).json({ message: 'Under 18' });
    }

    // 4) not expired
    const exp = parseDDMMYYYY(voter.expiry_date);
    if (!exp) {
      await safeUnlink(req.file.path);
      return res.status(400).json({ message: 'Invalid expiry_date format in database' });
    }
    if (exp.getTime() < Date.now()) {
      await safeUnlink(req.file.path);
      return res.status(403).json({ message: 'ID card expired' });
    }

    // 5) email unique
    const [emailOwner] = await connection.execute(
      'SELECT voter_uuid FROM voter_contacts WHERE email=? LIMIT 1',
      [cleanEmail]
    );
    if (emailOwner.length > 0 && emailOwner[0].voter_uuid !== voter.uuid) {
      await safeUnlink(req.file.path);
      return res.status(409).json({ message: 'Email already used by another voter' });
    }

    // 6) ID CARD IMAGE must match DB face
    const dbPhotoBase64 = stripDataUrl(voter.photo || '');
    if (!dbPhotoBase64) {
      await safeUnlink(req.file.path);
      return res.status(500).json({ message: 'No face photo stored for this voter in DB' });
    }

    const uploadedBase64 = await readFileToBase64(req.file.path);

    let confidence = 0;
    try {
      confidence = await compareFacePlusPlus(dbPhotoBase64, uploadedBase64);
    } catch (e) {
      await safeUnlink(req.file.path);
      return res.status(400).json({ message: 'ID card image face check failed', error: e.message });
    }

    const MIN_CONF = Number(process.env.IDCARD_FACE_MIN_CONF || '70');
    if (confidence < MIN_CONF) {
      await safeUnlink(req.file.path);
      return res.status(401).json({
        message: 'Uploaded ID card image does not match this voter',
        confidence,
      });
    }

    // 7) save contact + image path
    const relativeImgPath = path.join('uploads', 'id_cards', req.file.filename);

    await connection.execute(
      `INSERT INTO voter_contacts (voter_uuid, phone, email, id_photo)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         phone=VALUES(phone),
         email=VALUES(email),
         id_photo=VALUES(id_photo)`,
      [voter.uuid, cleanPhone, cleanEmail, relativeImgPath]
    );

    await connection.end();
    connection = null;

    // ✅ FIX: destructure expiresAt too
    const { tokenHex, txHash, reused, expiresAt } = await issueBlockchainTokenForId(id);

    const mins = Math.max(0, Math.floor((expiresAt - Math.floor(Date.now() / 1000)) / 60));

    await sendEmail(
      cleanEmail,
      'KampuVote Voting Token',
      `Your voting token (generated by blockchain):\n\n` +
        `ID: ${id}\n` +
        `TOKEN: ${tokenHex}\n\n` +
        `ID card face match confidence: ${confidence}\n` +
        `Expires in ~${mins} minutes.\n`
    );

    return res.json({
      message: reused
        ? 'Active token already exists. Token re-sent to email.'
        : 'Registration OK. New token sent to email.',
      tx_hash: txHash,
      confidence,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error(err);
    await safeUnlink(req.file?.path);
    return res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    try {
      if (connection) await connection.end();
    } catch (_) {}
  }
});

// =========================
// Verify token later before voting
// =========================
app.post('/api/verify-voting-token', async (req, res) => {
  try {
    const { id_number, token } = req.body;
    if (!id_number || !token) return res.status(400).json({ message: 'Missing data' });

    const id = String(id_number).trim();
    const tokenHex = String(token).trim();
    const idHash = ethers.keccak256(ethers.toUtf8Bytes(id));

    const ok = await tokenContract.validateToken(idHash, tokenHex);
    if (!ok) return res.status(401).json({ message: 'Invalid/expired/used token' });

    const tx = await tokenContract.markUsed(idHash);
    await tx.wait();

    return res.json({ message: 'Token verified. Allow voting now.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => {
  console.log('Server running on port', process.env.PORT || 3000);
});
