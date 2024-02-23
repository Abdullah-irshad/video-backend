import
{
    comment,
    deleteComment,
    getAllComments
}from '../controllers/comment.controller.js'
import { Router } from 'express'
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/comment").post(verifyJwt,comment);
router.route("/delete").post(verifyJwt,deleteComment);
router.route("/getcomments").get(getAllComments)


export default router