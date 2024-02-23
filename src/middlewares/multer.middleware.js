import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const storage = multer.diskStorage({
    destination: function (req,file,cb){
        cb(null,"./public/temp")
    },
    filename:function(req,file,cb){
        cb(null,file.originalname)
    }
})

const allowedFileType = ['image/jpeg', 'image/png',"image/webp", 'video/mp4']

const fileFilter = (req,file,cb)=>{
    if(allowedFileType.includes(file.mimetype)){
        cb(null,true)
    }
    else{
       cb(new ApiError(415,'File type not supported'),false)
    }
}

export const upload = multer({
    storage,
    fileFilter,
})
