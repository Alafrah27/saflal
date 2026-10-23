import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Deletes a file from Cloudinary using its URL
 * @param {string} url - The full Cloudinary URL
 * @param {string} fileType - 'image', 'audio', or 'pdf'
 */
export const deleteFromCloudinary = async (url, fileType) => {
  if (!url || !url.includes("cloudinary")) return;

  try {
    // 1. Extract Public ID from URL
    // This works even if the file is in a folder like 'avatars/image123'
    const parts = url.split("/");
    const fileName = parts.pop(); // e.g. "image123.jpg"
    const publicId = fileName.split(".")[0]; // e.g. "image123"

    // 2. Determine Resource Type
    // Cloudinary treats Audio as 'video' and PDF usually as 'image' or 'raw'
    let resourceType = "image";
    if (fileType === "audio") resourceType = "video";
    if (fileType === "pdf") resourceType = "raw";

    // 3. Destroy
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    // console.log(`✅ Cloudinary ${fileType} deleted:`, result);
    return result;
  } catch (error) {
    console.error("❌ Cloudinary Deletion Error:", error);
    throw error;
  }
};
