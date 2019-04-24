// =================================
// REQUIRE
const express = require("express");
const exphbs = require('express-handlebars');
const mongoose = require("mongoose");
const axios = require("axios");
const cheerio = require("cheerio");
// =================================

// =================================
// SERVER
const PORT = process.argv[2] || process.env.PORT || 3769;
const app = express(); // initialize express
app.engine('handlebars', exphbs({defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use(express.static('public')); // establish public folder
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// =================================

// TODO: Define separate route files
// app.use(require('./routes/htmlRoutes')(db));
// app.use('/api', require('./routes/apiRoutes')(passport, db));
// =================================

// =================================
// DATABASE
const db = require("./models");
let MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHomework"
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });
// =================================

// =================================
// FUNCTION: pullReviews()
const pullReviews = (res) => {
    db.Reviews.find({}) // TODO: need to update this to sort based on newest review in database
        .then(response => {
            console.log("reviews pulled from DB for print");
            // console.log(response);
            res.render("index", {reviews: response} );
        }) 
}
// =================================

// =================================
// FUNCTION: scrapeReviews()
const scrapeReviews = (res) => {

    axios.get("https://pitchfork.com/reviews/albums/").then(response => {

        const $ = cheerio.load(response.data);
        
        const promises = [];

        $("div.review").each((i, element) => {
    
            let newEntry = {}; // start our new DB entry
    
            const artist = $(element).find(".review__title-artist li").text();
            // console.log("artist: " + artist);
            newEntry.artist = artist;
    
            const album = $(element).find("h2.review__title-album").text();
            // console.log("album: " + album);
            newEntry.album = album;
    
            const url = "https://pitchfork.com" + $(element).children("a").attr("href");
            // console.log("url: " + url);
            newEntry.url = url;
    
            const image = $(element).find("div.review__artwork").children("div").children("img").attr("src");
            // console.log("image: " + image);
            newEntry.image = image;
    
            var author = $(element).find(".display-name").text();
            author = author.replace(/by: /gi,"");
            // console.log("author: " + author);
            newEntry.author = author;

            // console.log(newEntry);

            // GET THE SNIPPET & write to DB
            promises.push(new Promise((resolve, reject) => {
                axios.get(url).then(response => { // do a second axios call to the review URL and grab the snippet
                    const $ = cheerio.load(response.data);
                    newEntry.snippet = $("div.review-detail__abstract").children("p").text();
                    // console.log("\n\nnewEntry:");
                    // console.log(newEntry);
    
                    db.Reviews.create(newEntry)
                        .then(inserted => {
                            console.log("New review saved to DB:");
                            console.log(inserted);
                            resolve('Finished')
                        })
                        .catch(err => {
                            console.log(err);
                            resolve('err happened')
                        })
                    
                });
            })) // close push of new Promise
            
        }); // close cheerio loop through review divs
        Promise.all(promises).then(promiseResults => {
            console.log(promiseResults, 'promise results')
            res.send('Done')
        })
    }); // close axios .then()
    
} // close function
// =================================

// =================================
// GET "/" ROOT ROUTE
app.get("/", (req,res) => {
    console.log("\n\nRoot Route requested.");
    pullReviews(res);
});
// =================================

// =================================
// POST "/api/just-scrape" INITIAL ROUTE TO JUST SCRAPE
app.post("/api/just-scrape", (req,res) => {
    console.log("\n\nScrape API Trigger requested")
    scrapeReviews(res)
});
// =================================

// =================================
// GET "/reviews" ROUTE - show all reviews with reviews
app.get("/reviews", (req,res) => {
    console.log("\n\n/reviews route requested");
    db.Reviews.find({ comments: {$ne: [] } })
        .then(response => {
            console.log(response);
            res.render("reviews", {reviews: response});
        })
})
// =================================

// =================================
// GET "/reviews/_id" ROUTE - show reviews of specific review
app.get("/reviews/:id", (req,res) => {
    console.log("\n\n/reviews/:id route requested");
    db.Reviews.findOne({_id: req.params.id}).populate("comments")
        .then(response => {
            console.log(response);
            res.render("reviews-of-review", response);
        })
});
// =================================

// =================================
// GET "/leave-review/_id" ROUTE - leave a review
app.get("/leave-review/:id", (req,res) => {
    console.log("\n\n/leave-review/:id route requested");
    db.Reviews.findOne({_id: req.params.id})
        .then(response => {
            console.log(response);
            res.render("leave-review", response);
        })
});
// =================================

// =================================
// POST "/api/post-review" ROOT ROUTE - add a review
app.post("/api/post-review", (req,res) => {
    console.log("\n\n/api/post-review POST received");
    db.Comments.create(req.body)
        .then(newComment => {
            console.log("new comment added:");
            console.log(newComment);
            return db.Reviews.findOneAndUpdate({_id: req.body.id},{ $push: { comments: newComment._id } }, {new: true});
        })
        .then(response => {
            console.log(response);
            return res.status(200).end(); // return a 200 server status if everything went okay.
        })
        .catch(err => {
            res.json(err);
        })
});
// =================================

// =================================
// POST "/api/post-review" ROOT ROUTE - add a review
app.post("/api/drop-review", (req,res) => {
    console.log("\n\n/api/drop-review POST received");
    db.Reviews.update( {}, { $pull: { comments: req.body.id} })
        .then(response => {
            console.log(response);
            return res.status(200).end(); // return a 200 server status if everything went okay.
        })
        .catch(err => {
            res.json(err);
        })
});
// =================================

// =================================
// LISTENER
app.listen(PORT, () => {
    console.log(`Listening on port: ${PORT}`);
});
// =================================
