const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const isloggedin = require("../middleware/isloggedin");
const productModel = require('../models/product-model');
const userModel = require('../models/user-model');
const orderModel = require('../models/order-model');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
router.get("/", function (req, res) {
    let error = req.flash("error");
    res.render("index", { error, loggedin: false });
});



router.get("/shop", isloggedin, async (req, res) => {
    try {
        const { search, sortby, discount: discountFilter, price } = req.query;
        const query = {};

        if (search) query.name = { $regex: search, $options: "i" };
        if (discountFilter === "true") query.Discount = { $gt: 0 };
        if (price === "0-500")     query.price = { $gte: 0,   $lte: 500  };
        if (price === "500-1000")  query.price = { $gte: 500, $lte: 1000 };
        if (price === "1000+")     query.price = { $gte: 1000 };

        let q = productModel.find(query);
        if (sortby === "price-low")  q = q.sort({ price: 1 });
        if (sortby === "price-high") q = q.sort({ price: -1 });
        if (sortby === "newest")     q = q.sort({ _id: -1 });

        const products = await q;
        const success = req.flash("success_msg");
        res.render("shop", {
            products, success,
            search: search || "",
            sortby: sortby || "popular",
            discountFilter: discountFilter || "",
            price: price || ""
        });
    } catch (err) {
        res.status(500).send("Error loading products");
    }
});

router.get("/cart", isloggedin, async (req, res) => {
    const user = await userModel.findOne({ email: req.user.email }).populate("cart");

    // Aggregate duplicate products into {item, quantity}
    const cartMap = {};
    (user.cart || []).forEach(item => {
        const id = item._id.toString();
        if (cartMap[id]) {
            cartMap[id].quantity++;
        } else {
            cartMap[id] = { ...item.toObject(), quantity: 1 };
        }
    });
    const cartItems = Object.values(cartMap);

    const success = req.flash("success_msg");
    const razorpayConfigured = !!(
        process.env.RAZORPAY_KEY_ID &&
        process.env.RAZORPAY_KEY_ID !== "your_razorpay_key_id"
    );
    res.render("cart", { user, cartItems, success, razorpayConfigured });
});

router.get("/addtocart/:productid", isloggedin, async function (req, res) {
    let user = await userModel.findOne({ email: req.user.email });
    user.cart.push(req.params.productid);
    await user.save();
    req.flash("success_msg", "Added to cart!");
    res.redirect("/shop");
});

router.get("/removefromcart/:productid", isloggedin, async function (req, res) {
    let user = await userModel.findOne({ email: req.user.email });
    const idx = user.cart.findIndex(id => id.toString() === req.params.productid);
    if (idx !== -1) user.cart.splice(idx, 1);
    await user.save();
    req.flash("success_msg", "Removed from cart");
    res.redirect("/cart");
});

// ── Demo checkout (no Razorpay keys required) ────────────────────────────────
router.post("/payment/demo-checkout", isloggedin, async function (req, res) {
    try {
        const user = await userModel.findOne({ email: req.user.email }).populate("cart");
        if (!user.cart || user.cart.length === 0) {
            req.flash("error_msg", "Your cart is empty");
            return res.redirect("/cart");
        }

        const deliveryAddress = (req.body.address || "").trim() || user.address || "Not provided";
        if (deliveryAddress === "Not provided") {
            req.flash("error_msg", "Please enter a delivery address");
            return res.redirect("/cart");
        }

        let subtotal = user.cart.reduce((sum, item) => sum + item.price, 0);
        let discount = user.cart.reduce((sum, item) => sum + (item.Discount || 0), 0);
        let tax      = Math.round((subtotal - discount) * 0.18);
        let shipping = subtotal > 500 ? 0 : 50;
        let total    = subtotal - discount + tax + shipping;

        const order = await orderModel.create({
            user: user._id,
            products: user.cart.map(item => ({
                product: item._id,
                name: item.name,
                price: item.price,
                quantity: 1,
            })),
            total,
            address: deliveryAddress,
            paymentId: "DEMO-" + Date.now(),
            status: "processing",
        });

        user.orders.push(order._id);
        user.cart = [];
        if ((req.body.address || "").trim()) user.address = req.body.address.trim();
        await user.save();

        req.flash("success_msg", "Order placed successfully! (Demo mode)");
        res.redirect("/users/orders");
    } catch (err) {
        req.flash("error_msg", "Checkout failed: " + err.message);
        res.redirect("/cart");
    }
});

// ── Razorpay: create order ────────────────────────────────────────────────────
router.post("/payment/create-order", isloggedin, async function (req, res) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || keyId === "your_razorpay_key_id" || !keySecret || keySecret === "your_razorpay_key_secret") {
        return res.status(503).json({
            error: "Razorpay API keys are not configured. Open your .env file and replace RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET with your real test keys from razorpay.com."
        });
    }

    try {
        const user = await userModel.findOne({ email: req.user.email }).populate("cart");
        if (!user.cart || user.cart.length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }

        let subtotal = user.cart.reduce((sum, item) => sum + item.price, 0);
        let discount = user.cart.reduce((sum, item) => sum + (item.Discount || 0), 0);
        let tax      = Math.round((subtotal - discount) * 0.18);
        let shipping = subtotal > 500 ? 0 : 50;
        let total    = subtotal - discount + tax + shipping;

        const rzpOrder = await razorpay.orders.create({
            amount: total * 100,
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
        });

        res.json({
            orderId:   rzpOrder.id,
            amount:    total * 100,
            currency:  "INR",
            keyId,
            userName:  user.fullname || "Customer",
            userEmail: user.email,
            total,
        });
    } catch (err) {
        console.error("[RAZORPAY]", err);
        const msg = err.error ? JSON.stringify(err.error) : err.message;
        res.status(500).json({ error: msg || "Payment gateway error" });
    }
});

// ── Razorpay: verify payment & create DB order ────────────────────────────────
router.post("/payment/verify", isloggedin, async function (req, res) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, address } = req.body;

        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (expectedSign !== razorpay_signature) {
            req.flash("error_msg", "Payment verification failed. Please try again.");
            return res.redirect("/cart");
        }

        const user = await userModel.findOne({ email: req.user.email }).populate("cart");
        let subtotal = user.cart.reduce((sum, item) => sum + item.price, 0);
        let discount = user.cart.reduce((sum, item) => sum + (item.Discount || 0), 0);
        let tax     = Math.round((subtotal - discount) * 0.18);
        let shipping = subtotal > 500 ? 0 : 50;
        let total   = subtotal - discount + tax + shipping;

        const deliveryAddress = (address || "").trim() || user.address || "Not provided";

        const order = await orderModel.create({
            user: user._id,
            products: user.cart.map(item => ({
                product: item._id,
                name: item.name,
                price: item.price,
                quantity: 1,
            })),
            total,
            address: deliveryAddress,
            paymentId: razorpay_payment_id,
            status: "processing",
        });

        user.orders.push(order._id);
        user.cart = [];
        if ((address || "").trim()) user.address = address.trim();
        await user.save();

        req.flash("success_msg", "Payment successful! Order placed.");
        res.redirect("/users/orders");
    } catch (err) {
        req.flash("error_msg", "Order creation failed: " + err.message);
        res.redirect("/cart");
    }
});

module.exports = router;