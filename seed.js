require("dotenv").config();
const mongoose = require('mongoose');
const config = require("config");

const productModel = require('./models/product-model');

// Connect to MongoDB
mongoose.connect(`${config.get("MONGODB_URI")}/sillylillies`)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ DB Error:", err));

// Sample products data
const sampleProducts = [
    {
        name: "Classic Tote Bag",
        price: 599,
        Discount: 15,
        bgcolor: "#fff0f5",
        panelcolor: "#ffe4e1",
        textcolor: "#8b0000",
        imagePath: "/images/1bag.png",
    },
    {
        name: "Shoulder Sling Bag",
        price: 449,
        Discount: 10,
        bgcolor: "#fffacd",
        panelcolor: "#fef9c3",
        textcolor: "#78350f",
        imagePath: "/images/2bag.png",
    },
    {
        name: "Mini Crossbody Bag",
        price: 549,
        Discount: 20,
        bgcolor: "#f0f0ff",
        panelcolor: "#e9d5ff",
        textcolor: "#4b0082",
        imagePath: "/images/3bag 1.png",
    },
    {
        name: "Leather Handbag",
        price: 699,
        Discount: 25,
        bgcolor: "#fff5ee",
        panelcolor: "#fed7aa",
        textcolor: "#7c2d12",
        imagePath: "/images/4bag.png",
    },
    {
        name: "Casual Backpack",
        price: 799,
        Discount: 12,
        bgcolor: "#f5f5f5",
        panelcolor: "#e5e7eb",
        textcolor: "#1f2937",
        imagePath: "/images/5bag.png",
    },
    {
        name: "Party Clutch Bag",
        price: 489,
        Discount: 8,
        bgcolor: "#ffe4e1",
        panelcolor: "#fce7f3",
        textcolor: "#be185d",
        imagePath: "/images/6bag.png",
    },
    {
        name: "Travel Duffel Bag",
        price: 899,
        Discount: 30,
        bgcolor: "#f0ffff",
        panelcolor: "#ccfbf1",
        textcolor: "#134e4a",
        imagePath: "/images/7bag.png",
    },
    {
        name: "Everyday Canvas Bag",
        price: 349,
        Discount: 5,
        bgcolor: "#f7fee7",
        panelcolor: "#d9f99d",
        textcolor: "#365314",
        imagePath: "/images/image 80.png",
    },
];

async function seedDatabase() {
    try {
        // Clear existing products
        await productModel.deleteMany({});
        console.log("🗑️  Cleared existing products");

        // Insert sample products
        const created = await productModel.insertMany(sampleProducts);
        console.log(`✅ Successfully created ${created.length} sample products!`);

        // Display created products
        console.log("\n📦 Created Products:");
        created.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} - ₹${product.price} (${product.Discount}% off)`);
        });

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error.message);
        process.exit(1);
    }
}

seedDatabase();
