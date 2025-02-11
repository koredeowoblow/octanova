import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,    
      validate: {
        len: {
          args: [3, 30],
          msg: 'Username must be between 3 and 30 characters long.',
        },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'unique_email', // Use a named unique constraint
      validate: {
        isEmail: {
          msg: 'Email address must be valid.',
        },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [6, 100],
          msg: 'Password must be between 6 and 100 characters long.',
        },
      },
    },
    pin: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [4],
          msg: 'Pin must be aleast 4 long.',
        },
      },
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'moderator'),
      defaultValue: 'user',
      allowNull: false,
    },
    account_balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verification:{
        type:DataTypes.BOOLEAN,
        defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
        if (user.pin) {
          const salt = await bcrypt.genSalt(10);
          user.pin = await bcrypt.hash(user.pin,salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
        if (user.changed('pin')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.pin, salt);
        }
      },
    },
    timestamps: true, // Manages createdAt and updatedAt automatically
  }
);

// Instance methods
User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Filter sensitive data when converting to JSON
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.resetPasswordToken;
  delete values.resetPasswordExpires;
  return values;
};

export default User;
