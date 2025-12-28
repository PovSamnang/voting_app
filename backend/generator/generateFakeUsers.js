import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { faker } from '@faker-js/faker';
import QRCode from 'qrcode';
import sharp from 'sharp'; 

// Database connection 
const db = await mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Iphone168$$",
  database: "voting_system",
});

const photosDir = path.join(process.cwd(), "photos");

async function loadAndResizeImages() {
  const fileNames = ["1.jpg", "2.jpg", "3.jpg", "4.jpg"]; 
  const resizedImages = [];

  console.log("🔄 Processing and resizing images...");

  for (const file of fileNames) {
    const filePath = path.join(photosDir, file);
    
    const buffer = await sharp(filePath)
      .resize(500) 
      .jpeg({ quality: 80 }) 
      .toBuffer();
    resizedImages.push(buffer.toString('base64'));
  }
  return resizedImages;
}

const provinces_kh = ["ភ្នំពេញ", "បាត់ដំបង", "សៀមរាប", "កំពង់ចាម", "ព្រះសីហនុ"];
const villages_kh = ["ត្រពាំងដុំ", "ត្រពាំងឫស្សី", "ជ្រោយចង្ហា", "ត្រពាំងបី", "កំពង់ត្រឡាច"]
const names_db = [
  {"kh": "សុខ", "en": "SOK"}, {"kh": "សៅ", "en": "SAO"}, 
  {"kh": "ចាន់", "en": "CHAN"}, {"kh": "ពិសិដ្ឋ", "en": "PISETH"},
  {"kh": "ដារ៉ា", "en": "DARA"}, {"kh": "រតនា", "en": "RATANA"}
];
const family_names_db = [
  {"kh": "កែវ", "en": "KEO"}, {"kh": "លី", "en": "LY"},
  {"kh": "ម៉ៅ", "en": "MAO"}, {"kh": "ពៅ", "en": "POV"}
];

function formatDisplayDate(d) {
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}
function toISO(d) {
  return d.toISOString().split("T")[0];
}

function generateMRZ(id, dob, exp, gender, last, first) {
  const dobStr = dob.toISOString().slice(2,10).replace(/-/g,"");
  const expStr = exp.toISOString().slice(2,10).replace(/-/g,"");
  return [
    `IDKHM${id}<<<<<<<<<<<<<<<<<<<<<`.slice(0,30),
    `${dobStr}8${gender}${expStr}4KHM<<<<<<<<<<<0`,
    `${last}<<${first}<<<<<<<<<<<<<<<<<<<<<`.slice(0,30),
  ];
}

async function generateUsers(count, facePhotos) {
  console.log("⏳ Generating " + count + " voters...");

  for (let i = 0; i < count; i++) {
    const family = faker.helpers.arrayElement(family_names_db);
    const given = faker.helpers.arrayElement(names_db);
    const name_kh = `${family.kh} ${given.kh}`;
    const name_en = `${family.en} ${given.en}`;
    const id_number = faker.string.numeric(10);
    const gender = faker.helpers.arrayElement(["M","F"]);
    const height = faker.number.int({min:150, max:185}).toString();
    const age = faker.number.int({min:15,max:70});
    const dob = faker.date.past({years: age});
    dob.setFullYear(new Date().getFullYear() - age);
    const issued = faker.date.past({years: 5});
    const expiry = new Date(issued);
    expiry.setFullYear(expiry.getFullYear()+10);
    const province = faker.helpers.arrayElement(provinces_kh);
    const village = faker.helpers.arrayElement(villages_kh);
    const pob = `${village} ស្រុក${province} ${province}`;
    const address = `ផ្ទះ${faker.number.int({min:1,max:200})} ក្រុម${faker.number.int({min:1,max:10})} ${village} ស្រុក${province} ${province}`;
    
    const mrz = generateMRZ(id_number, dob, expiry, gender, family.en, given.en);
    
    
    const uuid = faker.string.uuid();
    const qrToken = uuid; 

    
    const qrImage = await QRCode.toDataURL(uuid);

    const facePhoto = faker.helpers.arrayElement(facePhotos);

    await db.query(
      `REPLACE INTO voters 
        (uuid, id_number, name_kh, name_en, gender, height, dob_display, dob_iso, pob, address,
        issued_date, expiry_date, mrz_line1, mrz_line2, mrz_line3, is_valid_voter, qrcode, photo, qr_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid, id_number, name_kh, name_en, gender, height,
        formatDisplayDate(dob), toISO(dob), pob, address,
        formatDisplayDate(issued), formatDisplayDate(expiry),
        mrz[0], mrz[1], mrz[2],
        1, 
        qrImage, 
        facePhoto, 
        qrToken   
      ]
    );

    if ((i+1) % 10 === 0) process.stdout.write(".");
  }
  console.log("\n Users generated");
}

// Execute
(async () => {
  try {
    const resizedPhotos = await loadAndResizeImages();
    await generateUsers(50, resizedPhotos); // Generate 50 users
    process.exit(0);
  } catch (err) {
    console.error(" Error:", err);
    process.exit(1);
  }
})();