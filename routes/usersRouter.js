const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser } = require("../controllers/authController");
const isloggedin = require("../middleware/isloggedin");
const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", isloggedin, logoutUser);

// ── Profile ──────────────────────────────────────────────────────────────────
router.get("/profile", isloggedin, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email }).select("-password");
        const success = req.flash("success_msg");
        const error = req.flash("error_msg");
        res.render("profile", { user, success, error });
    } catch (err) {
        req.flash("error_msg", "Error loading profile");
        res.redirect("/shop");
    }
});

router.post("/profile/update", isloggedin, async (req, res) => {
    try {
        const { fullname, contact, address } = req.body;
        await userModel.findOneAndUpdate(
            { email: req.user.email },
            { fullname, contact: contact || undefined, address }
        );
        req.flash("success_msg", "Profile updated successfully!");
        res.redirect("/users/profile");
    } catch (err) {
        req.flash("error_msg", "Failed to update profile");
        res.redirect("/users/profile");
    }
});

// ── Orders ────────────────────────────────────────────────────────────────────
router.get("/orders", isloggedin, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email })
            .populate({ path: "orders", populate: { path: "products.product" } });
        const success = req.flash("success_msg");
        res.render("orders", { user, orders: user.orders || [], success });
    } catch (err) {
        req.flash("error_msg", "Error loading orders");
        res.redirect("/shop");
    }
});

// ── Wishlist ──────────────────────────────────────────────────────────────────
router.get("/wishlist", isloggedin, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email }).populate("wishlist");
        const success = req.flash("success_msg");
        res.render("wishlist", { user, wishlist: user.wishlist || [], success });
    } catch (err) {
        req.flash("error_msg", "Error loading wishlist");
        res.redirect("/shop");
    }
});

router.get("/wishlist/add/:productid", isloggedin, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email });
        const alreadyIn = user.wishlist.some(id => id.toString() === req.params.productid);
        if (!alreadyIn) {
            user.wishlist.push(req.params.productid);
            await user.save();
            req.flash("success_msg", "Added to wishlist!");
        } else {
            req.flash("success_msg", "Already in your wishlist");
        }
        res.redirect("/shop");
    } catch (err) {
        req.flash("error_msg", "Failed to add to wishlist");
        res.redirect("/shop");
    }
});

router.get("/wishlist/remove/:productid", isloggedin, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email });
        user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productid);
        await user.save();
        req.flash("success_msg", "Removed from wishlist");
        res.redirect("/users/wishlist");
    } catch (err) {
        req.flash("error_msg", "Failed to remove from wishlist");
        res.redirect("/users/wishlist");
    }
});

// ── Move wishlist item to cart ────────────────────────────────────────────────
router.get("/wishlist/move-to-cart/:productid", isloggedin, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email });
        user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productid);
        if (!user.cart.some(id => id.toString() === req.params.productid)) {
            user.cart.push(req.params.productid);
        }
        await user.save();
        req.flash("success_msg", "Moved to cart!");
        res.redirect("/users/wishlist");
    } catch (err) {
        req.flash("error_msg", "Failed to move to cart");
        res.redirect("/users/wishlist");
    }
});

module.exports = router;
