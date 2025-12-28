// import 'dart:convert';
// import 'package:flutter/material.dart';
// import 'package:flutter_svg/flutter_svg.dart';

// class IDCard extends StatelessWidget {
//   final Map<String, dynamic> user;

//   const IDCard({super.key, required this.user});

//   @override
//   Widget build(BuildContext context) {
//     final qrBytes = base64Decode(
//         user["qrcode"].replaceFirst("data:image/png;base64,", ""));

//     final photoBytes = base64Decode(
//         user["photo"].replaceFirst("data:image/svg+xml;base64,", ""));

//     return Container(
//       width: 350,
//       height: 540,
//       padding: const EdgeInsets.all(16),
//       decoration: BoxDecoration(
//         color: Colors.white,
//         borderRadius: BorderRadius.circular(16),
//         border: Border.all(width: 1.5, color: Colors.grey.shade700),
//         boxShadow: const [
//           BoxShadow(
//             color: Colors.black12,
//             blurRadius: 12,
//             spreadRadius: 2,
//           )
//         ],
//       ),
//       child: Column(
//         crossAxisAlignment: CrossAxisAlignment.start,
//         children: [

//           // --- ID Title ---
//           Center(
//             child: Column(
//               children: [
//                 const Text(
//                   "អត្តសញ្ញាណប័ណ្ណ",
//                   style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
//                 ),
//                 Text(
//                   "KINGDOM OF CAMBODIA",
//                   style: TextStyle(
//                     fontSize: 14,
//                     letterSpacing: 1.2,
//                     color: Colors.grey.shade700,
//                   ),
//                 ),
//               ],
//             ),
//           ),

//           const SizedBox(height: 10),

//           // --- PHOTO & BASIC INFO ---
//           Row(
//             crossAxisAlignment: CrossAxisAlignment.start,
//             children: [
//               // PHOTO
//               ClipRRect(
//                 borderRadius: BorderRadius.circular(8),
//                 child: Container(
//                   width: 120,
//                   height: 150,
//                   color: Colors.grey.shade200,
//                   child: SvgPicture.memory(photoBytes, fit: BoxFit.cover),
//                 ),
//               ),
//               const SizedBox(width: 16),

//               // BASIC INFO
//               Expanded(
//                 child: Column(
//                   crossAxisAlignment: CrossAxisAlignment.start,
//                   children: [
//                     Text(user["name_kh"],
//                         style: const TextStyle(
//                             fontSize: 18, fontWeight: FontWeight.bold)),

//                     Text(user["name_en"],
//                         style:
//                             const TextStyle(fontSize: 16, letterSpacing: 1.2)),

//                     const SizedBox(height: 6),
//                     Text("ID: ${user["id_number"]}",
//                         style: const TextStyle(fontSize: 14)),
//                     Text("Gender: ${user["gender"]}",
//                         style: const TextStyle(fontSize: 14)),
//                     Text("Height: ${user["height"]} cm",
//                         style: const TextStyle(fontSize: 14)),
//                   ],
//                 ),
//               )
//             ],
//           ),

//           const SizedBox(height: 12),
//           // --- MAIN DETAILS ---
//           buildLabelValue("Date of Birth", user["dob"]),
//           buildLabelValue("Place of Birth", user["pob"]),
//           buildLabelValue("Address", user["address"]),

//           const SizedBox(height: 6),
//           buildLabelValue("Issued Date", user["issued_date"]),
//           buildLabelValue("Expiry Date", user["expiry_date"]),

//           const SizedBox(height: 20),

//           // --- QR + MRZ ---
//           Row(
//             children: [
//               // QR Code
//               Container(
//                 width: 110,
//                 height: 110,
//                 padding: const EdgeInsets.all(4),
//                 decoration: BoxDecoration(
//                   border: Border.all(color: Colors.black54),
//                 ),
//                 child: Image.memory(qrBytes),
//               ),

//               const SizedBox(width: 12),

//               // MRZ BLOCK
//               Expanded(
//                 child: Column(
//                   crossAxisAlignment: CrossAxisAlignment.start,
//                   children: [
//                     Text(user["mrz_line1"],
//                         style: const TextStyle(
//                             fontFamily: "monospace", fontSize: 12)),
//                     Text(user["mrz_line2"],
//                         style: const TextStyle(
//                             fontFamily: "monospace", fontSize: 12)),
//                     Text(user["mrz_line3"],
//                         style: const TextStyle(
//                             fontFamily: "monospace", fontSize: 12)),
//                   ],
//                 ),
//               )
//             ],
//           )
//         ],
//       ),
//     );
//   }

//   Widget buildLabelValue(String label, String value) {
//     return Padding(
//       padding: const EdgeInsets.only(bottom: 4),
//       child: RichText(
//         text: TextSpan(
//           children: [
//             TextSpan(
//               text: "$label: ",
//               style: const TextStyle(
//                   fontWeight: FontWeight.bold,
//                   color: Colors.black,
//                   fontSize: 14),
//             ),
//             TextSpan(
//               text: value,
//               style: const TextStyle(color: Colors.black, fontSize: 14),
//             ),
//           ],
//         ),
//       ),
//     );
//   }
// }
