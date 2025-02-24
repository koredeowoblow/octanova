import Wallet from "../models/walletModel";
import ColdStorage from "../models/coldstorageModel";
import { ethers } from "ethers";
import Web3 from "web3";
import bcrypt from "bcryptjs";

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
    // Fetch the centralized cold storage wallet from DB
    const coldStorage = await ColdStorage.findOne();
    if (!coldStorage) {
      return res.status(500).json({
        status: "failed",
        message: "Cold storage wallet not found",
      });
    }

    // Decrypt the cold storage private key
    const isValid = await bcrypt.compare(process.env.COLD_STORAGE_SECRET, coldStorage.coldStorageKey);
    if (!isValid) {
      return res.status(500).json({
        status: "failed",
        message: "Invalid decryption key",
      });
    }

    // Generate user-specific deposit address using HD Wallet (BIP-44)
    const masterWallet = new ethers.Wallet(coldStorage.privateKey, provider);
    const userWallet = masterWallet.derivePath(`m/44'/60'/0'/0/${user_id}`);
    const walletAddress = userWallet.address;

    // Save wallet address for the user
    const newWallet = await Wallet.create({
      userId: user_id,
      walletAddress,
      balance: 0, // Starts with zero balance
    });

    return res.status(200).json({
      status: "success",
      message: "Wallet created successfully",
      data: {
        userId: newWallet.userId,
        walletAddress: newWallet.walletAddress,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: "Failed to create wallet",
      error: error.message,
    });
  }
};
export const withdrawFromWallet = async (req, res) => {
  const { userId, amount, toAddress } = req.body;
  if (!userId || !amount || !toAddress) {
    return res.status(400).json({ status: "failed", message: "Invalid parameters" });
  }
  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet || parseFloat(wallet.balance) < parseFloat(amount)) {
    return res.status(400).json({ status: "failed", message: "Insufficient balance" });
  }
  const coldStorage = await ColdStorage.findOne();
  if (!coldStorage) {
    return res.status(500).json({ status: "failed", message: "Cold storage wallet not found" });
  }
  try {
    const provider = new ethers.providers.JsonRpcProvider("https://ropsten.infura.io/v3/YOUR_INFURA_KEY");
    const masterWallet = new ethers.Wallet(decryptPrivateKey(coldStorage.encryptedPrivateKey), provider);
    const tx = await masterWallet.sendTransaction({
      to: toAddress,
      value: ethers.utils.parseEther(amount.toString()),
    });
    await tx.wait();
    wallet.balance = parseFloat(wallet.balance) - parseFloat(amount);
    await wallet.save();
    return res.status(200).json({
      status: "success",
      message: "Withdrawal successful",
      transactionHash: tx.hash,
    });
  } catch (error) {
    return res.status(500).json({ status: "failed", message: "Withdrawal failed", error: error.message });
  }
};

const decryptPrivateKey = (encryptedKey) => {
  return bcrypt.compareSync("your_secret_key", encryptedKey)
    ? "decrypted_private_key"
    : null;
};

export const checkDeposits = async () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider("https://ropsten.infura.io/v3/YOUR_INFURA_KEY");
    const wallets = await Wallet.findAll();

    for (const wallet of wallets) {
      const depositAddress = wallet.depositAddress;
      const balanceWei = await provider.getBalance(depositAddress);
      const balanceETH = ethers.utils.formatEther(balanceWei);

      if (parseFloat(balanceETH) > 0) {
        console.log(`Deposit detected: ${balanceETH} ETH for ${depositAddress}`);
        const coldStorage = await ColdStorage.findOne();
        if (!coldStorage) continue;

        const masterWallet = new ethers.Wallet(
          decryptPrivateKey(coldStorage.encryptedPrivateKey),
          provider
        );

        const tx = await masterWallet.sendTransaction({
          to: coldStorage.masterWalletAddress,
          value: balanceWei,
        });

        await tx.wait();
        wallet.balance = parseFloat(wallet.balance) + parseFloat(balanceETH);
        await wallet.save();
      }
    }
  } catch (error) {
    console.error("Error checking deposits:", error);
  }
};
export const getBalance = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ status: "failed", message: "Invalid parameter" });
  }
  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) {
    return res.status(404).json({ status: "failed", message: "Wallet not found" });
  }
  return res.status(200).json({
    status: "success",
    data: {
      userId: wallet.userId,
      balance: wallet.balance,
    },
  });
};

