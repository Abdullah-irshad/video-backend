import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import Ffmpeg from "fluent-ffmpeg";
import { getLocalUploadPath } from "../utils/path.js";
const videoDuration = asyncHandler(async (req,_,next)=>{
    try {

        const filePath = getLocalUploadPath(req,"video")
        
        Ffmpeg.ffprobe(filePath,(err,metaData)=>{
            if(err){
                console.error(err)
                 throw new ApiError(500,"Error getting video duration",err);
            }
            const videoDuration = metaData.format.duration;
            req.videoDuration = videoDuration;
            next();
        })
        
    } catch (error) {
        throw new ApiError(500,"Error getting video duration",error);
    }
})

export{
    videoDuration
}