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