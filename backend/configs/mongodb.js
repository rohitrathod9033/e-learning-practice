import mongoose from "mongoose";

// Connect To MongoDB Database

const connectDB = async () => {
    mongoose.connection.on('connected', () => console.log("Database Connected Succesfully..."))

    await mongoose.connect(`${process.env.MONGODB_URI}/E-Learning-Portal`)
}

export default connectDB