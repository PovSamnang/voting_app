class Voter {
  final String uuid;
  final String idNumber;
  final String nameKh;
  final String nameEn;
  final String gender;
  final String height;
  final String dobDisplay;
  final DateTime dobIso;
  final String pob;
  final String address;
  final String issuedDate;
  final String expiryDate;
  final String mrz1;
  final String mrz2;
  final String mrz3;
  final bool isValidVoter;
  final String qrcode;
  final String photo;

  Voter({
    required this.uuid,
    required this.idNumber,
    required this.nameKh,
    required this.nameEn,
    required this.gender,
    required this.height,
    required this.dobDisplay,
    required this.dobIso,
    required this.pob,
    required this.address,
    required this.issuedDate,
    required this.expiryDate,
    required this.mrz1,
    required this.mrz2,
    required this.mrz3,
    required this.isValidVoter,
    required this.qrcode,
    required this.photo,
  });

  factory Voter.fromJson(Map<String, dynamic> json) {
    return Voter(
      uuid: json['uuid'],
      idNumber: json['id_number'],
      nameKh: json['name_kh'] ?? '',
      nameEn: json['name_en'] ?? '',
      gender: json['gender'] ?? '',
      height: json['height'] ?? '',
      dobDisplay: json['dob_display'] ?? '',
      dobIso: DateTime.tryParse(json['dob_iso'] ?? '') ?? DateTime(1900),
      pob: json['pob'] ?? '',
      address: json['address'] ?? '',
      issuedDate: json['issued_date'] ?? '',
      expiryDate: json['expiry_date'] ?? '',
      mrz1: json['mrz_line1'] ?? '',
      mrz2: json['mrz_line2'] ?? '',
      mrz3: json['mrz_line3'] ?? '',
      isValidVoter: json['is_valid_voter'] == 1 || json['is_valid_voter'] == true,
      qrcode: json['qrcode'] ?? '',
      photo: json['photo'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'uuid': uuid,
      'id_number': idNumber,
      'name_kh': nameKh,
      'name_en': nameEn,
      'gender': gender,
      'height': height,
      'dob_display': dobDisplay,
      'dob_iso': dobIso.toIso8601String(),
      'pob': pob,
      'address': address,
      'issued_date': issuedDate,
      'expiry_date': expiryDate,
      'mrz_line1': mrz1,
      'mrz_line2': mrz2,
      'mrz_line3': mrz3,
      'is_valid_voter': isValidVoter,
      'qrcode': qrcode,
      'photo': photo,
    };
  }
}
