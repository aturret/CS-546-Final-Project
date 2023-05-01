import userRouter from "./user.js"
import hotelRouter from "./hotel.js"
import adminRouter from "./admin.js"

const constructorMethod = app => {
    app.use("/user", userRouter);
    app.use("/admin", adminRouter)
    app.use("/", hotelRouter)
    app.use("*", (req, res) => {
        res.status(404).json({Error: "Not found"});
    })
}

export default constructorMethod;