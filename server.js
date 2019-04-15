// =================================
// REQUIRE
const express = require("express");
const exphbs = require('express-handlebars');
const mongojs = require("mongojs");
const axios = require("axios");
const cheerio = require("cheerio");
// =================================




// =================================
// SERVER
const PORT = process.argv[2] || process.env.PORT || 3003;
const app = express(); // initialize express
app.engine('handebars', exphbs({defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use(express.static('public'));
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
const databaseName = "mongoHomework";
const collectionNames = ["reviews"];
const db = mongojs(databaseName, collectionNames); // load the mongo database into the "db" variable
db.on("error", function(error) { // handle errors
    console.log("Database Error: ",error);
})
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
        
            // =================================
            // WRITE newEntry TO DB
    
            db.reviews.find( { $and: [ {album: album}, {artist: artist} ] }, (error, found) => {
                if (error) {
                    console.log(error);
                }
                else {
                    if (!found[0]) { // if the review doesn't exist already, write it
                        console.log("not found");
                        db.reviews.insert(newEntry, (err, inserted) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("new insertion:");
                                console.log(inserted);
                                // put the second lookup here after the database entry has been input
                                axios.get(inserted.url).then(response => {
                                    const $ = cheerio.load(response.data);
                                    const snippet = $("div.review-detail__abstract").children("p").text();
                                    db.reviews.update( { _id: inserted._id }, { $push: { snippet: snippet } } );
                                });
                            }
                        });
                    } else { // otherwise it exists already, so do nothing
                        console.log(album + " by " + artist + " already exists in DB");
                    }
                }
            });        
            // =================================
        }); // close cheerio loop through review divs
    }); // close axios .then()
}
// =================================


scrapeReviews(); // run it




// =================================
// LISTENER
app.listen(PORT, () => {
    console.log(`Listening on port: ${PORT}`);
});
// =================================
