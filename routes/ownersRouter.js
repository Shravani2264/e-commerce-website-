const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const ownerModel = require("../models/owner-model");
const productModel = require("../models/product-model");
const orderModel = require("../models/order-model");
const userModel = require("../models/user-model");
const upload = require("../config/multer-config");
const isAdminLoggedIn = require("../middleware/isAdminLoggedIn");

// ── First-time setup (only works when no admin exists) ────────────────────────
router.get("/setup", async (req, res) => {
    const count = await ownerModel.countDocuments();
    if (count > 0) return res.redirect("/owners/login");
    res.render("admin-setup", { error: [] });
});

router.post("/setup", async (req, res) => {
    try {
        const count = await ownerModel.countDocuments();
        if (count > 0) return res.redirect("/owners/login");

        const { fullname, email, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        await ownerModel.create({ fullname, email, password: hashed });

        req.flash("error_msg", "Admin account created! Please log in.");
        res.redirect("/owners/login");
    } catch (err) {
        res.render("admin-setup", { error: ["Failed to create account: " + err.message] });
    }
});

// ── Admin Login ───────────────────────────────────────────────────────────────
router.get("/login", (req, res) => {
    const error = req.flash("error_msg");
    res.render("admin-login", { error });
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("[ADMIN LOGIN] attempt:", email);

        const owner = await ownerModel.findOne({ email });
        if (!owner) {
            console.log("[ADMIN LOGIN] no owner found for:", email);
            req.flash("error_msg", "No admin account found with that email");
            return res.redirect("/owners/login");
        }

        // Support both bcrypt and plain-text passwords
        let isMatch = false;
        if (owner.password.startsWith("$2b$") || owner.password.startsWith("$2a$")) {
            isMatch = await bcrypt.compare(password, owner.password);
        } else {
            isMatch = owner.password === password;
        }

        console.log("[ADMIN LOGIN] password match:", isMatch);
        if (!isMatch) {
            req.flash("error_msg", "Wrong password");
            return res.redirect("/owners/login");
        }

        req.session.adminLoggedIn = true;
        req.session.adminEmail = owner.email;
        req.session.adminName = owner.fullname;
        console.log("[ADMIN LOGIN] session set, saving... sessionID:", req.sessionID);

        req.session.save((err) => {
            if (err) {
                console.error("[ADMIN LOGIN] session save error:", err);
                req.flash("error_msg", "Session error, please try again");
                return res.redirect("/owners/login");
            }
            console.log("[ADMIN LOGIN] session saved OK, redirecting to /owners/admin");
            res.redirect("/owners/admin");
        });
    } catch (err) {
        console.error("[ADMIN LOGIN] error:", err);
        req.flash("error_msg", "Login failed: " + err.message);
        res.redirect("/owners/login");
    }
});

router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/owners/login");
    });
});

// ── Admin Dashboard ───────────────────────────────────────────────────────────
router.get("/admin", isAdminLoggedIn, async (req, res) => {
    try {
        const [products, orders, users] = await Promise.all([
            productModel.find().sort({ _id: -1 }),
            orderModel.find().sort({ createdAt: -1 }).limit(10).populate("user", "fullname email"),
            userModel.find().select("fullname email createdAt")
        ]);

        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const success = req.flash("success_msg");
        const error = req.flash("error_msg");

        res.render("admin-dashboard", {
            products, orders, users,
            totalRevenue,
            adminName: req.session.adminName,
            success, error
        });
    } catch (err) {
        res.status(500).send("Error loading dashboard: " + err.message);
    }
});

// ── Add Product ───────────────────────────────────────────────────────────────
router.get("/admin/products/add", isAdminLoggedIn, (req, res) => {
    const error = req.flash("error_msg");
    res.render("admin-add-product", { error, adminName: req.session.adminName });
});

router.post("/admin/products/add", isAdminLoggedIn, upload.single("image"), async (req, res) => {
    try {
        const { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;
        const productData = {
            name,
            price: Number(price),
            Discount: Number(discount) || 0,
            bgcolor: bgcolor || "#f3f4f6",
            panelcolor: panelcolor || "#ffffff",
            textcolor: textcolor || "#1f2937",
        };
        if (req.file) productData.image = req.file.buffer;

        await productModel.create(productData);
        req.flash("success_msg", `Product "${name}" created successfully!`);
        res.redirect("/owners/admin");
    } catch (err) {
        req.flash("error_msg", "Failed to create product: " + err.message);
        res.redirect("/owners/admin/products/add");
    }
});

// ── Edit Product ──────────────────────────────────────────────────────────────
router.get("/admin/products/edit/:id", isAdminLoggedIn, async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);
        if (!product) { req.flash("error_msg", "Product not found"); return res.redirect("/owners/admin"); }
        const error = req.flash("error_msg");
        res.render("admin-edit-product", { product, error, adminName: req.session.adminName });
    } catch (err) {
        req.flash("error_msg", "Error loading product");
        res.redirect("/owners/admin");
    }
});

router.post("/admin/products/edit/:id", isAdminLoggedIn, upload.single("image"), async (req, res) => {
    try {
        const { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;
        const update = {
            name,
            price: Number(price),
            Discount: Number(discount) || 0,
            bgcolor, panelcolor, textcolor
        };
        if (req.file) update.image = req.file.buffer;

        await productModel.findByIdAndUpdate(req.params.id, update);
        req.flash("success_msg", `Product "${name}" updated!`);
        res.redirect("/owners/admin");
    } catch (err) {
        req.flash("error_msg", "Failed to update product");
        res.redirect("/owners/admin/products/edit/" + req.params.id);
    }
});

// ── Delete Product ────────────────────────────────────────────────────────────
router.get("/admin/products/delete/:id", isAdminLoggedIn, async (req, res) => {
    try {
        const product = await productModel.findByIdAndDelete(req.params.id);
        req.flash("success_msg", `Product "${product?.name}" deleted`);
    } catch (err) {
        req.flash("error_msg", "Failed to delete product");
    }
    res.redirect("/owners/admin");
});

// ── Create owner (dev only) ───────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
    router.post("/create", async (req, res) => {
        try {
            const owners = await ownerModel.find();
            if (owners.length > 0) return res.status(503).send("Owner already exists");
            const { fullname, email, password } = req.body;
            const hashed = await bcrypt.hash(password, 10);
            const owner = await ownerModel.create({ fullname, email, password: hashed });
            res.status(201).json({ message: "Admin created", email: owner.email });
        } catch (err) {
            res.status(500).send(err.message);
        }
    });
}

module.exports = router;
