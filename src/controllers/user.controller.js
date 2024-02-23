import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { deleteOnCloudianry, uploadOnCloudinary } from '../utils/cloudinary.js'
import ApiResponse from "../utils/ApiResponse.js"
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const generateAccessAndRefreshTokens = async (user)=>{
    try{
        const accessToken =await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken};
    }catch(error){
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    //get user details from frontend
    // validation - not empty
    // check if user is already exists
    // check for image
    //upload on cloudinary
    //create user object - create entry in db

    const {fullName,username,email,password} = req.body;

    if([fullName,username,email,password].some((field)=>field?.trim() === "" || typeof field === "undefined")){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser =  await User.findOne({
        $or:[{email},{username}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username already existed")
    }


    // const avatarLocalPath = req.files?.avatar[0]?.path
    const avatarLocalPath = req.files && req.files.avatar && req.files.avatar[0] &&  req.files.avatar[0].path;
    const coverImageLocalPath = req.files && req.files.coverImage && req.files.coverImage[0] && req.files.coverImage[0].path

    if(!avatarLocalPath){
        throw new ApiError(409,"Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(409,"Avatar is required")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })


    const createdUser = await User.findById(user?._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registring a user")
    }
    return res.status(201).json(new ApiResponse(200,createdUser,"User register successfully"))
})

const loginUser = asyncHandler(async (req,res)=>{

    // get user detail email/password
    // check is user available in db with email findOne(email)
    // if user is available than check its given password with existed password of user 
    // if user is authenticated than send refresh token and access token

    const {email,username,password} = req.body

    if(!(email || username)){
        throw new ApiError(400,"username or email is required")
    }
    else if(password.trim()==="" || typeof password === "undefined"){
        throw new ApiError(400,"username or password is required")
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user)

    const userDetail = { username: user.username, fullName: user.fullName, email: user.email, avatar: user.avatar, coverImage: user.coverImage };

    const options = {
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,{
        user: userDetail,accessToken,refreshToken 
    },
    "User logged In Successfully"))
})


const logoutUser = asyncHandler(async(req,res)=>{
    //crlear cookies
    //reset refresh token in db

    await User.findByIdAndUpdate(req.user._id,{
        $unset:{
            refreshToken:1
        }
    },{
        new:true
    })

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))

})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    try {
        const userRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    
        if(!userRefreshToken){
            throw new ApiError(401,"unauthorized request")
        }
        const decodedToken = jwt.verify(userRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        const user =await User.findById(decodedToken?._id).select("-password");
    
        if(!user){
            throw new ApiError(401,"invalid refresh token")
        }
    
        if(user.refreshToken !== userRefreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const {refreshToken,accessToken} = await generateAccessAndRefreshTokens(user);
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken},
                "access token generated successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401,error.message || "invalid refresh token")
    }
})


const changeCurrentPassword = asyncHandler(async (req,res)=>{
    const {oldPassword,newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400,"invalid password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false});

    return res
    .status(200)
    .json(new ApiResponse(200,{},"password change successfully"))

})

const getCurrentUser = asyncHandler(async (req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {fullName,email} = req.body;

    if(!(fullName || email)){
        throw new ApiError(400,"fullName or email are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullName: fullName || req.user?.fullName,
                email:email || req.user?.email
            }
        },
        {new:true}
        ).select("-password -refreshToken")
        
        return res
        .status(200)
        .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            avatar: avatar.url
        }
    },{new:true}).select("-password")

    deleteOnCloudianry(req.user?.avatar,"image");

    return res
    .status(200)
    .json(new ApiResponse(200,user,"coverImage updated successfully"))

})

const updateUserCoverImage = asyncHandler(async (req,res)=>{
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400,"coverImage file is missing")
    }
    

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading coverImage")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            coverImage: coverImage.url
        }
    },{new:true}).select("-password")

    deleteOnCloudianry(req.user?.coverImage,"image");

    return res
    .status(200)
    .json(new ApiResponse(200,user,"coverImage updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }
    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size:"$subscribers"
                },
                channelSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscriberCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(400,"channel does not exists")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"User channel fetched successfully"))
})

const getWatchHistory = asyncHandler(async (req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistroy",
                foreignField:"_id",
                as:"watchHistroy",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first:"owner"
                }
            }
        }
    ])
    return res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"user watch history"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}  
