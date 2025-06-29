const express = require('express');
const router = express.Router();

router.get("/", function(req, res){
    console.log("hey");
    res.send("Hello from router!");
});

module.exports = router;