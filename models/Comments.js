const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CommentsSchema = new Schema({
    author: String,
    comment: String,
    // do we need something here for the ID of the review it belongs to?
});

const Comments = mongoose.model("Comments", CommentsSchema);

module.exports = Comments;