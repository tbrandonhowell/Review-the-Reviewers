// =================================
// REQUIRE
const express = require("express");
const exphbs = require('express-handlebars');
const mongojs = require("mongojs"); // TODO: I think this needs to go
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
// TODO: 
app.use(express.urlencoded({ extended: false })); // TODO: what does this do?
app.use(express.json()); // TODO: what does this do?
// =================================


// TODO: 
// Define our routes
// app.use(require('./routes/htmlRoutes')(db));
// app.use('/api', require('./routes/apiRoutes')(passport, db));
// =================================



// =================================
// DATABASE
// const databaseName = "mongoHomework";
// const collectionNames = ["reviews"];
// const db = mongojs(databaseName, collectionNames); // load the mongo database into the "db" variable
// db.on("error", function(error) { // handle errors
//     console.log("Database Error: ",error);
// })
// use mongoose instead:
const db = require("./models");
mongoose.connect("mongodb://localhost/mongoHomework", { useNewUrlParser: true });
// =================================

// =================================
// FUNCTION: scrapeReviews()

const scrapeReviews = () => {

    axios.get("https://pitchfork.com/reviews/albums/").then(response => {

        const $ = cheerio.load(response.data);
    
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

            console.log(newEntry);
        
            // =================================
            // WRITE newEntry TO DB

            db.Reviews.create(newEntry)
                .then(inserted => {
                    console.log("New review saved to DB:");
                    console.log(inserted.url);
                    axios.get(inserted.url).then(response => { // do a second axios call to the review URL and grab the snippet
                        const $ = cheerio.load(response.data);
                        const snippet = $("div.review-detail__abstract").children("p").text();
                        db.Reviews.update( { _id: inserted._id }, { snippet: snippet } )
                            .then(updated => {
                                console.log("Updated Entry:");
                                console.log(updated);
                            });
                    });
                })
                .catch(err => {
                    console.log(err);
                })

            // =================================
        }); // close cheerio loop through review divs

    }); // close axios .then()

    
}
// =================================

// =================================
// GET "/just-scrape" INITIAL ROUTE TO JUST SCRAPE
app.get("/just-scrape", (req,res) => {
    scrapeReviews(); // run it
    res.render("temp-scrape");
    // res.send("Scrape Complete"); // TODO: this needs to actually wait until the scraping is done before it fires off
});
// =================================

// =================================
// GET "/" ROOT ROUTE
app.get("/", (req,res) => {
    console.log("\n\nRoot Route requested.");
    db.Reviews.find({}) // TODO: need to update this to sort based on newest review in database
        .then(response => {
            console.log(response);
            res.render("index", {reviews: response} );
        });
});
// =================================

// =================================
// GET "/reviews" ROUTE - show all reviews with reviews
// =================================

// =================================
// GET "/reviews/_id" ROUTE - show reviews of specific review
app.get("/reviews/:id", (req,res) => {
    console.log("\n\n/reviews/:id route requested");
    db.Reviews.findOne({_id: req.params.id})
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
// =================================

// =================================
// LISTENER
app.listen(PORT, () => {
    console.log(`Listening on port: ${PORT}`);
});
// =================================
