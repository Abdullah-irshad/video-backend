import mongoose from 'mongoose'
import {DB_NAME} from '../constants.js'

const connectDB = async ()=>{
    try{
        // const connectInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        const connectInstance = await mongoose.connect("mongodb://localhost:27017/VideoStream");
        console.log(`\n MongoDB connected !! DB HOST: ${connectInstance.connection.host}`)
    }catch(error){
        console.log("MongoDB connection error ", error);
        process.exit(1);
    }
}

export default connectDB