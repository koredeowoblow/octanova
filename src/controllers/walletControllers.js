import wallet from "../models/walletModel";
import { ethers } from "ethers";
export const getwalletbalance = async (req,res,next ) =>{
    const {user_id}=req.body;
    if (!user_id) {
        return res.status(400).json({
            status:"failed",
            message: "invailed parameter"            
        })
    }

}
 
export const  generateDepositAddress = async (req,res,next) => {
    
}