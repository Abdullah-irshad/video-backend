import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";

const likeVideo = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.body;
    const userId = req.user._id;

    if (!videoId?.trim()) {
      throw new ApiError(400, "vides Id is required");
    }

    const result = await Video.findById(videoId).select("_id");

    if (!result) {
      throw new ApiError("video not found");
    }

    const like = await Like.findOne({
        likedBy:userId
    })

    if(like){
        return res.status(409).json(new ApiResponse(409,like,"user already liked the video"))
    }

    await Like.create({
        video: new mongoose.Types.ObjectId(videoId),
        likedBy: new mongoose.Types.ObjectId(userId),
    });
    

    return res.status(200).json(new ApiResponse(200, {}, "video liked"));
  } catch (error) {
    throw new ApiError(error.statusCode, error);
  }
});

const unlikeVideo = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.body;
    const userId = req.user._id;
    if (!videoId?.trim()) {
      throw new ApiError(400, "vides Id is required");
    }

    await Like.findOneAndDelete(
      {
        video: new mongoose.Types.ObjectId(videoId),
        likedBy: new mongoose.Types.ObjectId(userId),
      },
    );
    return res.status(200).json(new ApiResponse(200,{},"unliked"))
  } catch (error) {
    throw new ApiError(error.statusCode, error.message, error);
  }
});

const likeComment = asyncHandler(async (req, res) => {
  try {
    const { commentId } = req.body;
    const userId = req.user._id;
    if (!commentId?.trim()) {
      throw new ApiError(400, "comment Id is required");
    }

    const result = await Comment.findById(commentId).select("_id");

    if (!result) {
      throw new ApiError("comment not found");
    }

    const like = await Like.findOne({
        likedBy:userId
    })

    if(like){
        return res.status(409).json(new ApiResponse(409,like,"user already liked the comment"))
    }

    await Like.create({
        comment: result._id,
        likedBy: userId,
    });

    return res.status(200).json(new ApiResponse(200, {}, "comment liked"));
  } catch (error) {
    throw new ApiError(error.statusCode, error);
  }
});

const unlikeComment = asyncHandler(async (req, res) => {
  try {
    const { commentId } = req.body;
    const userId = req.user._id;
    if (!commentId?.trim()) {
      throw new ApiError(400, "comment Id is required");
    }

    await Like.findOneAndUpdate(
      {
        comment: new mongoose.Types.ObjectId(commentId),
        likedBy: new mongoose.Types.ObjectId(userId),
      },
      {
        $unset: {
          comment: 1,
        },
      }
    );
  } catch (error) {
    throw new ApiError(error.statusCode, error.message, error);
  }
});

const likeTweet = asyncHandler(async (req, res) => {
  try {
    const { tweetId } = req.body;
    const userId = req.user._id;
    if (!tweetId?.trim()) {
      throw new ApiError(400, "tweet Id is required");
    }

    const result = await Tweet.findById(tweetId).select("_id");

    if (!result) {
      throw new ApiError("tweet not found");
    }

    const like = await Like.findOne({
        likedBy:userId
    })

    if(like){
        return res.status(409).json(new ApiResponse(409,like,"user already liked the tweet"))
    }

    await Like.create({
        tweet: result._id,
        likedBy: userId,
    });

    return res.status(200).json(new ApiResponse(200, {}, "tweet liked"));
  } catch (error) {
    throw new ApiError(error.statusCode, error);
  }
});

const unlikeTweet = asyncHandler(async (req, res) => {
  try {
    const { tweetId } = req.body;
    const userId = req.user._id;
    if (!tweetId?.trim()) {
      throw new ApiError(400, "tweet Id is required");
    }

    await Like.findOneAndDelete(
      {
        tweet: new mongoose.Types.ObjectId(tweetId),
        likedBy: new mongoose.Types.ObjectId(userId),
      }
    );
  } catch (error) {
    throw new ApiError(error.statusCode, error.message, error);
  }
});

const getTotalLike = asyncHandler(async (req, res) => {
  try {
    let { id, type } = req.body;
    type = type.toLowerCase().toString();
    if (
      [id, type].some(
        (field) => field?.trim() === "" || typeof field === "undefined"
      )
    ) {
      throw new ApiError(400, "id and type is required");
    }
  
    if (!(type === "comment" || type === "video" || type === "tweet")) {
      throw new ApiError(400, "type is not correct");
    }

    const aggregationPipeline = [
        {
          $match: {
            type:new mongoose.Types.ObjectId(id),
          },
        },
        {
         $count:"likes"
        },
      ]
  
    const likes = await Like.aggregate([
        {
          $match: {
            $expr:{
                $switch:{
                    branches:[
                        {case:{$eq:["video",type]},then:["video",id]},
                        {case:{$eq:["comment",type]},then:["comment",id]},
                        {case:{$eq:["tweet",type]},then:["tweet",id]}
                    ]
                }
            }
          },
        },
        {
         $count:"likes"
        },
      ]);
  
    return res.status(200).json(new ApiResponse(200,likes,`likes of ${type}`));
  } catch (error) {
    throw new ApiError(error.statusCode,error.message,error)
  }
});

export {
  likeVideo,
  likeComment,
  likeTweet,
  unlikeVideo,
  unlikeComment,
  unlikeTweet,
  getTotalLike
};
