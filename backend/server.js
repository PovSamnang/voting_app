import "dotenv/config";
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import bodyParser from "body-parser";
import axios from "axios";

import fs from "fs";
import path from "path";
import multer from "multer";
import nodemailer from "nodemailer";
import { ethers } from "ethers";
import jwt from "jsonwebtoken";

// ✅ QR decode deps
import sharp from "sharp";
import {
  MultiFormatReader,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

// =========================
// ENV / CONFIG
// =========================
const PORT = Number(process.env.PORT || 3000);

// DB
const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "voting_system",
};

// JWT
const JWT_SECRET = process.env.JWT_SECRET || "dev_only_change_me";
const JWT_EXPIRES_SECONDS = Number(process.env.JWT_EXPIRES_SECONDS || "86400");

// Admin API key (for admin add candidate + admin results)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

// Face++
const FACE_API_KEY = process.env.FACE_API_KEY || "";
const FACE_API_SECRET = process.env.FACE_API_SECRET || "";
const LOGIN_FACE_MIN_CONF = Number(process.env.LOGIN_FACE_MIN_CONF || "70");
const IDCARD_FACE_MIN_CONF = Number(process.env.IDCARD_FACE_MIN_CONF || "70");

// QR flags
const REQUIRE_QR_ON_IDCARD =
  String(process.env.REQUIRE_QR_ON_IDCARD || "true").toLowerCase() !== "false";
const QR_DEBUG = String(process.env.QR_DEBUG || "false").toLowerCase() === "true";

// Blockchain
const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || "86400");

const abiPath = path.resolve(
  process.cwd(),
  process.env.ABI_PATH || "./build/VotingTokenIssuer.artifact.json"
);

if (!FACE_API_KEY || !FACE_API_SECRET) {
  console.warn("⚠️ FACE_API_KEY / FACE_API_SECRET missing. Face compare will fail.");
}

// =========================
// MIDDLEWARES
// =========================
function adminRequired(req, res, next) {
  const key = String(req.headers["x-admin-key"] || "");
  if (!ADMIN_API_KEY) return res.status(500).json({ message: "ADMIN_API_KEY not set" });
  if (key !== ADMIN_API_KEY) return res.status(403).json({ message: "Forbidden" });
  next();
}

function authRequired(req, res, next) {
  const h = String(req.headers.authorization || "");
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Missing auth token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET); // {uuid, id_number, name}
    next();
  } catch {
    return res.status(401).json({ message: "Invalid/expired auth token" });
  }
}

// =========================
// Upload ID card image
// =========================
const uploadDir = path.resolve(process.cwd(), "uploads", "id_cards");
fs.mkdirSync(uploadDir, { recursive: true });

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname || ".jpg") || ".jpg").toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png"].includes(ext) ? ext : ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/jpg", "image/png"].includes(file.mimetype);
    if (!ok) return cb(new Error("Only JPG/PNG images are allowed"), false);
    cb(null, true);
  },
});



async function fetchCandidatesFromChain(contract) {
  const countRaw = await contract.candidateCount();
  const count = Number(countRaw);

  if (!Number.isFinite(count) || count <= 0) return [];

  // detect if IDs start at 0 or 1
  let base = 0;
  try {
    await contract.getCandidate(0);
    base = 0;
  } catch {
    base = 1;
  }

  // if even the first ID reverts => treat as no candidates yet
  try {
    await contract.getCandidate(base);
  } catch {
    return [];
  }

  const out = [];
  for (let i = base; i < base + count; i++) {
    try {
      const r = await contract.getCandidate(i);
      out.push({
        id: Number(r[0]),
        name_en: r[1],
        name_kh: r[2],
        party: r[3],
        photo_url: r[4],
        voteCount: Number(r[5]),
        is_active: Boolean(r[6]),
      });
    } catch {
      // If candidateCount is actually "nextId", stop at first out-of-range
      break;
    }
  }
  return out;
}
// =========================
// Helpers
// =========================
function norm(s) {
  return String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}
//theam
function canonicalId(id) {
  // remove spaces + normalize case, so hash is consistent across web/mobile
  return String(id || "").trim().replace(/\s+/g, "").toUpperCase();
}

function parseDDMMYYYY(s) {
  const v = String(s ?? "").trim();
  const parts = v.split(".");
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
  const s = String(b64 || "");
  return s.includes("base64,") ? s.split("base64,")[1] : s;
}

async function readFileToBase64(filePath) {
  const buf = await fs.promises.readFile(filePath);
  return buf.toString("base64");
}

async function safeUnlink(filePath) {
  try {
    if (filePath) await fs.promises.unlink(filePath);
  } catch (_) {}
}

// =========================
// ✅ Robust QR decode (full + enhance + crop-right)
// =========================
async function decodeQrFromImageFile(filePath) {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new MultiFormatReader();
  reader.setHints(hints);

  const base = sharp(filePath).rotate();
  const meta = await base.metadata();
  const W = meta.width || 0;
  const H = meta.height || 0;

  const variants = [];

  variants.push({ name: "full", img: base.clone() });

  variants.push({
    name: "full_enhanced",
    img: base.clone().greyscale().normalise().sharpen(),
  });

  variants.push({
    name: "full_resize_1200",
    img: base.clone().resize({ width: 1200, withoutEnlargement: false }),
  });

  if (W > 0 && H > 0) {
    const left = Math.floor(W * 0.70);
    const top = Math.floor(H * 0.08);
    const width = Math.max(1, Math.floor(W * 0.30));
    const height = Math.max(1, Math.floor(H * 0.60));

    variants.push({
      name: "crop_right",
      img: base
        .clone()
        .extract({ left, top, width, height })
        .resize({ width: 700, withoutEnlargement: false }),
    });

    variants.push({
      name: "crop_right_enhanced",
      img: base
        .clone()
        .extract({ left, top, width, height })
        .greyscale()
        .normalise()
        .sharpen()
        .resize({ width: 850, withoutEnlargement: false }),
    });
  }

  for (const v of variants) {
    try {
      const { data, info } = await v.img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const u8 = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);

      const luminanceSource = new RGBLuminanceSource(u8, info.width, info.height);
      const bitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

      const result = reader.decode(bitmap);
      const text = result?.getText?.() || null;

      try {
        reader.reset();
      } catch {}

      if (text && String(text).trim()) {
        if (QR_DEBUG) console.log("✅ QR decoded variant:", v.name, "=>", String(text).trim());
        return String(text).trim();
      }
    } catch (e) {
      if (QR_DEBUG) console.log("❌ QR decode fail variant:", v.name, "err:", String(e?.message || e));
      try {
        reader.reset();
      } catch {}
    }
  }

  return null;
}

// =========================
// Face++ compare
// =========================
async function compareFacePlusPlus(base64_1, base64_2) {
  const formData = new URLSearchParams();
  formData.append("api_key", FACE_API_KEY);
  formData.append("api_secret", FACE_API_SECRET);
  formData.append("image_base64_1", stripDataUrl(base64_1));
  formData.append("image_base64_2", stripDataUrl(base64_2));

  const r = await axios.post("https://api-us.faceplusplus.com/facepp/v3/compare", formData);
  if (r.data?.error_message) throw new Error(`Face++ error: ${r.data.error_message}`);
  return Number(r.data?.confidence ?? 0);
}

// =========================
// Email
// =========================
async function sendEmail(to, subject, text) {
  const port = Number(process.env.SMTP_PORT || "587");
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
// Blockchain (SAFE LAZY INIT)
// =========================
let tokenContract = null;

function getTokenContract() {
  if (tokenContract) return tokenContract;

  if (!RPC_URL) throw new Error("Missing RPC_URL in .env");
  if (!CONTRACT_ADDRESS) throw new Error("Missing CONTRACT_ADDRESS in .env");
  if (!ADMIN_PRIVATE_KEY) throw new Error("Missing ADMIN_PRIVATE_KEY in .env");

  const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const abi = artifact.abi ?? artifact;

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  tokenContract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

  return tokenContract;
}

function unpackTokenStruct(info) {
  const token = info?.token ?? info?.[0] ?? ethers.ZeroHash;
  const expiresAt = Number(info?.expiresAt ?? info?.[1] ?? 0);
  const used = Boolean(info?.used ?? info?.[2] ?? false);
  return { token, expiresAt, used };
}

// ✅ Reuse token if active; otherwise issue new
async function issueBlockchainTokenForId(id_number) {
  const id = canonicalId(id_number);                    // ✅ canonical
  const idHash = ethers.keccak256(ethers.toUtf8Bytes(id));
  const c = getTokenContract();

  // read existing token
  const info = await c.tokens(idHash);
  const { token: existingToken, expiresAt: existingExpiresAt, used: existingUsed } =
    unpackTokenStruct(info);

  if (existingToken && existingToken !== ethers.ZeroHash && !existingUsed) {
    const isValid = await c.validateToken(idHash, existingToken);
    if (isValid) {
      return {
        tokenHex: existingToken,
        txHash: null,
        reused: true,
        expiresAt: existingExpiresAt,
      };
    }
  }

  //change theam
  // issue new token 
  const tx = await c.issueToken(idHash, TOKEN_TTL_SECONDS);
  const receipt = await tx.wait();

  // try read token from event
  let tokenHex = null;
  for (const log of receipt.logs) {
    try {
      if (String(log.address).toLowerCase() !== String(CONTRACT_ADDRESS).toLowerCase()) continue;
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "TokenIssued") {
        tokenHex = parsed.args.token;
        break;
      }
    } catch {}
  }

  if (!tokenHex) {
    const info2 = await c.tokens(idHash);
    tokenHex = unpackTokenStruct(info2).token;
  }

  const info3 = await c.tokens(idHash);
  const { expiresAt } = unpackTokenStruct(info3);

  return { tokenHex, txHash: receipt.hash, reused: false, expiresAt };
}

// =========================
// JWT sign
// =========================
function signLoginToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_SECONDS });
}

// =========================
// ROUTES
// =========================

// Health
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    hasBlockchainEnv: Boolean(RPC_URL && CONTRACT_ADDRESS && ADMIN_PRIVATE_KEY),
    REQUIRE_QR_ON_IDCARD,
  });
});

// Lookup QR token (card scan)
app.get("/api/lookup-qr/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!token) return res.status(400).json({ message: "Missing token" });

    const connection = await mysql.createConnection(DB_CONFIG);
    const [rows] = await connection.execute(
      `SELECT id_number, name_en, name_kh
       FROM voters
       WHERE qr_token = ? LIMIT 1`,
      [token]
    );
    await connection.end();

    if (rows.length === 0) return res.status(404).json({ message: "Not found" });

    return res.json({
      id_number: rows[0].id_number,
      name: rows[0].name_en || rows[0].name_kh || "Voter",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// LOGIN (Face verify + liveness flag)
app.post("/api/login", async (req, res) => {
  let connection;
  try {
    const { identifier, face_base64, liveness_passed } = req.body;

    if (!identifier || !face_base64) {
      return res.status(400).json({ message: "Missing identifier or face image" });
    }
    if (liveness_passed !== true) {
      return res.status(401).json({ message: "Liveness not passed" });
    }

    const id = canonicalId(identifier);

    connection = await mysql.createConnection(DB_CONFIG);
    const [rows] = await connection.execute(
      `SELECT uuid, id_number, name_en, name_kh, photo, dob_iso, expiry_date
       FROM voters WHERE id_number=? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "ID not found" });

    const voter = rows[0];

    const exp = parseDDMMYYYY(voter.expiry_date);
    if (exp && exp.getTime() < Date.now()) {
      return res.status(403).json({ message: "ID card expired" });
    }

    if (voter.dob_iso) {
      const age = calcAge(new Date(voter.dob_iso));
      if (age < 18) return res.status(403).json({ message: "Under 18" });
    }

    const dbPhotoBase64 = stripDataUrl(voter.photo || "");
    if (!dbPhotoBase64) return res.status(500).json({ message: "No face photo stored in DB" });

    let confidence = 0;
    try {
      confidence = await compareFacePlusPlus(dbPhotoBase64, face_base64);
    } catch (e) {
      return res.status(400).json({ message: "Face check failed", error: e.message });
    }

    if (confidence < LOGIN_FACE_MIN_CONF) {
      return res.status(401).json({ message: "Face does not match", confidence });
    }

    const token = signLoginToken({
      uuid: voter.uuid,
      id_number: voter.id_number,
      name: voter.name_en || voter.name_kh || "Voter",
    });

    return res.json({
      token,
      voter: {
        uuid: voter.uuid,
        id_number: voter.id_number,
        name: voter.name_en || voter.name_kh || "Voter",
      },
      confidence,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    try {
      if (connection) await connection.end();
    } catch (_) {}
  }
});

// ADMIN: Get all voters (+ contacts)  (keep as you had)
app.get("/api/voters", async (_req, res) => {
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    const [rows] = await connection.execute(
      `SELECT v.uuid, v.id_number, v.name_en, v.name_kh, v.gender, v.dob_display,
              v.pob, v.address, v.issued_date, v.expiry_date, v.height,
              v.photo, v.qrcode, v.qr_token,
              v.mrz_line1, v.mrz_line2, v.mrz_line3,
              c.phone, c.email, c.id_photo
       FROM voters v
       LEFT JOIN voter_contacts c ON c.voter_uuid = v.uuid`
    );
    await connection.end();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error fetching voters", error: err.message });
  }
});

// ADMIN: Update voter (keep as you had)
app.put("/api/voters/:uuid", async (req, res) => {
  const { uuid } = req.params;
  const { id_number, name_en, name_kh, gender } = req.body;

  try {
    const connection = await mysql.createConnection(DB_CONFIG);

    await connection.execute(
      `UPDATE voters
       SET id_number = ?, name_en = ?, name_kh = ?, gender = ?
       WHERE uuid = ?`,
      [id_number, name_en, name_kh, gender, uuid]
    );

    await connection.end();
    return res.json({ message: "Voter updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Update failed", error: err.message });
  }
});

// Registration + Request Token + ✅ QR MATCH + Face Match
app.post("/api/register-request-token", upload.single("id_card_image"), async (req, res) => {
  let connection;
  try {
    const { id_number, name_kh, name_en, phone, email } = req.body;

    if (!id_number || !name_kh || !name_en || !phone || !email || !req.file) {
      await safeUnlink(req.file?.path);
      return res.status(400).json({ message: "Missing fields or ID card image" });
    }

    const id = canonicalId(id_number);  // ✅ canonical everywhere
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();

    connection = await mysql.createConnection(DB_CONFIG);

    const [rows] = await connection.execute(
      `SELECT uuid, id_number, name_kh, name_en, dob_iso, expiry_date, photo, qr_token
       FROM voters WHERE id_number=? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      await safeUnlink(req.file.path);
      return res.status(404).json({ message: "ID not found" });
    }

    const voter = rows[0];

    if (norm(voter.name_kh) !== norm(name_kh) || norm(voter.name_en) !== norm(name_en)) {
      await safeUnlink(req.file.path);
      return res.status(401).json({ message: "Name does not match voter database" });
    }

    if (!voter.dob_iso) {
      await safeUnlink(req.file.path);
      return res.status(400).json({ message: "DOB missing in database for this voter" });
    }
    const age = calcAge(new Date(voter.dob_iso));
    if (age < 18) {
      await safeUnlink(req.file.path);
      return res.status(403).json({ message: "Under 18" });
    }

    const exp = parseDDMMYYYY(voter.expiry_date);
    if (!exp) {
      await safeUnlink(req.file.path);
      return res.status(400).json({ message: "Invalid expiry_date format in database" });
    }
    if (exp.getTime() < Date.now()) {
      await safeUnlink(req.file.path);
      return res.status(403).json({ message: "ID card expired" });
    }

    // email unique
    const [emailOwner] = await connection.execute(
      "SELECT voter_uuid FROM voter_contacts WHERE email=? LIMIT 1",
      [cleanEmail]
    );
    if (emailOwner.length > 0 && emailOwner[0].voter_uuid !== voter.uuid) {
      await safeUnlink(req.file.path);
      return res.status(409).json({ message: "Email already used by another voter" });
    }

    // ✅ QR check
    if (REQUIRE_QR_ON_IDCARD) {
      const expectedQr = String(voter.qr_token || "").trim();
      if (!expectedQr) {
        await safeUnlink(req.file.path);
        return res.status(500).json({
          message: "Server misconfig: voter has no qr_token stored",
          reason: "qr_token missing in database for this voter",
        });
      }

      const qrText = await decodeQrFromImageFile(req.file.path);

      if (QR_DEBUG) {
        console.log("expectedQr:", expectedQr);
        console.log("qrText:", qrText);
      }

      if (!qrText) {
        await safeUnlink(req.file.path);
        return res.status(400).json({
          message: "QR not found on uploaded ID image",
          reason: "Upload a clear ID photo with QR visible",
        });
      }

      if (!String(qrText).includes(expectedQr)) {
        await safeUnlink(req.file.path);
        return res.status(401).json({
          message: "Uploaded ID image QR does not match this voter",
          reason: "Wrong ID card image (QR mismatch)",
        });
      }
    }

    // Face match
    const dbPhotoBase64 = stripDataUrl(voter.photo || "");
    if (!dbPhotoBase64) {
      await safeUnlink(req.file.path);
      return res.status(500).json({ message: "No face photo stored for this voter in DB" });
    }

    const uploadedBase64 = await readFileToBase64(req.file.path);

    let confidence = 0;
    try {
      confidence = await compareFacePlusPlus(dbPhotoBase64, uploadedBase64);
    } catch (e) {
      await safeUnlink(req.file.path);
      return res.status(400).json({ message: "ID card image face check failed", error: e.message });
    }

    if (confidence < IDCARD_FACE_MIN_CONF) {
      await safeUnlink(req.file.path);
      return res.status(401).json({
        message: "Uploaded ID card image does not match this voter",
        confidence,
      });
    }

    // Save contact + image path
    const relativeImgPath = path.join("uploads", "id_cards", req.file.filename);

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

    // Issue blockchain token
    let issued;
    try {
      issued = await issueBlockchainTokenForId(id);
    } catch (e) {
      console.error("Blockchain issue token error:", e);
      return res.status(503).json({
        message: "Registration OK but blockchain token service is unavailable",
        error: String(e?.message || e),
      });
    }

    const { tokenHex, txHash, reused, expiresAt } = issued;
    const mins = Math.max(0, Math.floor((expiresAt - Math.floor(Date.now() / 1000)) / 60));

    await sendEmail(
      cleanEmail,
      "KampuVote Voting Token",
      `Your voting token (generated by blockchain):\n\n` +
        `ID: ${id}\n` +
        `TOKEN: ${tokenHex}\n\n` +
        `ID card face match confidence: ${confidence}\n` +
        `Expires in ~${mins} minutes.\n`
    );

    return res.json({
      message: reused
        ? "Active token already exists. Token re-sent to email."
        : "Registration OK. New token sent to email.",
      tx_hash: txHash,
      confidence,
      expires_at: expiresAt,
      qr_verified: REQUIRE_QR_ON_IDCARD ? true : false,
    });
  } catch (err) {
    console.error(err);
    await safeUnlink(req.file?.path);
    return res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    try {
      if (connection) await connection.end();
    } catch (_) {}
  }
});

// =========================
// ✅ NEW: ADMIN add candidate (ADD ONLY)
// Requires upgraded contract ABI with addCandidate()
// =========================
app.post("/api/admin/candidates", adminRequired, async (req, res) => {
  try {
    const { name_en, name_kh, party, photo_url } = req.body;
    if (!name_en) return res.status(400).json({ message: "name_en is required" });

    const c = getTokenContract();
    const tx = await c.addCandidate(
      String(name_en).trim(),
      String(name_kh || "").trim(),
      String(party || "").trim(),
      String(photo_url || "").trim()
    );
    await tx.wait();

    return res.json({ message: "Candidate added", tx_hash: tx.hash });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Add candidate failed", error: err.message });
  }
});


async function buildCandidatesFromEvents(contract) {
  const provider = contract.runner?.provider || new ethers.JsonRpcProvider(RPC_URL);
  const iface = contract.interface;

  const topicCandidateAdded = iface.getEvent("CandidateAdded").topicHash;
  const topicVoteCast = iface.getEvent("VoteCast").topicHash;

  // 1) Candidates
  const candLogs = await provider.getLogs({
    address: CONTRACT_ADDRESS,
    topics: [topicCandidateAdded],
    fromBlock: 0,
    toBlock: "latest",
  });

  const candidates = new Map(); // id -> candidate data

  for (const log of candLogs) {
    const parsed = iface.parseLog(log);
    const id = Number(parsed.args.id);

    // decode tx input (has name_kh, party, photo_url)
    const tx = await provider.getTransaction(log.transactionHash);
    const decoded = iface.decodeFunctionData("addCandidate", tx.data);
    const [name_en, name_kh, party, photo_url] = decoded;

    candidates.set(id, {
      id,
      name_en,
      name_kh,
      party,
      photo_url,
      voteCount: 0,
      is_active: true,
    });
  }

  // 2) Votes
  const voteLogs = await provider.getLogs({
    address: CONTRACT_ADDRESS,
    topics: [topicVoteCast],
    fromBlock: 0,
    toBlock: "latest",
  });

  for (const log of voteLogs) {
    const parsed = iface.parseLog(log);
    const candidateId = Number(parsed.args.candidateId);
    const row = candidates.get(candidateId);
    if (row) row.voteCount += 1;
  }

  return Array.from(candidates.values()).sort((a, b) => a.id - b.id);
}
// ✅ NEW: ADMIN results (counts only)
// Requires upgraded contract ABI with candidateCount/getCandidate()
app.get("/api/admin/results", adminRequired, async (_req, res) => {
  try {
    const c = getTokenContract();
    const provider = c.runner?.provider; // ethers v6: contract has provider via runner
    const iface = c.interface;

    const topicCandidateAdded = iface.getEvent("CandidateAdded").topicHash;
    const topicVoteCast = iface.getEvent("VoteCast").topicHash;

    // 1) candidates from CandidateAdded logs
    const candLogs = await provider.getLogs({
      address: CONTRACT_ADDRESS,
      topics: [topicCandidateAdded],
      fromBlock: 0,
      toBlock: "latest",
    });

    const candidates = new Map(); // id -> meta
    for (const log of candLogs) {
      const parsed = iface.parseLog(log);
      const id = Number(parsed.args.id);

      // decode addCandidate tx input to get all fields (name_kh/party/photo_url)
      const tx = await provider.getTransaction(log.transactionHash);
      const decoded = iface.decodeFunctionData("addCandidate", tx.data);
      const [name_en, name_kh, party, photo_url] = decoded;

      candidates.set(id, {
        id,
        name_en,
        name_kh,
        party,
        photo_url,
        voteCount: 0,
        is_active: true, // your contract never deactivates candidates
      });
    }

    // 2) votes from VoteCast logs
    const voteLogs = await provider.getLogs({
      address: CONTRACT_ADDRESS,
      topics: [topicVoteCast],
      fromBlock: 0,
      toBlock: "latest",
    });

    for (const log of voteLogs) {
      const parsed = iface.parseLog(log);
      const candidateId = Number(parsed.args.candidateId);
      const row = candidates.get(candidateId);
      if (row) row.voteCount += 1;
    }

    // output sorted by id
    const out = Array.from(candidates.values()).sort((a, b) => a.id - b.id);
    return res.json(out);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Fetch results failed", error: err.message });
  }
});

// ✅ NEW: Mobile fetch candidates (auto show)
// Requires upgraded contract ABI with candidateCount/getCandidate()
app.get("/api/candidates", authRequired, async (_req, res) => {
  try {
    const c = getTokenContract();
    const out = await buildCandidatesFromEvents(c);
    return res.json(out.filter((x) => x.is_active));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Fetch candidates failed", error: err.message });
  }
});
app.get("/api/health", async (_req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const net = await provider.getNetwork();
    const block = await provider.getBlockNumber();
    const code = await provider.getCode(CONTRACT_ADDRESS);

    res.json({
      ok: true,
      RPC_URL,
      chainId: Number(net.chainId),
      blockNumber: block,
      contractHasCode: code && code !== "0x",
      contract: CONTRACT_ADDRESS,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});
//theam do
// ✅ NEW: Mobile vote using Gmail token (privacy)
// Requires upgraded contract ABI with voteWithToken()
app.post("/api/vote", authRequired, async (req, res) => {
  try {
    const { token, candidate_id } = req.body;
    if (!token || !candidate_id) {
      return res.status(400).json({ message: "Missing token or candidate_id" });
    }

    const id_number = canonicalId(req.user?.id_number);
    if (!id_number) return res.status(401).json({ message: "Invalid session" });

    const tokenHex = String(token).trim();
    const candidateId = Number(candidate_id);

    const idHash = ethers.keccak256(ethers.toUtf8Bytes(id_number));
    const c = getTokenContract();

    const tx = await c.voteWithToken(idHash, tokenHex, candidateId);
    await tx.wait();

    return res.json({ message: "Vote successful", tx_hash: tx.hash });
  } catch (err) {
    console.error(err);

    // ✅ ethers/ganache reason is usually here:
    const msg =
      err?.info?.error?.message ||
      err?.shortMessage ||
      err?.reason ||
      err?.message ||
      "";

    if (msg.includes("Invalid/expired/used token"))
      return res.status(401).json({ message: "Invalid/expired/used token" });

    if (msg.includes("Invalid candidate"))
      return res.status(400).json({ message: "Invalid candidate" });

    if (msg.includes("Candidate inactive"))
      return res.status(400).json({ message: "Candidate inactive" });

    return res.status(500).json({ message: "Vote failed", error: msg });
  }
});

app.post("/api/debug-token", authRequired, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Missing token" });

    const id = String(req.user?.id_number || "").trim();
    const idHash = ethers.keccak256(ethers.toUtf8Bytes(id));
    const tokenHex = String(token).trim();

    const c = getTokenContract();

    const info = await c.tokens(idHash); // (token, expiresAt, used)
    const stored = unpackTokenStruct(info);

    const ok = await c.validateToken(idHash, tokenHex);
    const now = Math.floor(Date.now() / 1000);

    return res.json({
      idHash,
      inputToken: tokenHex,
      storedToken: stored.token,
      expiresAt: stored.expiresAt,
      used: stored.used,
      now,
      validateToken: ok,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "debug-token failed", error: String(e.message || e) });
  }
});

// OPTIONAL: keep old verify endpoint but lock it to logged-in user only
app.post("/api/verify-voting-token", authRequired, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Missing token" });

    const id = String(req.user?.id_number || "").trim();
    const tokenHex = String(token).trim();
    const idHash = ethers.keccak256(ethers.toUtf8Bytes(id));

    const c = getTokenContract();
    const ok = await c.validateToken(idHash, tokenHex);
    if (!ok) return res.status(401).json({ message: "Invalid/expired/used token" });

    // ✅ DO NOT mark used here
    return res.json({ message: "Token is valid" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// =========================
// START
// =========================
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
  console.log("REQUIRE_QR_ON_IDCARD:", REQUIRE_QR_ON_IDCARD);
  console.log("RPC_URL:", RPC_URL || "(missing)");
  console.log("ABI_PATH:", abiPath);
});