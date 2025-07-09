const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");
const { NEXT_BODY_SUFFIX } = require("next/dist/lib/constants");

module.exports = async function name(req, res, next) {
    if(!req.cookies.token){
        req.flash("error", "you may need to login");
        return res.redirect("/");
    }

    try{
        let decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);
        let user = await userModel
        .findOne({email: decoded.email})
        .select("-password");
        req.user = user;
       
        next(); 
    }catch(err){
        req.flash("error", "something went wrong.");
        res.redirect("/");
    }
}; 