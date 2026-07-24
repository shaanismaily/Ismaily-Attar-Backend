import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { Variant } from "../models/variant.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createOrder = asyncHandler( async(req, res) => {
    const { productId } = req.params
    const { volume, quantity, addressId } = req.body

    if (!quantity || quantity < 1) {
        throw new ApiError(400, "Quantity must be at least 1");
    }

    const product = await Product.findById(productId)
    if (!product) {
        throw new ApiError(404, "Product not found")
    }

    const address = await Address.findOne({
        _id: addressId,
        user: req.user._id 
    })
    if (!address) {
        throw new ApiError(404, "Address not found")
    }

    const variant = await Variant.findOne({ 
        product: productId,
        volume: volume
    })

    if (!variant) {
        throw new ApiError(404, "Variant does not exists")
    }

    if (!variant.isAvailable) {
        throw new ApiError(404, "Variant is not available")
    }

    if (variant.stock < quantity) {
        throw new ApiError(400, "Insufficient stock")
    }

    const total = variant.price * quantity

    const order = await Order.create({
        orderedBy: req.user._id,
        totalAmount: total,
        orderStatus: "pending",
        paymentStatus: "pending",
        shippingAddress: address._id,
        orderItems: [
            {
                product: product._id,
                variant: variant._id,
                price: variant.price,
                quantity,
                volume,
                productName: product.name
            }
        ]
    })

    if (!order) {
        throw new ApiError(500, "Something went wrong while creating order")
    }

    await Variant.findByIdAndUpdate(
        variant._id,
        {
            $inc: {
                stock: -quantity
            }
        }
    );

    const createdOrder = await Order.findById(order._id)
        .populate("shippingAddress");

    return res.status(201).json(
        new ApiResponse(201, createdOrder, "Order created successfully")
    );
})

const getUserOrders = asyncHandler( async(req, res) => {

    const orders = await Order.find( { orderedBy: req.user?._id } )
                .sort({ createdAt: -1 })
                .populate("shippingAddress")
                .populate("orderItems.product")
                .populate("orderItems.variant")

    return res.status(200).json(new ApiResponse(
        200, orders, "Orders fetched successfully"
    ))
})

const getOrder = asyncHandler( async(req, res) => {
    const { orderId } = req.params

    const order = await Order.findById(orderId)

    if (!order) {
        throw new ApiError(404, "Order not found")
    }

    if (order.orderedBy.toString() !== req.user._id.toString()) {
        throw new ApiError(401, "Unauthorized request")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            order,
            "Order fetched successfully"
        )
    )
})

const cancelOrder = asyncHandler( async(req, res) => {
    const { orderId } = req.params

    const order = await Order.findById(orderId)

    if (!order) {
        throw new ApiError(404, "Order not found")
    }

    if (order.orderedBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized request")
    }

    if (!["pending", "packed"].includes(order.orderStatus)) {
        throw new ApiError(400, "This order can no longer be cancelled")
    }

    order.orderStatus = "cancelled"
    order.save();

    for (const item of order.orderItems) {
        await Variant.findByIdAndUpdate(
            item.variant,
            {
                $inc: {
                    stock: item.quantity
                }
            }
        )
    }

    return res.status(200).json(
        new ApiResponse(
            200, order, "Order cancelled successfully"
        )
    )
})


// Admin controllers

const getAllOrders = asyncHandler( async(req, res) => {
    const { page=1, limit=10, query, sortBy, sortType } = req.query

    const filter: Record<string, unknown> = {}

    if (query) {
        filter.$or = [
            { orderStatus: { $regex: query, $options: "i" } },
            { paymentStatus: { $regex: query, $options: "i" } }
        ]
    }

    // TODO: Search using mongoose aggregation pipelines
})


export {
    createOrder,
    getUserOrders,
    getOrder,
    cancelOrder,
}