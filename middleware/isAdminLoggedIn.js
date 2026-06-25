module.exports = function (req, res, next) {
    console.log("[isAdminLoggedIn] sessionID:", req.sessionID, "| adminLoggedIn:", req.session && req.session.adminLoggedIn);
    if (req.session && req.session.adminLoggedIn) {
        return next();
    }
    req.flash("error_msg", "Please login as admin first");
    res.redirect("/owners/login");
};
