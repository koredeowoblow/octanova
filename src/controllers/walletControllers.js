import Wallet from "../models/walletModel";
import ColdStorage from "../models/coldstorageModel";
import { ethers } from "ethers";
import Web3 from "web3";
import bcrypt from "bcryptjs";
import { encryptPrivateKey, decryptPrivateKey } from "../utils/encryption";

// Ethereum provider (Infura or any other RPC provider)
const provider = new ethers.providers.JsonRpcProvider(
  "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
);

export const generateWallet = async (req, res, next) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid parameter",
    });
  }

  try {
    const wallet = ethers.Wallet.createRandom();
    const walletAddress = wallet.address;
    // Save wallet address for the user
    const newWallet = await Wallet.create({
      userId: user_id,
      walletAddress,
      balance: 0, // Starts with zero balance
    });
    const privateKey = wallet.privateKey;
    console.log(privateKey);
    const encryptedPrivateKey = encryptPrivateKey(privateKey);
    const newcoldStorage = await ColdStorage.create({
      currency: "ETH",
      balance: 0,
      walletAddress: walletAddress,
      coldStorageKey: encryptedPrivateKey,
    });

    return res.status(200).json({
      status: "success",
      message: "Wallet created successfully",
      data: {
        userId: newWallet.userId,
        walletAddress: walletAddress,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: "Failed to generate wallet",
      error: error.message,
    });
  }
};
export const withdrawFromWallet = async (req, res) => {
  const { userId, amount, toAddress } = req.body;

  if (!userId || !amount || !toAddress) {
    return res
      .status(400)
      .json({ status: "failed", message: "Invalid parameters" });
  }

  try {
    // Fetch the user's wallet
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
      return res
        .status(404)
        .json({ status: "failed", message: "User wallet not found" });
    }

    // Check if balance is sufficient
    if (parseFloat(wallet.balance) < parseFloat(amount)) {
      return res
        .status(400)
        .json({ status: "failed", message: "Insufficient balance" });
    }

    // Fetch the corresponding cold storage wallet for the user
    const coldStorage = await ColdStorage.findOne({
      where: { userId, walletAddress: wallet.walletAddress },
    });
    if (!coldStorage) {
      return res
        .status(500)
        .json({ status: "failed", message: "Cold storage wallet not found" });
    }

    // Initialize provider and wallet with decrypted private key
    const provider = new ethers.providers.JsonRpcProvider(
      "https://ropsten.infura.io/v3/YOUR_INFURA_KEY"
    );
    const decryptedPrivateKey = decryptPrivateKey(coldStorage.coldStorageKey);

    if (!decryptedPrivateKey) {
      return res
        .status(500)
        .json({ status: "failed", message: "Failed to decrypt private key" });
    }

    const masterWallet = new ethers.Wallet(decryptedPrivateKey, provider);

    // Create and send the transaction
    const tx = await masterWallet.sendTransaction({
      to: toAddress,
      value: ethers.utils.parseEther(amount.toString()),
    });

    await tx.wait();

    // Update wallet balance
    wallet.balance = parseFloat(wallet.balance) - parseFloat(amount);
    await wallet.save();

    return res.status(200).json({
      status: "success",
      message: "Withdrawal successful",
      transactionHash: tx.hash,
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: "Withdrawal failed",
      error: error.message,
    });
  }
};

export const checkDeposits = async () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(
      "https://ropsten.infura.io/v3/YOUR_INFURA_KEY"
    );

    // Fetch all wallets
    const wallets = await Wallet.findAll();
    if (!wallets.length) {
      console.log("No wallets found.");
      return;
    }

    // Fetch cold storage wallet once
    const coldStorage = await ColdStorage.findOne();
    if (!coldStorage) {
      console.error("Cold storage wallet not found.");
      return;
    }

    // Decrypt the private key securely
    const decryptedPrivateKey = decryptPrivateKey(coldStorage.coldStorageKey);
    if (!decryptedPrivateKey) {
      console.error("Failed to decrypt cold storage private key.");
      return;
    }

    const masterWallet = new ethers.Wallet(decryptedPrivateKey, provider);

    for (const wallet of wallets) {
      if (!wallet.depositAddress) {
        console.warn(
          `Wallet for user ${wallet.userId} has no deposit address.`
        );
        continue;
      }

      const depositAddress = wallet.depositAddress;
      const balanceWei = await provider.getBalance(depositAddress);
      const balanceETH = ethers.utils.formatEther(balanceWei);

      if (parseFloat(balanceETH) > 0) {
        console.log(
          `Deposit detected: ${balanceETH} ETH for ${depositAddress}`
        );

        try {
          // Transfer funds to cold storage
          const tx = await masterWallet.sendTransaction({
            to: coldStorage.masterWalletAddress,
            value: balanceWei,
          });

          await tx.wait();

          // Update wallet balance
          wallet.balance = parseFloat(wallet.balance) + parseFloat(balanceETH);
          await wallet.save();

          console.log(`Funds transferred: ${balanceETH} ETH to cold storage.`);
        } catch (txError) {
          console.error(`Transaction failed for ${depositAddress}:`, txError);
        }
      }
    }
  } catch (error) {
    console.error("Error checking deposits:", error);
  }
};

export const getBalance = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res
      .status(400)
      .json({ status: "failed", message: "Invalid parameter" });
  }
  const checkDeposits = await checkDeposits();
  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) {
    return res
      .status(404)
      .json({ status: "failed", message: "Wallet not found" });
  }
  return res.status(200).json({
    status: "success",
    data: {
      userId: wallet.userId,
      balance: wallet.balance,
    },
  });
};
