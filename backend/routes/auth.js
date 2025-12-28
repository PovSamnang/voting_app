// import express from "express";
// import jwt from "jsonwebtoken";
// import mysql from "mysql2/promise";

// const router = express.Router();

// // SETUP DB CONNECTION
// const db = await mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "Iphone168$$",
//   database: "voting_system",
// });

// //  SECRET KEY FOR JWT
// const JWT_SECRET = "SUPER_SECRET_KEY_CHANGE_THIS";  // change later

// /**
//  * ---------------------------------------------------------
//  *  LOGIN USING UUID FROM QR CODE  (STEP 4)
//  * ---------------------------------------------------------
//  * POST /auth/login-qr
//  * Body: { "qr_uuid": "xxxxx-xxxx-xxxx-xxxx" }
//  */
// router.post("/login-qr", async (req, res) => {
//   try {
//     const { qr_uuid } = req.body;

//     if (!qr_uuid) {
//       return res.status(400).json({ error: "Missing qr_uuid" });
//     }

//     console.log("Login request by QR:", qr_uuid);

//     //  lookup voter in DB
//     const [rows] = await db.query(
//       "SELECT * FROM voters WHERE uuid = ? AND is_valid_voter = 1",
//       [qr_uuid]
//     );

//     if (rows.length === 0) {
//       return res.status(404).json({ error: "Invalid QR Code" });
//     }

//     const voter = rows[0];

//     // generate token valid for 1 hour
//     const token = jwt.sign(
//       { uuid: voter.uuid, id: voter.id_number },
//       JWT_SECRET,
//       { expiresIn: "1h" }
//     );

//     return res.json({
//       success: true,
//       message: "QR login successful",
//       token,
//       voter,
//     });

//   } catch (e) {
//     console.error("Error in /auth/login-qr:", e);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// export default router;
