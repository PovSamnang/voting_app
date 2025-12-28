// // models/voter.js
// module.exports = (sequelize, DataTypes) => {
//   const Voter = sequelize.define('Voter', {
//     id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
//     idNumber: { type: DataTypes.STRING(64), unique: true, allowNull: false },
//     name: { type: DataTypes.STRING(255) },
//     gender: { type: DataTypes.STRING(8) },
//     dob: { type: DataTypes.DATEONLY },
//     nationality: { type: DataTypes.STRING(64) },
//     address: { type: DataTypes.TEXT },
//     issueDate: { type: DataTypes.DATEONLY },
//     expiryDate: { type: DataTypes.DATEONLY },
//     photoPath: { type: DataTypes.STRING(512) },
//     qrPath: { type: DataTypes.STRING(512) },
//     salt: { type: DataTypes.STRING(128) },
//     hash: { type: DataTypes.STRING(128) }
//   }, {
//     tableName: 'voters',
//     timestamps: true
//   });

//   return Voter;
// };
