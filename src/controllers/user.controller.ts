import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const options = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefreshToken = async(userId) => {
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
})

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
        phone: phone || ""
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

    if (!email || !phone) {
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
        200, {loggedInUser, accessToken, refreshToken}, "User logged in successfully"
    ))
})