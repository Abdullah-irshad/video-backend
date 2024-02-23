import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary =  async(path)=>{
    try{
        if(!path)return null;
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(path,{
            resource_type:"auto"
        })
        fs.unlinkSync(path);
        return response;
    }catch(error){
        fs.unlinkSync(path); ///remove the file from temp folder of server
        return null;
    }
}

const deleteOnCloudianry =  async (url,resource_type)=>{
    try {
        const urlParts = url.split("/");
        const publicId = urlParts[urlParts.length-1].split(".")[0];
        const response  = await cloudinary.uploader.destroy(publicId,{resource_type:resource_type});
        return response;  /// return {result:ok}
    } catch (error) {
       return null;
    }
}



export {uploadOnCloudinary, deleteOnCloudianry}