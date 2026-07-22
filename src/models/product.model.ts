import mongoose, { Model, Schema, Types } from "mongoose";

interface IProduct {
    name: string;
    slug: string;
    description: string;
    images: string[];
    imagesPublicId: string[],
    category: Types.ObjectId;
}

const productSchema = new Schema<IProduct, Model<IProduct>>( {
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true  
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    images: {
        type: [String],
        required: true,
        validate: {
            validator: (arr: string[]) => arr.length > 0,
            message: "At least one image is required"
        }
    },
    imagesPublicId: [String],
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true
    }
}, {timestamps: true} )

productSchema.index( { slug: 1}, { unique: true } );

productSchema.index( { category: 1} );


export const Product = mongoose.model<IProduct>("Product", productSchema)