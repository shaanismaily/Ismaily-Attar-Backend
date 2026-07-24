import mongoose, { Schema, Types, Model } from "mongoose";

interface IOrder {
    orderedBy: Types.ObjectId;
    totalAmount: number;
    orderStatus: "pending" | "packed" | "shipped" | "delivered" | "cancelled";
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
    shippingAddress: Types.ObjectId;
    orderItems: IOrderItem[];
}

interface IOrderItem {
    product: Types.ObjectId;
    variant: Types.ObjectId;

    productName: string;
    volume: string;
    price: number;

    quantity: number;
}


const orderItemSchema = new Schema<IOrderItem, Model<IOrderItem>>( {
    product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    variant: {
        type: Schema.Types.ObjectId,
        ref: "Variant",
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    }
});

const orderSchema = new Schema<IOrder, Model<IOrder>>({
    orderedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    orderStatus: {
        type: String,
        enum: ["pending", "packed", "shipped", "delivered", "cancelled"],
        default: "pending",
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending"
    },
    shippingAddress: {
        type: Schema.Types.ObjectId,
        ref: "Address",
        required: true
    },
    orderItems: {
        type: [orderItemSchema],
        validate: {
            validator: (items: IOrderItem[]) => items.length > 0,
            message: "Order must contain at least one item."
        }
    }
}, {timestamps: true} )

orderSchema.index({ orderedBy: 1 });

orderSchema.index({ createdAt: -1 });

orderSchema.index({ orderStatus: 1 });

export const Order = mongoose.model<IOrder>("Order", orderSchema)