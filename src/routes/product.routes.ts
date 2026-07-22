import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";
import { 
    createProduct,
    updateProduct
} from "../controllers/product.controller.js";
import { Router } from "express";

const router = Router();

// Anyone can view products
// router.get("/products", getProducts);
// router.get("/products/:slug", getProduct);

// Only admin can modify products
router.post("/admin/products", verifyJWT, verifyAdmin, upload.array("images", 5), createProduct);
router.patch("/admin/products/:id", verifyJWT, verifyAdmin, updateProduct);
// router.delete("/admin/products/:id", verifyJWT, verifyAdmin, deleteProduct);

export default router