import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";


interface DecodedToken extends JwtPayload {
    _id: string;
    email: string;
    fullName: string;
    phone?: string;
    role: string;
}

export const verifyJWT = asyncHandler( async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }
    
        const secret = process.env.ACCESS_TOKEN_SECRET;

        if (!secret) {
            throw new ApiError(500, "ACCESS_TOKEN_SECRET is missing");
        }

        const decodedToken = jwt.verify(token, secret) as DecodedToken;
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiError(401, "Invalid access token")
        }
    
        req.user = user;
        next();

    } catch (error) {
        if (error instanceof Error) {
            throw new ApiError(401, error.message);
        }
        throw new ApiError(401, "Invalid access token");
    }
})