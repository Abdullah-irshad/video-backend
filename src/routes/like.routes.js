import { Router } from "express";
import {
    likeVideo,
    likeComment,
    likeTweet,
    unlikeVideo,
    unlikeComment,
    unlikeTweet,
    getTotalLike
} from '../controllers/like.controller.js'
import { verifyJwt } from "../middlewares/auth.middleware.js";


const router = Router();

router.route("/video/like").post(verifyJwt,likeVideo);
router.route("/video/unlike").post(verifyJwt,unlikeVideo)
router.route("/comment/like").post(verifyJwt,likeComment);
router.route("/comment/unlike").post(verifyJwt,unlikeComment)
router.route("/tweet/like").post(verifyJwt,likeTweet);
router.route("/tweet/unlike").post(verifyJwt,unlikeTweet)
router.route("/totallike").get(getTotalLike)

export default router;