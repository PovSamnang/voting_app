// import 'dart:convert';
// import 'package:flutter/material.dart';
// import 'package:voting_app/model/voter_model.dart';

// class IDCardScreen extends StatelessWidget {
//   final Voter voter;

//   const IDCardScreen({super.key, required this.voter});
  

//   @override
//   Widget build(BuildContext context) {
    
//     return Scaffold(
      
//       backgroundColor: Colors.grey.shade300,
//       body: Center(
//         child: Container(
//           width: 380,
//           height: 240,
//           decoration: BoxDecoration(
//             color: Colors.white,
//             // Background pattern
//             image: const DecorationImage(
//               image: AssetImage("assets/bg_pattern.png"),
//               fit: BoxFit.cover,
//               opacity: 0.15,
//             ),
//             borderRadius: BorderRadius.circular(12),
//             boxShadow: const [
//               BoxShadow(
//                 color: Colors.black26,
//                 blurRadius: 10,
//                 offset: Offset(0, 4),
//               ),
//             ],
//           ),
//           child: Stack(
//             children: [
//               // 1. Red ID Number (Absolute Top Right)
//               Positioned(
//                 top: 10,
//                 right: 14,
//                 child: Text(
//                   voter.idNumber,
//                   style: const TextStyle(
//                     fontFamily: 'Courier',
//                     color: Color(0xFFD32F2F), // ID Red
//                     fontSize: 18,
//                     fontWeight: FontWeight.w900,
//                     letterSpacing: 1.0,
//                   ),
//                 ),
//               ),

//               // 2. Main Content
//               Padding(
//                 padding: const EdgeInsets.fromLTRB(10, 15, 10, 0),
//                 child: Column(
//                   children: [
//                     Expanded(
//                       child: Row(
//                         crossAxisAlignment: CrossAxisAlignment.start,
//                         children: [
//                           // --- COL 1: PHOTO ---
//                           Column(
//                             children: [
//                               Container(
//                                 width: 85,
//                                 height: 110,
//                                 decoration: BoxDecoration(
//                                   border: Border.all(color: Colors.grey.shade300),
//                                   borderRadius: BorderRadius.circular(4),
//                                 ),
//                                 child: ClipRRect(
//                                   borderRadius: BorderRadius.circular(3),
//                                   child: Image.memory(
//                                     base64Decode(
//                                       voter.photo.replaceAll(RegExp(r'data:image/[^;]+;base64,'), ''),
//                                     ),
//                                     fit: BoxFit.cover,
//                                     errorBuilder: (context, error, stackTrace) =>
//                                         const Icon(Icons.person, size: 50, color: Colors.grey),
//                                   ),
//                                 ),
//                               ),
//                             ],
//                           ),

//                           const SizedBox(width: 8),

//                           // --- COL 2: TEXT DETAILS (Flexible Width) ---
//                           Expanded(
//                             child: Column(
//                               crossAxisAlignment: CrossAxisAlignment.start,
//                               children: [
//                                 const SizedBox(height: 18), // Space for ID Number above
                                
//                                 // Name Khmer
//                                 _buildRichText("គោត្តនាម និងនាម:", voter.nameKh, isHeader: true),
                                
//                                 // Name Latin
//                                 Text(
//                                   voter.nameEn.toUpperCase(),
//                                   style: const TextStyle(
//                                     fontSize: 12,
//                                     fontWeight: FontWeight.bold,
//                                     letterSpacing: 0.1,
//                                   ),
//                                   maxLines: 1,
//                                   overflow: TextOverflow.ellipsis,
//                                 ),
//                                 const SizedBox(height: 2),

//                                 // DOB, Gender, Height
//                                 Wrap(
//                                   spacing: 4,
//                                   children: [
//                                     _buildField("ថ្ងៃខែឆ្នាំកំណើត:", voter.dobDisplay),
//                                     _buildField("ភេទ:", voter.gender),
//                                     _buildField("កម្ពស់:", "${voter.height}cm"),
//                                   ],
//                                 ),

//                                 _buildField("ទីកន្លែងកំណើត:", voter.pob),
//                                 _buildField("អាសយដ្ឋាន:", voter.address),
                                
//                                 // Dates
//                                 Padding(
//                                   padding: const EdgeInsets.only(top: 2.0),
//                                   child: Text(
//                                     "សុពលភាព: ${voter.issuedDate} ដល់ថ្ងៃ ${voter.expiryDate}",
//                                     style: _khmerStyle(9),
//                                   ),
//                                 ),
//                               ],
//                             ),
//                           ),

//                           const SizedBox(width: 4),

//                           // --- COL 3: QR CODE (Restored) ---
//                           Column(
//                             mainAxisAlignment: MainAxisAlignment.center,
//                             children: [
//                               Container(
//                                 decoration: BoxDecoration(
//                                   border: Border.all(color: Colors.black12),
//                                   borderRadius: BorderRadius.circular(4),
//                                   color: Colors.white,
//                                 ),
//                                 padding: const EdgeInsets.all(5),
//                                 child: Image.memory(
//                                   base64Decode(
//                                     voter.qrcode.replaceAll(RegExp(r'data:image/[^;]+;base64,'), ''),
//                                   ),
//                                   width: 65, // Slightly smaller to fit layout
//                                   height: 65,
//                                   fit: BoxFit.cover,
//                                   errorBuilder: (context, error, stackTrace) {
//                                     return const SizedBox(
//                                       width: 65,
//                                       height: 65,
//                                       child: Icon(Icons.qr_code, size: 40),
//                                     );
//                                   },
//                                 ),
//                               ),
//                             ],
//                           )
//                         ],
//                       ),
//                     ),

//                     // 3. MRZ Code (Bottom)
//                     Container(
//                       width: double.infinity,
//                       padding: const EdgeInsets.only(bottom: 30),
//                       child: Column(
//                         crossAxisAlignment: CrossAxisAlignment.start,
//                         children: [
//                           _buildMrzText(voter.mrz1),
//                           _buildMrzText(voter.mrz2),
//                           _buildMrzText(voter.mrz3),
//                         ],
//                       ),
//                     ),
//                   ],
//                 ),
//               ),
//             ],
//           ),
//         ),
//       ),
//     );
//   }


//   // --- Helper Methods ---

//   TextStyle _khmerStyle(double size, {bool isBold = false}) {
//     return TextStyle(
//       fontFamily: "Khmer OS Battambang",
//       fontSize: size,
//       color: Colors.black87,
//       fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
//       height: 1.1,
//     );
//   }

//   Widget _buildField(String label, String value) {
//     return RichText(
//       overflow: TextOverflow.ellipsis,
//       text: TextSpan(
//         style: const TextStyle(color: Colors.black),
//         children: [
//           TextSpan(text: "$label ", style: _khmerStyle(9)),
//           TextSpan(text: value, style: _khmerStyle(9, isBold: true)),
//         ],
//       ),
//     );
//   }

//   Widget _buildRichText(String label, String value, {bool isHeader = false}) {
//     return RichText(
//       maxLines: 1,
//       overflow: TextOverflow.ellipsis,
//       text: TextSpan(
//         style: const TextStyle(color: Colors.black),
//         children: [
//           TextSpan(text: "$label ", style: _khmerStyle(isHeader ? 9 : 9)),
//           TextSpan(text: value, style: _khmerStyle(isHeader ? 14 : 9, isBold: true)),
//         ],
//       ),
//     );
//   }

//   Widget _buildMrzText(String text) {
//     if (text.isEmpty) return const SizedBox.shrink();
//     return Text(
//       text,
//       style: const TextStyle(
//         fontFamily: "Courier New",
//         fontSize: 12,
//         fontWeight: FontWeight.w600,
//         letterSpacing: 1.5,
//         height: 1.0,
//         color: Colors.black87,
//       ),
//       overflow: TextOverflow.visible,
//       softWrap: false,
//     );
//   }
// }