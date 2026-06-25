require("dotenv").config(); 

const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const expressSession = require("express-session");
const flash = require("connect-flash");

if (process.env.NODE_ENV !== "test") {
    require("./config/mongoose-connection");
}

const jwt = require("jsonwebtoken");
const userModel = require("./models/user-model");

const owners = require("./routes/ownersRouter");
const users = require("./routes/usersRouter");
const products = require("./routes/productsRouter");
const indexRouter = require("./routes/index");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
    expressSession({
        resave: false,
        saveUninitialized: false,
        secret: process.env.EXPRESS_SESSION_SECRET || "defaultsecret"
    })
);

app.use(flash());


app.use(async (req, res, next) => {
    res.locals.success_msg = req.flash("success_msg");
    res.locals.error_msg = req.flash("error_msg");
    res.locals.error = req.flash("error");
    res.locals.cartCount = 0;
    if (req.cookies.token) {
        try {
            const decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);
            const u = await userModel.findOne({ email: decoded.email }).select("cart");
            res.locals.cartCount = u ? u.cart.length : 0;
        } catch (_) {}
    }
    next();
});

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

app.use("/", indexRouter);
app.use("/owners", owners);
app.use("/users", users);
app.use("/products", products);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server started on http://localhost:${PORT}`);
    });
}

module.exports = app;
