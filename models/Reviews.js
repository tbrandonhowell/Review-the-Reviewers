const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ReviewsSchema = new Schema ({
    artist: String,
    album: {
        type: String,
        unique: true
    },
    url: String,
    image: String,
    author: String,
    snippet: String,
    date: {
        type: Date,
        default: Date.now
    },
    comments: [
        {
            type: Schema.Types.ObjectId,
            ref: "Comments"
        }
    ]
});

const Reviews = mongoose.model("Reviews",ReviewsSchema);

module.exports = Reviews;