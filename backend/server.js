// server.js
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

// Admin API key
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

// Face++
const FACE_API_KEY = process.env.FACE_API_KEY || "";
const FACE_API_SECRET = process.env.FACE_API_SECRET || "";
const LOGIN_FACE_MIN_CONF = Number(process.env.LOGIN_FACE_MIN_CONF || "70");

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

// =========================
// Helpers
// =========================
function normalizeName(s) {
  return String(s || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeQrPayload(text) {
  const t = String(text || "").trim();
  if (!t) return "";

  try {
    const u = new URL(t);
    const qp =
      u.searchParams.get("token") ||
      u.searchParams.get("qr_token") ||
      u.searchParams.get("qr") ||
      u.searchParams.get("id");

    if (qp) return String(qp).trim();

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length) return String(parts[parts.length - 1]).trim();
  } catch (_) {}

  try {
    const j = JSON.parse(t);
    return String(j.token || j.qr_token || j.qr || j.id || "").trim() || t;
  } catch (_) {}

  return t;
}

function canonicalId(id) {
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

function calcAgeAt(dob, atDate) {
  const now = atDate instanceof Date ? atDate : new Date(atDate);
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function eligibilityFlags(row, refMs) {
  const refDate = new Date(Number(refMs || Date.now()));
  let age = null;
  let under18 = false;
  let expired = false;

  try {
    if (row?.dob_iso) {
      age = calcAgeAt(new Date(row.dob_iso), refDate);
      under18 = age < 18;
    }
  } catch {}

  try {
    const exp = parseDDMMYYYY(row?.expiry_date);
    expired = Boolean(exp && exp.getTime() < refDate.getTime());
  } catch {}

  return { age, under18, expired };
}

function stripDataUrl(b64) {
  const s = String(b64 || "");
  return s.includes("base64,") ? s.split("base64,")[1] : s;
}

async function safeUnlink(filePath) {
  try {
    if (filePath) await fs.promises.unlink(filePath);
  } catch (_) {}
}

function extractEthersError(e) {
  return e?.info?.error?.message || e?.shortMessage || e?.reason || e?.message || "";
}

// =========================
// ✅ Robust QR decode
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
  variants.push({ name: "full_enhanced", img: base.clone().greyscale().normalise().sharpen() });
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
      img: base.clone().extract({ left, top, width, height }).resize({ width: 700, withoutEnlargement: false }),
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

      try { reader.reset(); } catch {}

      if (text && String(text).trim()) {
        if (QR_DEBUG) console.log("✅ QR decoded variant:", v.name, "=>", String(text).trim());
        return String(text).trim();
      }
    } catch (e) {
      if (QR_DEBUG) console.log("❌ QR decode fail variant:", v.name, "err:", String(e?.message || e));
      try { reader.reset(); } catch {}
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

async function getCurrentElectionId(c) {
  const eid = Number(await c.currentElectionId());
  return eid || 0;
}

async function getElectionState(c, eid) {
  if (!eid) {
    const wallNow = Math.floor(Date.now() / 1000);
    return { configured: false, start: 0, end: 0, chainNow: wallNow, started: false, ended: false };
  }

  const configured = Boolean(await c.electionConfigured(eid));
  let start = 0;
  let end = 0;

  if (configured) {
    start = Number(await c.votingStart(eid));
    end = Number(await c.votingEnd(eid));
  }

  const provider = c.runner?.provider || new ethers.JsonRpcProvider(RPC_URL);
  const latest = await provider.getBlock("latest");
  const chainNow = Number(latest?.timestamp || Math.floor(Date.now() / 1000));

  const started = configured && chainNow >= start;
  const ended = configured && chainNow >= end;

  return { configured, start, end, chainNow, started, ended };
}

async function fetchCandidatesForElection(c, electionId) {
  const count = Number(await c.candidateCount(electionId));
  const out = [];
  for (let i = 1; i <= count; i++) {
    const r = await c.getCandidate(electionId, i);
    out.push({
      id: Number(r[0]),
      name_en: r[1],
      name_kh: r[2],
      party: r[3],
      photo_url: r[4],
      voteCount: Number(r[5]),
      is_active: Boolean(r[6]),
    });
  }
  return out;
}

async function issueTokenForElection(electionId) {
  const c = getTokenContract();
  const tx = await c.issueToken(electionId, TOKEN_TTL_SECONDS);
  const receipt = await tx.wait();

  let tokenHex = null;
  let expiresAt = 0;

  for (const log of receipt.logs) {
    try {
      if (String(log.address).toLowerCase() !== String(CONTRACT_ADDRESS).toLowerCase()) continue;
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "TokenIssued") {
        tokenHex = parsed.args.token;
        expiresAt = Number(parsed.args.expiresAt);
        break;
      }
    } catch {}
  }

  if (!tokenHex) throw new Error("Could not parse TokenIssued event");
  return { tokenHex, expiresAt, txHash: receipt.hash };
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
app.get("/api/health", async (_req, res) => {
  try {
    const base = {
      ok: true,
      time: new Date().toISOString(),
      hasBlockchainEnv: Boolean(RPC_URL && CONTRACT_ADDRESS && ADMIN_PRIVATE_KEY),
      REQUIRE_QR_ON_IDCARD,
    };

    if (RPC_URL && CONTRACT_ADDRESS) {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const net = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      const code = await provider.getCode(CONTRACT_ADDRESS);

      return res.json({
        ...base,
        RPC_URL,
        chainId: Number(net.chainId),
        blockNumber: block,
        contractHasCode: code && code !== "0x",
        contract: CONTRACT_ADDRESS,
      });
    }

    return res.json(base);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// Lookup QR token
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

// LOGIN
app.post("/api/login", async (req, res) => {
  let connection;
  try {
    const { identifier, face_base64, liveness_passed } = req.body;

    if (!identifier || !face_base64) return res.status(400).json({ message: "Missing identifier or face image" });
    if (liveness_passed !== true) return res.status(401).json({ message: "Liveness not passed" });

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
    if (exp && exp.getTime() < Date.now()) return res.status(403).json({ message: "ID card expired" });

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

    if (confidence < LOGIN_FACE_MIN_CONF) return res.status(401).json({ message: "Face does not match", confidence });

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
    try { if (connection) await connection.end(); } catch {}
  }
});

// ADMIN: Get voters (+ contacts)
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

// ADMIN: Update voter
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

// =========================
// ADMIN FLOW (unchanged)
// =========================
app.post("/api/admin/elections/draft", adminRequired, async (_req, res) => {
  try {
    const c = getTokenContract();
    const tx = await c.createDraftElection();
    await tx.wait();

    const eid = await getCurrentElectionId(c);
    return res.json({ message: "Draft election created", election_id: eid, tx_hash: tx.hash });
  } catch (e) {
    return res.status(500).json({ message: "Create draft failed", error: extractEthersError(e) });
  }
});

// ✅ Set period (same endpoint your UI uses)
app.post("/api/admin/elections", adminRequired, async (req, res) => {
  try {
    const { start_ts, end_ts } = req.body;
    const start = Number(start_ts);
    const end = Number(end_ts);

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return res.status(400).json({ message: "Invalid start/end timestamps" });
    }

    const c = getTokenContract();
    const eid = await getCurrentElectionId(c);
    if (!eid) return res.status(400).json({ message: "Create draft election first" });

    const configured = Boolean(await c.electionConfigured(eid));
    if (configured) return res.status(409).json({ message: "Election already configured" });

    const tx = await c.setElectionPeriod(eid, start, end);
    await tx.wait();

    return res.json({ message: "Election period set", election_id: eid, tx_hash: tx.hash });
  } catch (e) {
    return res.status(500).json({ message: "Set period failed", error: extractEthersError(e) });
  }
});

// ✅ List elections (history dropdown)
app.get("/api/admin/elections", adminRequired, async (_req, res) => {
  try {
    const c = getTokenContract();
    const total = Number(await c.electionCount());

    const provider = c.runner?.provider || new ethers.JsonRpcProvider(RPC_URL);
    const latest = await provider.getBlock("latest");
    const chainNow = Number(latest?.timestamp || Math.floor(Date.now() / 1000));

    const out = [];
    for (let eid = 1; eid <= total; eid++) {
      const configured = Boolean(await c.electionConfigured(eid));
      const start = configured ? Number(await c.votingStart(eid)) : 0;
      const end = configured ? Number(await c.votingEnd(eid)) : 0;

      let phase = "DRAFT";
      if (configured) {
        if (chainNow >= end) phase = "ENDED";
        else if (chainNow >= start) phase = "ACTIVE";
        else phase = "BEFORE_START";
      }

      out.push({ election_id: eid, configured, start_ts: start, end_ts: end, phase });
    }

    out.sort((a, b) => b.election_id - a.election_id);
    return res.json({ chain_now_ts: chainNow, elections: out });
  } catch (e) {
    console.error("❌ LIST ELECTIONS ERROR:", e);
    return res.status(500).json({ message: "List elections failed", error: String(e.message || e) });
  }
});

// ADMIN add candidate
app.post("/api/admin/candidates", adminRequired, async (req, res) => {
  try {
    const { name_en, name_kh, party, photo_url } = req.body;
    if (!name_en?.trim()) return res.status(400).json({ message: "name_en is required" });

    const c = getTokenContract();
    const eid = await getCurrentElectionId(c);
    if (!eid) return res.status(400).json({ message: "Create draft election first" });

    const st = await getElectionState(c, eid);
    if (st.configured && st.started) return res.status(403).json({ message: "Cannot add candidate after period start" });

    const tx = await c.addCandidate(
      eid,
      String(name_en).trim(),
      String(name_kh || "").trim(),
      String(party || "").trim(),
      String(photo_url || "").trim()
    );
    await tx.wait();

    return res.json({ message: "Candidate added", election_id: eid, tx_hash: tx.hash });
  } catch (e) {
    return res.status(500).json({ message: "Add candidate failed", error: extractEthersError(e) });
  }
});

// ✅ voter request token
app.post("/api/register-request-token", upload.single("id_card_image"), async (req, res) => {
  let connection;
  try {
    const { id_number, name_kh, name_en, phone, email } = req.body;

    if (!id_number || !name_kh || !name_en || !phone || !email || !req.file) {
      await safeUnlink(req.file?.path);
      return res.status(400).json({ message: "Missing fields or ID card image" });
    }

    const id = canonicalId(id_number);
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

    // 1) Name must match DB
    const inEn = normalizeName(name_en);
    const inKh = normalizeName(name_kh);
    const dbEn = normalizeName(voter.name_en);
    const dbKh = normalizeName(voter.name_kh);
    if ((dbEn && inEn !== dbEn) || (dbKh && inKh !== dbKh)) {
      await safeUnlink(req.file.path);
      return res.status(403).json({ message: "Name does not match voter database" });
    }

    // 2) Expiry check
    const exp = parseDDMMYYYY(voter.expiry_date);
    if (exp && exp.getTime() < Date.now()) {
      await safeUnlink(req.file.path);
      return res.status(403).json({ message: "ID card expired" });
    }

    // 3) Age >= 18
    if (voter.dob_iso) {
      const age = calcAge(new Date(voter.dob_iso));
      if (age < 18) {
        await safeUnlink(req.file.path);
        return res.status(403).json({ message: "Under 18" });
      }
    }

    // 4) Email unique across voters
    const [emailUsed] = await connection.execute(
      `SELECT voter_uuid FROM voter_contacts WHERE email=? LIMIT 1`,
      [cleanEmail]
    );
    if (emailUsed.length && String(emailUsed[0].voter_uuid) !== String(voter.uuid)) {
      await safeUnlink(req.file.path);
      return res.status(409).json({ message: "Email already used by another voter" });
    }

    // 5) QR compare
    if (REQUIRE_QR_ON_IDCARD) {
      const decoded = await decodeQrFromImageFile(req.file.path);
      if (!decoded) {
        await safeUnlink(req.file.path);
        return res.status(400).json({ message: "QR not detected. Upload a clearer ID card photo with QR visible." });
      }

      const qrToken = normalizeQrPayload(decoded);
      if (!qrToken) {
        await safeUnlink(req.file.path);
        return res.status(400).json({ message: "QR content invalid. Please re-upload a clearer photo." });
      }

      const [qrOwner] = await connection.execute(
        `SELECT uuid, id_number FROM voters WHERE qr_token=? LIMIT 1`,
        [qrToken]
      );

      if (qrOwner.length === 0) {
        await safeUnlink(req.file.path);
        return res.status(403).json({ message: "QR is not registered in voter database" });
      }

      if (String(qrOwner[0].uuid) !== String(voter.uuid)) {
        await safeUnlink(req.file.path);
        return res.status(403).json({
          message: "Uploaded ID card does not match entered ID number (QR mismatch)",
          reason: QR_DEBUG ? `QR belongs to: ${qrOwner[0].id_number}` : undefined,
        });
      }

      if (!voter.qr_token) {
        await safeUnlink(req.file.path);
        return res.status(500).json({ message: "Voter record missing qr_token. Admin must enroll QR token first." });
      }
    }

    // Election gate
    const c = getTokenContract();
    const eid = await getCurrentElectionId(c);
    if (!eid) return res.status(403).json({ message: "No draft election. Admin must create draft first." });

    const st = await getElectionState(c, eid);
    if (st.configured && st.started) return res.status(403).json({ message: "Token request closed (period started)" });
    if (st.configured && st.ended) return res.status(403).json({ message: "Election ended" });

    const [stDb] = await connection.execute(
      `SELECT voted_at FROM voter_election WHERE voter_uuid=? AND election_id=? LIMIT 1`,
      [voter.uuid, eid]
    );
    if (stDb.length > 0 && stDb[0].voted_at) {
      return res.status(403).json({ message: "Already voted in this election" });
    }

    // Issue token on-chain
    const issued = await issueTokenForElection(eid);
    const remainSec = issued.expiresAt - Math.floor(Date.now() / 1000);
    const mins = Math.max(0, Math.ceil(remainSec / 60));

    await connection.execute(
      `INSERT INTO voter_election (voter_uuid, election_id, registered_at, token_issued_at, token_sent_at, token_expires_at)
       VALUES (?, ?, NOW(), NOW(), NOW(), ?)
       ON DUPLICATE KEY UPDATE
         token_issued_at=NOW(),
         token_sent_at=NOW(),
         token_expires_at=VALUES(token_expires_at)`,
      [voter.uuid, eid, issued.expiresAt]
    );

    await connection.execute(
      `INSERT INTO voter_contacts (voter_uuid, phone, email)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         phone=VALUES(phone),
         email=VALUES(email),
         updated_at=CURRENT_TIMESTAMP`,
      [voter.uuid, cleanPhone, cleanEmail]
    );

    await sendEmail(
      cleanEmail,
      "KampuVote Voting Token",
      `Your voting token (blockchain):\n\n` +
        `Election ID: ${eid}\n` +
        `ID: ${id}\n` +
        `TOKEN: ${issued.tokenHex}\n\n` +
        `Expires in ~${mins} minutes.\n`
    );

    return res.json({ message: "Token sent to email.", election_id: eid, expires_at: issued.expiresAt });
  } catch (err) {
    console.error(err);
    await safeUnlink(req.file?.path);
    return res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    try { if (connection) await connection.end(); } catch {}
  }
});

// Candidates list for mobile
app.get("/api/candidates", authRequired, async (_req, res) => {
  try {
    const c = getTokenContract();
    const eid = await getCurrentElectionId(c);
    if (!eid) return res.json([]);

    const list = await fetchCandidatesForElection(c, eid);
    return res.json(list.filter((x) => x.is_active));
  } catch (e) {
    return res.status(500).json({ message: "Fetch candidates failed", error: e.message });
  }
});

// Vote
app.post("/api/vote", authRequired, async (req, res) => {
  let connection;
  try {
    const { token, candidate_id } = req.body;
    if (!token || !candidate_id) return res.status(400).json({ message: "Missing token or candidate_id" });

    const voter_uuid = String(req.user?.uuid || "");
    if (!voter_uuid) return res.status(401).json({ message: "Invalid session" });

    const c = getTokenContract();
    const eid = await getCurrentElectionId(c);
    if (!eid) return res.status(403).json({ message: "No election configured" });

    const st = await getElectionState(c, eid);
    if (!st.configured) return res.status(403).json({ message: "Election not configured yet" });
    if (!(st.chainNow >= st.start && st.chainNow < st.end)) {
      return res.status(403).json({ message: "Voting not active" });
    }

    connection = await mysql.createConnection(DB_CONFIG);
    await connection.beginTransaction();

    const [stDb] = await connection.execute(
      `SELECT voted_at FROM voter_election
       WHERE voter_uuid=? AND election_id=? LIMIT 1 FOR UPDATE`,
      [voter_uuid, eid]
    );

    if (stDb.length === 0) {
      await connection.rollback();
      return res.status(403).json({ message: "You must request token first" });
    }
    if (stDb[0].voted_at) {
      await connection.rollback();
      return res.status(403).json({ message: "Already voted in this election" });
    }

    const tokenHex = String(token).trim();
    const candidateId = Number(candidate_id);

    const tx = await c.voteWithToken(eid, tokenHex, candidateId);
    await tx.wait();

    await connection.execute(
      `UPDATE voter_election SET voted_at=NOW()
       WHERE voter_uuid=? AND election_id=?`,
      [voter_uuid, eid]
    );

    await connection.commit();
    return res.json({ message: "Vote successful", election_id: eid, tx_hash: tx.hash });
  } catch (e) {
    try { if (connection) await connection.rollback(); } catch {}
    const msg = extractEthersError(e);
    return res.status(500).json({ message: "Vote failed", error: msg });
  } finally {
    try { if (connection) await connection.end(); } catch {}
  }
});

// Verify token
app.post("/api/verify-voting-token", authRequired, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Missing token" });

    const tokenHex = String(token).trim();
    const c = getTokenContract();
    const eid = await getCurrentElectionId(c);
    if (!eid) return res.status(403).json({ message: "No election configured" });

    const ok = await c.validateToken(eid, tokenHex);
    if (!ok) return res.status(401).json({ message: "Invalid/expired/used token" });

    return res.json({ message: "Token is valid", election_id: eid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Debug token
app.post("/api/debug-token", authRequired, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Missing token" });

    const tokenHex = String(token).trim();
    const c = getTokenContract();
    const eid = await getCurrentElectionId(c);
    if (!eid) return res.status(403).json({ message: "No election configured" });

    const info = await c.tokens(eid, tokenHex);
    const expiresAt = Number(info?.expiresAt ?? info?.[0] ?? 0);
    const used = Boolean(info?.used ?? info?.[1] ?? false);

    const ok = await c.validateToken(eid, tokenHex);
    const st = await getElectionState(c, eid);

    return res.json({ election_id: eid, token: tokenHex, expiresAt, used, chainNow: st.chainNow, validateToken: ok });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "debug-token failed", error: String(e.message || e) });
  }
});

// Admin results totals only
app.get("/api/admin/results", adminRequired, async (_req, res) => {
  try {
    const c = getTokenContract();
    const eid = await getCurrentElectionId(c);
    if (!eid) return res.json([]);

    const list = await fetchCandidatesForElection(c, eid);
    list.sort((a, b) => b.voteCount - a.voteCount);
    return res.json(list);
  } catch (e) {
    return res.status(500).json({ message: "Fetch results failed", error: e.message });
  }
});

// ✅ Admin report current + lists (FIX: no LIMIT ?)
app.get("/api/admin/report/current", adminRequired, async (req, res) => {
  let connection;
  try {
    const includeLists = String(req.query.lists || "0") === "1";
    const limit = Math.max(1, Math.min(Number(req.query.limit || 500), 5000));
    const lim = Math.floor(limit);

    const c = getTokenContract();
    const eid = await getCurrentElectionId(c);
    if (!eid) return res.status(400).json({ message: "No election (create draft first)" });

    const st = await getElectionState(c, eid);

    connection = await mysql.createConnection(DB_CONFIG);

    const [[regRow]] = await connection.execute(
      `SELECT COUNT(*) AS registered FROM voter_election WHERE election_id=?`,
      [eid]
    );
    const [[voteRow]] = await connection.execute(
      `SELECT COUNT(*) AS voted FROM voter_election WHERE election_id=? AND voted_at IS NOT NULL`,
      [eid]
    );

    const registered = Number(regRow.registered || 0);
    const voted = Number(voteRow.voted || 0);

    const candidates = await fetchCandidatesForElection(c, eid);
    candidates.sort((a, b) => b.voteCount - a.voteCount);
    const winner = candidates.length ? candidates[0] : null;

    const refMs = (st.configured && st.start ? st.start : st.chainNow) * 1000;

    let votersVoted = undefined;
    let votersRegisteredNotVoted = undefined;
    let votersNotRegistered = undefined;

    if (includeLists) {
      const [vv] = await connection.execute(
        `SELECT ve.voter_uuid, v.id_number, v.name_en, v.name_kh, v.dob_iso, v.expiry_date, ve.voted_at
         FROM voter_election ve
         JOIN voters v ON v.uuid = ve.voter_uuid
         WHERE ve.election_id=? AND ve.voted_at IS NOT NULL
         ORDER BY ve.voted_at DESC
         LIMIT ${lim}`,
        [eid]
      );
      votersVoted = vv.map((r) => ({
        voter_uuid: r.voter_uuid,
        id_number: r.id_number,
        name_en: r.name_en,
        name_kh: r.name_kh,
        voted_at: r.voted_at,
        ...eligibilityFlags(r, refMs),
      }));

      const [rnv] = await connection.execute(
        `SELECT ve.voter_uuid, v.id_number, v.name_en, v.name_kh, v.dob_iso, v.expiry_date,
                ve.registered_at, ve.token_expires_at
         FROM voter_election ve
         JOIN voters v ON v.uuid = ve.voter_uuid
         WHERE ve.election_id=? AND ve.voted_at IS NULL
         ORDER BY ve.registered_at DESC
         LIMIT ${lim}`,
        [eid]
      );
      votersRegisteredNotVoted = rnv.map((r) => ({
        voter_uuid: r.voter_uuid,
        id_number: r.id_number,
        name_en: r.name_en,
        name_kh: r.name_kh,
        registered_at: r.registered_at,
        token_expires_at: r.token_expires_at,
        ...eligibilityFlags(r, refMs),
      }));

      const [nr] = await connection.execute(
        `SELECT v.uuid AS voter_uuid, v.id_number, v.name_en, v.name_kh, v.dob_iso, v.expiry_date
         FROM voters v
         LEFT JOIN voter_election ve
           ON ve.voter_uuid = v.uuid AND ve.election_id = ?
         WHERE ve.voter_uuid IS NULL
         ORDER BY v.id_number ASC
         LIMIT ${lim}`,
        [eid]
      );
      votersNotRegistered = nr.map((r) => ({
        voter_uuid: r.voter_uuid,
        id_number: r.id_number,
        name_en: r.name_en,
        name_kh: r.name_kh,
        ...eligibilityFlags(r, refMs),
      }));
    }

    return res.json({
      election_id: eid,
      configured: st.configured,
      start_ts: st.start,
      end_ts: st.end,
      chain_now_ts: st.chainNow,
      registered,
      voted,
      registered_not_voted: Math.max(0, registered - voted),
      winner,
      candidates,

      votersVoted,
      votersRegisteredVoted: votersVoted, // alias
      votersRegisteredNotVoted,
      votersNotRegistered,
    });
  } catch (e) {
    console.error("❌ REPORT CURRENT ERROR:", e);
    return res.status(500).json({ message: "Report failed", error: String(e.message || e) });
  } finally {
    try { if (connection) await connection.end(); } catch {}
  }
});

// ✅ Admin report by electionId + lists (FIX: no LIMIT ?)
app.get("/api/admin/report/:electionId", adminRequired, async (req, res) => {
  let connection;
  try {
    const includeLists = String(req.query.lists || "0") === "1";
    const limit = Math.max(1, Math.min(Number(req.query.limit || 500), 5000));
    const lim = Math.floor(limit);

    const electionId = Number(req.params.electionId);
    if (!Number.isFinite(electionId) || electionId <= 0) return res.status(400).json({ message: "Bad electionId" });

    const c = getTokenContract();

    const configured = Boolean(await c.electionConfigured(electionId));
    const start = configured ? Number(await c.votingStart(electionId)) : 0;
    const end = configured ? Number(await c.votingEnd(electionId)) : 0;

    connection = await mysql.createConnection(DB_CONFIG);

    const [[regRow]] = await connection.execute(
      `SELECT COUNT(*) AS registered FROM voter_election WHERE election_id=?`,
      [electionId]
    );
    const [[voteRow]] = await connection.execute(
      `SELECT COUNT(*) AS voted FROM voter_election WHERE election_id=? AND voted_at IS NOT NULL`,
      [electionId]
    );

    const registered = Number(regRow.registered || 0);
    const voted = Number(voteRow.voted || 0);

    const candidates = await fetchCandidatesForElection(c, electionId);
    candidates.sort((a, b) => b.voteCount - a.voteCount);
    const winner = candidates.length ? candidates[0] : null;

    const refMs = (configured && start ? start * 1000 : Date.now());

    let votersVoted = undefined;
    let votersRegisteredNotVoted = undefined;
    let votersNotRegistered = undefined;

    if (includeLists) {
      const [vv] = await connection.execute(
        `SELECT ve.voter_uuid, v.id_number, v.name_en, v.name_kh, v.dob_iso, v.expiry_date, ve.voted_at
         FROM voter_election ve
         JOIN voters v ON v.uuid = ve.voter_uuid
         WHERE ve.election_id=? AND ve.voted_at IS NOT NULL
         ORDER BY ve.voted_at DESC
         LIMIT ${lim}`,
        [electionId]
      );
      votersVoted = vv.map((r) => ({
        voter_uuid: r.voter_uuid,
        id_number: r.id_number,
        name_en: r.name_en,
        name_kh: r.name_kh,
        voted_at: r.voted_at,
        ...eligibilityFlags(r, refMs),
      }));

      const [rnv] = await connection.execute(
        `SELECT ve.voter_uuid, v.id_number, v.name_en, v.name_kh, v.dob_iso, v.expiry_date,
                ve.registered_at, ve.token_expires_at
         FROM voter_election ve
         JOIN voters v ON v.uuid = ve.voter_uuid
         WHERE ve.election_id=? AND ve.voted_at IS NULL
         ORDER BY ve.registered_at DESC
         LIMIT ${lim}`,
        [electionId]
      );
      votersRegisteredNotVoted = rnv.map((r) => ({
        voter_uuid: r.voter_uuid,
        id_number: r.id_number,
        name_en: r.name_en,
        name_kh: r.name_kh,
        registered_at: r.registered_at,
        token_expires_at: r.token_expires_at,
        ...eligibilityFlags(r, refMs),
      }));

      const [nr] = await connection.execute(
        `SELECT v.uuid AS voter_uuid, v.id_number, v.name_en, v.name_kh, v.dob_iso, v.expiry_date
         FROM voters v
         LEFT JOIN voter_election ve
           ON ve.voter_uuid = v.uuid AND ve.election_id = ?
         WHERE ve.voter_uuid IS NULL
         ORDER BY v.id_number ASC
         LIMIT ${lim}`,
        [electionId]
      );
      votersNotRegistered = nr.map((r) => ({
        voter_uuid: r.voter_uuid,
        id_number: r.id_number,
        name_en: r.name_en,
        name_kh: r.name_kh,
        ...eligibilityFlags(r, refMs),
      }));
    }

    return res.json({
      election_id: electionId,
      configured,
      start_ts: start,
      end_ts: end,
      registered,
      voted,
      registered_not_voted: Math.max(0, registered - voted),
      winner,
      candidates,

      votersVoted,
      votersRegisteredVoted: votersVoted, // alias
      votersRegisteredNotVoted,
      votersNotRegistered,
    });
  } catch (e) {
    console.error("❌ REPORT BY ID ERROR:", e);
    return res.status(500).json({ message: "Report failed", error: String(e.message || e) });
  } finally {
    try { if (connection) await connection.end(); } catch {}
  }
});

// Public voting status
app.get("/api/voting-status", async (_req, res) => {
  try {
    const c = getTokenContract();
    const eid = Number(await c.currentElectionId());
    if (!eid) return res.json({ election_id: 0, configured: false, phase: "NONE" });

    const st = await getElectionState(c, eid);

    let phase = "DRAFT";
    if (st.configured) {
      if (st.chainNow >= st.end) phase = "ENDED";
      else if (st.chainNow >= st.start) phase = "ACTIVE";
      else phase = "BEFORE_START";
    }

    return res.json({
      election_id: eid,
      configured: st.configured,
      start_ts: st.start,
      end_ts: st.end,
      chain_now_ts: st.chainNow,
      phase,
      active_chain: st.configured && st.chainNow >= st.start && st.chainNow < st.end,
    });
  } catch (e) {
    return res.status(500).json({ message: "Fetch voting status failed", error: e.message });
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