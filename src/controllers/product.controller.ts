import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const createProduct = asyncHandler( async(req, res) => {
    const { name, slug, description, category } = req.body

    if (!name || !slug || !description || !category) {
        throw new ApiError(400, "All fields are required");
    }

    if (
        !name.trim() ||
        !slug.trim() ||
        !description.trim()
    ) {
        throw new ApiError(400, "Invalid input");
    }

    const existedProduct = await Product.findOne({ slug });

    if (existedProduct) {
        throw new ApiError(409, "Product already exists");
    }

    const imageFiles = req.files as Express.Multer.File[];

    if (!imageFiles || imageFiles.length === 0) {
        throw new ApiError(400, "At least one image is required")
    }

    const imageUrls: string[] = [];
    const imagePublicIds: string[] = [];

    for (const file of imageFiles) {
        const uploadedImage = await uploadOnCloudinary(file.path)
        
        if (!uploadedImage) {
            throw new ApiError(400, "Image is required")
        }

        imageUrls.push(uploadedImage.secure_url)
        imagePublicIds.push(uploadedImage.public_id)
    }

    const product = await Product.create({
        name,
        slug,
        description,
        category,
        images: imageUrls,
        imagesPublicId: imagePublicIds
    })

    if (!product) {
        throw new ApiError(500, "Something went wrong while creating a product")
    }

    const createdProduct = await Product.findById(product._id)
        .populate("category")

    return res.status(201).json(
        new ApiResponse(201, createdProduct, "Product created successfully")
    );
})

const updateProduct = asyncHandler( async(req, res) => {
    const { name, description, slug, category } = req.body
    const { productId } = req.params

    if (!name && !description && !slug && !category) {
        throw new ApiError(400, "At least one field is required")
    }

    if (slug) {
        const existedSlug = await Product.findOne({
            slug,
            _id: { $ne: productId }  // ne - Not Equal
        });

        if (existedSlug) {
            throw new ApiError(409, "Product with this slug already exists");
        }
    }

    const updateData: Partial<{
    name: string;
    description: string;
    slug: string;
    category: string;
    }> = {};

    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (slug) updateData.slug = slug;
    if (category) updateData.category = category;

    
    const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        updateData,
        { new: true }
    )

    if (!updateProduct) {
        throw new ApiError(404, "Product not found")
    }

    return res.status(200).json(
        new ApiResponse(200, updatedProduct, "Product updated successfully")
    )
})

export {
    createProduct,
    updateProduct
}