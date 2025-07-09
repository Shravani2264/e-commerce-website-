const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser } = require("../controllers/authController");
const isloggedin = require("../middleware/isloggedin");

router.get("/", function (req, res) {
    console.log("hey");
    res.send("Hello from router!");
});

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", isloggedin, logoutUser);
router.use((req, res, next) => {
    console.log("🍪 Cookies:", req.cookies); // will log token if still present
    next();
});

module.exports = router;