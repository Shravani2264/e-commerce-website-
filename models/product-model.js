const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    image: Buffer,
    imagePath: String,
    name : String,
    price : Number,
    Discount : {
        type : Number,
        default : 0
    },
    bgcolor : String,
    panelcolor : String,
    textcolor : String,
});

module.exports = mongoose.model("product", productSchema);