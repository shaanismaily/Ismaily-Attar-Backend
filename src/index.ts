import { configDotenv } from "dotenv";
import { app } from "./app.js";
configDotenv()
import connectDB from "./db/index.js";


const PORT = process.env.PORT
connectDB()
.then(() => {
    app.listen(PORT || 8000, () => {
        console.log(`Server is running on ${PORT}`)
    })
})
.catch((err) => {
    console.log("MONGODB connection failed !!! ", err)
})