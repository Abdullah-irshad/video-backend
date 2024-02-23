import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { videoDuration } from "../middlewares/video.middleware.js";

import {
    uploadVideo,
    changeVideoDescription,
    changeVideoPub,
    changeVideoThumbnail,
    changeVideoTitle,
    deleteVideo,
    getAllVideos,
    getvideoById,
    getPrivateVideo
}from '../controllers/video.controller.js'

const router = Router();

router.route("/upload").post(verifyJwt,upload.fields([
    {
        name:"video",
        maxCount:1,
    },
    {
        name:"thumbnail",
        maxCount:1,
    }
]),videoDuration,uploadVideo);
router.route("/private").get(verifyJwt,getPrivateVideo)
router.route("/videos").get(getAllVideos)
router.route("/vidid").get(getvideoById)
router.route("/delete").delete(verifyJwt,deleteVideo);
router.route("/chngdescription").put(verifyJwt,changeVideoDescription);
router.route("/chngtitle").put(verifyJwt,changeVideoTitle);
router.route("/chngthumbnail").put(verifyJwt,upload.single("thumbnail"),changeVideoThumbnail);
router.route("/chngpub").put(verifyJwt,changeVideoPub);

export default router