import { ApiError } from '../utils/ApiError.js';
import {asyncHandler} from '../utils/asyncHandler.js'
import { deleteOnCloudianry, uploadOnCloudinary } from '../utils/cloudinary.js';
import { getLocalUploadPath } from '../utils/path.js';
import { Video } from '../models/video.model.js';
import ApiResponse from '../utils/ApiResponse.js'
import { User } from '../models/user.model.js';
import mongoose from 'mongoose'
import fs from 'node:fs'

const uploadVideo = asyncHandler(async (req,res)=>{
   try {
     const {title,description,isPublished,} = req.body;
     const owner = req.user?._id;
     const duration = req?.videoDuration
     console.log(duration)
 
     if([title,description,isPublished].some((field)=>field?.trim() === "" || typeof field === "undefined")){
         throw new ApiError(400,"all fields are required");
     }
 
     const videoPath = getLocalUploadPath(req,"video")
     const thumbnailPath = getLocalUploadPath(req,"thumbnail")
 
     if([videoPath,thumbnailPath].some((field)=>field?.trim() === "" || typeof field === "undefined")){
         throw new ApiError(400,"video and thumbnail is required");
     }
 
     const video = await uploadOnCloudinary(videoPath);
     const thumbnail = await uploadOnCloudinary(thumbnailPath)
 
     if(!(video || thumbnail)){
         throw new ApiError(500,"error while uploading file");
     }
 
     const createdVideo = await Video.create({
         title,
         description,
         duration,
         isPublished,
         videoFile:video?.url,
         thumbnail:thumbnail?.url,
         owner
 
     })
     return res
     .status(200)
     .json(new ApiResponse(200,createdVideo,"video uploaded"))
   } catch (error) {
    console.error(error);
    throw new ApiError(error.statusCode,error.message,error)
   }
})

const getAllVideos = asyncHandler(async(req,res)=>{
       try {
         const channelName = req?.query?.chname || ""
         const page = req?.query?.page || 1;
         const limit = req?.query?.limit || 10;

         const options = {
            page,
            limit,
            sort:{createdAt:-1}
         }

         if(!channelName?.trim()){
           throw new ApiError(404,"no query found in url")
         }
         const user = await User.findOne({
             username:channelName
         })
     
         if(!user){
             throw new ApiError(404,"no channel found")
         }

         const aggregationPipeline = [
             {
                 $match:{
                     owner:user._id,
                     isPublished:true
                 }
             },
             {
                 $lookup:{
                     from:"users",
                     foreignField:"_id",
                     localField:"owner",
                     as:"owner",
                     pipeline:[
                         {
                             $project:{
                                 username:1,
                                 fullName:1,
                                 avatar:1,
                                 coverImage:1
                             }
                         }
                     ]
                 }
             },
         ]

         const videosAggregate = Video.aggregate(aggregationPipeline);
         let paginatedVideos = await Video.aggregatePaginate(videosAggregate,options)

         if(paginatedVideos.docs.length <= 0){
             throw new ApiError(404,"no video found on this channel");
         }
     
         return res.status(200).json(new ApiResponse(200,paginatedVideos,`videos of ${channelName}`))
       } catch (error) {
        throw new ApiError(error.statusCode,error.message,error)
       }

})

const getvideoById = asyncHandler(async(req,res)=>{
    try {
        const videoid = req.query?.videoid;
        if(!videoid){
            throw new ApiError(404,"no query found in url")
        }
        const video = await Video.aggregate([
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(videoid),
                    isPublished:true
                }
            },
            {
                $lookup:{
                    from:"users",
                    foreignField:"_id",
                    localField:"owner",
                    as:"owner",
                    pipeline:[
                        {
                            $project:{
                                username:1,
                                fullName:1,
                                avatar:1,
                                coverImage:1
                            }
                        }
                    ]
                }
            }
        ])
    
        if(video.length <=0){
            throw new ApiError(404,"no video found")
        }
    
        return res.status(200).json(new ApiResponse(200,video,"video found"))
    } catch (error) {
        throw new ApiError(error.statusCode,error.message,error)
    }
})

const getPrivateVideo = asyncHandler(async (req,res)=>{
   try {
    console.log(req.user)
     const userId = req.user._id
     const result = await Video.aggregate([
         {
             $match:{
                 owner:userId,
                 isPublished:false,
             }
         }
     ])
 
     if(result.length <=0){
        throw new ApiError(401,"unauthorized request or no video found")
     }

     return res.status(200).json(new ApiResponse(200,result,"private video fetched"))
 
   } catch (error) {
    throw new ApiError(error.statusCode,error.message,error)
   }
})

const deleteVideo = asyncHandler(async(req,res)=>{
    try{
        const id = req.query?.id;
        if(!id){
            throw new ApiError(404,"no query found")
        }

        const video = await Video.findById(id);
        const userId = req.user?._id;

        console.log(userId.toString())
        console.log(video.owner.toString())

        if(!video){
            throw new ApiError("404","no video found")
        }

        if(userId.toString() !== video.owner.toString()){
            throw new ApiError(401,"unauthorized delete");
        }

        await deleteOnCloudianry(video.videoFile,"video")
        await deleteOnCloudianry(video.thumbnail,"image")
        
        await Video.findByIdAndDelete(id)

        return res.status(200).json(new ApiResponse(200,{},`video ${video.title} is deleted`))

    }catch(error){
        throw new ApiError(error.statusCode,error.message,error)
    }


})
const changeVideoTitle = asyncHandler(async (req,res)=>{
    try {
        const userId = req.user.id;
        const {videoId,title} = req.body;

        console.log(userId,videoId)
    
    
        if([title,videoId].some((field)=>field?.trim() === "" || typeof field === "undefined")){
            throw new ApiError(400,"all fields are required");
        }
    
        const result = await Video.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(videoId),
                owner: new mongoose.Types.ObjectId(userId)
            },
            {
                $set:{
                    title:title
                }
            },
            {new:true}
        )


        if(!result){
            throw new ApiError(401,"unauthorized changes")
        }

        return res.status(200).json(new ApiResponse(200,result,"title changed"))
    } catch (error) {
       return res.status(error.statusCode).json({error:error.message})
    }
})

const changeVideoThumbnail = asyncHandler(async (req,res)=>{
    try {
        const thumbnailPath = getLocalUploadPath(req);
        const {videoId} = req.body;
        const userId = req.user?._id;
    
        if(!thumbnailPath){
            throw new ApiError(404,"all fields are required")
        }
    
        if(!videoId){
            throw new ApiError(404,"all fields are required")
        }
        
        const video = await Video.findById(videoId);
    
        if(video.owner._id.toString() !== userId.toString()){
            fs.unlinkSync(thumbnailPath) 
            throw new ApiError(401,"unauthorized change")     
        }
        
        await deleteOnCloudianry(video.thumbnail,"image");
        const result = await uploadOnCloudinary(thumbnailPath);
        video.thumbnail = result.url;
        const thumbnailUpdated = await video.save({validateBeforeSave:false})
        return res.status(200).json(new ApiResponse(200,thumbnailUpdated,"thumnail updated"))
    } catch (error) {
        throw new ApiError(error.statusCode,error.message,error)
    }
})

const changeVideoDescription = asyncHandler(async (req,res)=>{
    try {
        const {description,videoId}  = req.body;
        const userId = req.user._id;
        if(!description){
            throw new ApiError(400,"all fields are required")
        }
        const result = await Video.findOneAndUpdate(
            {
                    _id:new mongoose.Types.ObjectId(videoId),
                    owner:userId
            },
            {
                $set:{
                    description:description
                }
            },
            {new:true}
        )
        if(!result){
            throw new ApiError(401,"unauthorized error")
        }
        return res.status(200).json(new ApiResponse(200,result,"description changed"))
    } catch (error) {
        throw new ApiError(error.statusCode,error.message,error);
    }
})

const changeVideoPub = asyncHandler(async (req,res)=>{
    try {
        const {isPublished,videoId} = req.body;
        const userId = req.user._id;
        if(!(isPublished || videoId)){
            throw new ApiError(400,"all fields are required")
        }

        const result = await Video.findOneAndUpdate(
            {
                    _id:new mongoose.Types.ObjectId(videoId),
                    owner:userId
            },
            {
                $set:{
                    isPublished:isPublished
                }
            },
            {new:true}
        )
    
    
        if(!result){
            throw new ApiError(401,"unauthorized change or video not found")
        }
        return res.status(200).json(new ApiResponse(200,result,"publication changed"))
    } catch (error) {
        throw new ApiError(error.statusCode,error.message,error);
    }
})

export {
    uploadVideo,
    deleteVideo,
    changeVideoTitle,
    changeVideoThumbnail,
    changeVideoDescription,
    changeVideoPub,
    getAllVideos,
    getvideoById,
    getPrivateVideo
}

