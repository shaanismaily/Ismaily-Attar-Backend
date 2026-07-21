import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { Types } from "mongoose";


const options = {
    httpOnly: true,
    secure: true
}

interface DecodedToken extends JwtPayload {
    _id: string;
    email: string;
    fullName: string;
    phone?: string;
    role: string;
}

const generateAccessAndRefreshToken = async(userId: Types.ObjectId) => {
    try {
        const user = await User.findById(userId)

        if (!user) {
            throw new ApiError(404, "User does not exists")
        }

        const accessToken: string = user.generateAccessToken()
        const refreshToken: string = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens")
    }
}

const registerUser = asyncHandler( async(req, res) => {
    const { email, fullName, password, role, phone } = req.body

    if ([email, password, fullName, role].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({ 
        $or: [{ email }, { phone }] 
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or phone already exists")
    }

    const user = await User.create({
        fullName,
        email,
        password,
        role,
        ...(phone && { phone })
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a user")
    }

    return res
        .status(201)
        .json(new ApiResponse(200, createdUser, "User registered successfully"))

})

const loginUser = asyncHandler( async(req, res) => {
    const { email, phone, password } = req.body

    if (!email && !phone) {
        throw new ApiError(400, "Email or phone is required")
    }

    if (!password) {
        throw new ApiError(400, "Password is required")
    }

    const user = await User.findOne({
        $or: [ {email}, {phone} ]
    })

    if (!user) {
        throw new ApiError(404, "User does not exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(
        200, { user: loggedInUser }, "User logged in successfully"
    ))
})

const logoutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        { new: true }
    )

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully")
    )
})

const refreshAccessToken = asyncHandler( async(req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    const secret = process.env.REFRESH_TOKEN_SECRET

    if (!secret) {
        throw new ApiError(500, "REFRESH_TOKEN_SECRET is missing")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, secret) as DecodedToken
    
        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user._id)


        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                null,
                "Access token refreshed"
            )
        )
        
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new ApiError(401, error.message);
        }
        throw new ApiError(401, "Invalid refresh token");
    }
})

const changePassword = asyncHandler( async(req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user._id)
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})

const getCurrentUser = asyncHandler( async(req, res) => {

    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    )
})

const updateAccountDetails = asyncHandler( async(req, res) => {
    const { fullName, email, phone } = req.body

    if (!fullName && !email && !phone) {
        throw new ApiError(
            400,
            "Please provide at least one field to update"
        );
    }

    const updateData: Partial<{
        fullName: string;
        email: string;
        phone: string;
    }> = {}

    if (email) updateData.email = email
    if (fullName) updateData.fullName = fullName
    if (phone) updateData.phone = phone

    const user = await User.findByIdAndUpdate(
        req.user!._id,
        updateData,
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, {user}, "Account details updated successfully"))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails
}