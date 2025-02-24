import { DataTypes, Sequelize } from "sequelize";
import bcrypt from "bcryptjs";
import sequelize from "../config/database.js";
import User from "./userModel.js";

const Wallet = sequelize.define("Wallet", {
  userId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: "usdt",
  },
  balance: {
    type: DataTypes.DECIMAL(18,8),
    defaultValue: 0,
  },
  walletAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
});
Wallet.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id", // Match the reference_id field in Transactions
  onDelete: "CASCADE", // Cascade delete to clean up related records
  onUpdate: "CASCADE",
});
