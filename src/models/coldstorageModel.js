import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import sequelize from "../config/database.js";
import Wallet from "./walletModel.js";

const coldStorage = sequelize.define("Wallet", {
  currency: {
    type: DataTypes.STRING,
    defaultValue: "usdt",
  },
  balance: {
    type: DataTypes.DECIMAL(18, 8),
    defaultValue: 0,
  },
  walletAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  coldStorageKey: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  timestamps: true,
});
coldStorage.belongsTo(Wallet, {
    foreignKey: "walletAddress",
    targetKey: "walletAddress", // Match the reference_id field in Transactions
    onDelete: "CASCADE", // Cascade delete to clean up related records
    onUpdate: "CASCADE",
});

export default coldStorage;
