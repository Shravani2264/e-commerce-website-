const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const db = require("./config/mongoose-connection");
const owners = require("./routes/ownersRouter");
const users = require("./routes/usersRouter");
const products = require("./routes/productsRouter");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use("/owners", owners);
app.use("/users", users);
app.use("/products", products);



app.get("/", (req, res)=>{
    res.send("hey")
});

app.listen(3000);