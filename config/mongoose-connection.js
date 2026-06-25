const mongoose = require('mongoose');
const dbgr = require("debug")("development:mongoose");
const config = require("config");

const uri = process.env.MONGODB_URI || config.get("MONGODB_URI");

mongoose
.connect(`${uri}/sillylillies`)
.then(function(){
    dbgr("connected to MongoDB at " + uri);
})
.catch(function(err){
    console.log(err);
})

module.exports = mongoose.connection;