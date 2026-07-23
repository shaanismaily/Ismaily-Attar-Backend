import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});


const uploadOnCloudinary = async(localFilePath: string) => {
    try {
        if (!localFilePath) return null

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null;
    }
}

const deleteFromCloudinary = async(publicId: string) => {
    try {
        if (!publicId) return null

        await cloudinary.uploader.destroy(publicId)
    } catch (error) {
        if (error instanceof Error) {
            throw Error(error.message)
        } else {
            throw Error("Could not delete from cloudinary")
        }
    }
}

export { uploadOnCloudinary, deleteFromCloudinary };