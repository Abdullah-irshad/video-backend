import { ApiError } from "./ApiError.js"


const getLocalUploadPath = (req, fileFieldName) => {
    try {
        let filePath;
        if (req.files && req.files[fileFieldName] && req.files[fileFieldName][0] && req.files[fileFieldName][0].path) {
            filePath = req.files[fileFieldName][0].path;
        } else if(req.file && req.file.path){
            filePath = req.file.path
        } else {
            throw new ApiError(`Failed to retrieve path for field '${fileFieldName}' from request.`);
        }
        return filePath;
    } catch (error) {
        console.error('Error in getLocalUploadPath:', error);
        throw new ApiError(500, "Internal server error", error.message);
    }    
}


export{
    getLocalUploadPath
}