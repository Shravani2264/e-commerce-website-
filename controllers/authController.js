const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/generateToken");

module.exports.registerUser = async function (req, res) {
    try {
        const { email, password, fullname } = req.body;

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            req.flash("error_msg", "You already have an account");
            return res.redirect("/");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await userModel.create({
            email,
            password: hashedPassword,
            fullname
        });

        const token = generateToken(newUser);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        });

        req.flash("success_msg", "Account created successfully!");
        res.redirect("/");
    } catch (err) {
        req.flash("error_msg", "Something went wrong. Please try again.");
        res.redirect("/");
    }
};

module.exports.loginUser = async function (req, res) {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) {
            req.flash("error_msg", "Invalid email or password");
            return res.redirect("/");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash("error_msg", "Invalid email or password");
            return res.redirect("/");
        }

        const token = generateToken(user);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        });

        req.flash("success_msg", "Logged in successfully!");
        res.redirect("/shop");
    } catch (err) {
        req.flash("error_msg", "Login failed. Try again.");
        res.redirect("/");
    }
};

module.exports.logoutUser = function (req, res) {
    res.clearCookie("token", {
        httpOnly: true,
        secure: false,     // must be false in development
        sameSite: "strict", // ADD if you used this while setting the cookie
        path: "/",          // very important
    });

    req.flash("success_msg", "Logged out successfully");
            console.log(req.cookies.token);

    res.redirect("/");
};


