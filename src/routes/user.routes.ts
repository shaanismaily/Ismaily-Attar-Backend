import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    loginUser,
    registerUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    logoutUser
} from "../controllers/user.controller.js"

const router = Router()

router.route("/signup").post(registerUser)
router.route("/login").post(loginUser)

// secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changePassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)


export default router;