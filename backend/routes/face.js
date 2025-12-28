// import express from "express";
// import axios from "axios";
// import mysql from "mysql2/promise";
// import fs from "fs";

// const router = express.Router();

// const db = await mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "Iphone168$$",
//   database: "voting_system",
// });

// // Face++ keys from .env
// const FACEPP_KEY = process.env.FACEPP_KEY;
// const FACEPP_SECRET = process.env.FACEPP_SECRET;

// // POST /face/verify
// router.post("/verify", async (req, res) => {
//   try {
//     const { uuid, selfie } = req.body;

//     if (!uuid || !selfie) {
//       return res.status(400).json({ error: "uuid and selfie required" });
//     }

//     // 1. Get stored ID photo (base64) from DB
//     const [rows] = await db.query(
//       "SELECT photo FROM voters WHERE uuid = ?",
//       [uuid]
//     );

//     if (rows.length === 0) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const idPhoto = rows[0].photo.replace(/^data:image\/\w+;base64,/, "");

//     // 2. Prepare Face++ compare API call
//     const formData = new URLSearchParams();
//     formData.append("api_key", FACEPP_KEY);
//     formData.append("api_secret", FACEPP_SECRET);
//     formData.append("image_base64_1", idPhoto);
//     formData.append("image_base64_2", selfie.replace(/^data:image\/\w+;base64,/, ""));

//     // 3. Request Face++
//     const response = await axios.post(
//       "https://api-us.faceplusplus.com/facepp/v3/compare",
//       formData,
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );

//     const { confidence } = response.data;

//     return res.json({
//       success: true,
//       confidence,
//       isMatch: confidence >= 75, // 75% or higher = match
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: "Face verification failed" });
//   }
// });

// export default router;
