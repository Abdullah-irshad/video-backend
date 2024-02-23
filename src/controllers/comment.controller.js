import { Comment } from "../models/comment.model";
import {asyncHandler} from '../utils/asyncHandler'
import { ApiError } from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import mongoose from 'mongoose'

const comment = asyncHandler(async (req,res)=>{
    try {
        const {videoId,comment} =  req.body;
        const userId = req.user._id
    
        if([videoId,comment].some((item)=>item?.trim() === "" || typeof item === "undefined")){
            throw new ApiError(404,"no video id found");
        }
    
        await Comment.create(
            {
                content:comment,
                video:new mongoose.Types.ObjectId(videoId),
                owner:new mongoose.Types.ObjectId(userId)
            },
        )

        return res.status(200).json(new ApiResponse(200,{},"comment created"))

    } catch (error) {
        throw new ApiError(error.statusCode,error)
    }

})


const deleteComment = asyncHandler(async (req,res)=>{
    try {
        const {commentId} = req.body;
        const userId = req.user._id
        
        if(!commentId?.trim()){
            throw new ApiError(404,"no commentId found")
        }

        const fetchComment = await Comment.findOne({
            _id:new mongoose.Types.ObjectId(commentId),
            owner:userId
        })

        if(!fetchComment){
            throw new ApiError(401,"unauthorized action")
        }

        await Comment.findByIdAndDelete(fetchComment._id);

        return res.status(200).json(new ApiResponse(200,{},"comment deleted"))

    } catch (error) {
        throw new ApiError(error.statusCode,error)
    }
})

const getAllComments = asyncHandler(async (req,res)=>{
    try {
        const {videoId}  = req.body;

        if(!videoId?.trim()){
            throw new ApiError(404,"no video Id found");
        }

        const fetchComments = await Comment.find({
            video:videoId
        })

        if(!fetchComments){
            return res.status(404).json(new ApiResponse(200,{},"no commnets found"))
        }

        return res.status(200).json(new ApiResponse(200,fetchComments,"comment fteched"))

    } catch (error) {
        throw new ApiError(error.statusCode,error)
    }
})


export {
    comment,
    deleteComment,
    getAllComments
}