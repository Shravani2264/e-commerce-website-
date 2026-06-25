const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    products: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 }
    }],
    total: Number,
    paymentId: String,
    status: {
        type: String,
        enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
        default: "pending"
    },
    address: String,
}, { timestamps: true });

module.exports = mongoose.model("order", orderSchema);
