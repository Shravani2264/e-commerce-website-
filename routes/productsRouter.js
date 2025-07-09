const express = require('express');
const router = express.Router();
const upload = require("../config/multer-config");
const productModel = require("../models/product-model");

router.get("/create", function (req, res) {
    res.render("createproducts");
});

router.post("/create", upload.single("image"), async function (req, res) {
   try{ let { name,
        price,
        Discount,
        bgcolor,
        panelcolor,
        textcolor, } = req.body;

    let product = await productModel.create({

        image: req.file.buffer,
        name,
        price,
        Discount,
        bgcolor,
        panelcolor,
        textcolor,


    });
    req.flash("success_msg", "product created successfully!");
    res.redirect("/owners/admin");
}catch(err){
        res.send(err.message)
    }
});

module.exports = router;