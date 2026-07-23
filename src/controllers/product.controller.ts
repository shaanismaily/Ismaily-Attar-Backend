import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

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

const deleteProduct = asyncHandler( async(req, res) => {
    const { productId } = req.params

    const deletedProduct = await Product.findByIdAndDelete(productId)

    if (!deletedProduct) {
        throw new ApiError(404, "Product not found")
    }

    for (const publicId of deletedProduct.imagesPublicId) {
        deleteFromCloudinary(publicId)
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Product deleted successfully")
    )
})

const getProducts = asyncHandler( async(req, res) => {
    const { page="1", limit="10", query, sortBy, sortType, category } = req.query

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(50, Math.max(1, Number(limit) || 10));

    const filter: Record<string, unknown> = {}

    if (query) {
        filter.$or = [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    if (category) {
        filter.category = category
    }

    const allowedSortFields = ["name", "createdAt"] as const;

    const sortField = allowedSortFields.includes(sortBy as any) ? sortBy as string : "createdAt" 
    const order = sortType === "asc" ? 1 : -1;


    const products = await Product.find(filter)
                    .populate("category")
                    .sort({ [sortField]: order })
                    .skip((pageNumber -1) * limitNumber)
                    .limit(limitNumber)

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limitNumber);

    return res.status(200).json(
        new ApiResponse(200, {
            products,
            page: pageNumber,
            limit: limitNumber,
            totalProducts,
            totalPages
        }, "Products fetched successfully")
    )
})

const getProduct = asyncHandler( async(req, res) => {
    const { slug } = req.params

    const product = await Product.findOne({ slug }).populate("category")

    if (!product) {
        throw new ApiError(404, "Product not found")
    }

    return res.status(200).json(
        new ApiResponse(200, product, "Product fetched successfully")
    )
})

export {
    createProduct,
    updateProduct,
    deleteProduct,
    getProducts,
    getProduct
}