const express = require('express');
const router = express.Router();
const isloggedin = require("../middleware/isloggedin");
const Product = require("../models/product-model"); // adjust path as needed
const productModel = require('../models/product-model');
const userModel = require('../models/user-model');
router.get("/", function (req, res) {
    let error = req.flash("error");
    res.render("index", { error, loggedin: false });
});



router.get("/shop", isloggedin, async (req, res) => {
    let products = await productModel.find();
    let success = req.flash("success_msg");
    res.render("shop", { products, success });
    // try {
    //     const products = await Product.find(); // Or use sort/filter if needed
    //     res.render("shop", { products }); // ✅ Pass products to the EJS template
    // } catch (err) {
    //     console.error(err);
    //     res.status(500).send("Error loading products");
    // }
});

router.get("/cart", isloggedin, async (req, res) => {
    let products = await productModel.find();
    const user = await userModel.findOne({ email: req.user.email }).populate("cart");


    res.render("cart", { user });
});


router.get("/logout", isloggedin, function (req, res) {
    let error = req.flash("error");
    res.render("shop", { error });
});

router.get("/addtocart/:productid", isloggedin, async function (req, res) {
    let error = req.flash("error");
    let user = await userModel.findOne({ email: req.user.email });
    user.cart.push(req.params.productid);
    await user.save();
    req.flash("success_msg", "added to the cart.");
    res.redirect("/shop");
});

module.exports = router;