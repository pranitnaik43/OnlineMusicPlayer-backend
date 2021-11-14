const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Mongo
const mongo = require("./mongo");

// Routes
const authRoutes = require("./routes/auth.routes");
const songsRoutes = require("./routes/songs.routes");

//services
const authService = require("./services/auth.services");

const app = express();
const PORT = (process.env.PORT) ? (process.env.PORT) : 3001;

(async function load() {
  try {
    await mongo.connect();

    app.use(express.json());    //body params -> json
    app.use(express.urlencoded({
      extended: true
    })); //required parsing of url-encoded form data

    app.use(cors());    // allow Cross-Origin Resource sharing

    //allow access to images and songs
    console.log(path.join(__dirname, 'public', 'images'));
    app.use('/thumbnail', express.static(path.join(__dirname, 'public', 'thumbnails')))
    app.use('/song', express.static(path.join(__dirname, 'public', 'songs')))

    app.use("/auth", authRoutes);

    app.use(authService.validateAccessToken);
    
    app.use("/songs", songsRoutes);

    app.listen(PORT, () =>
      console.log(`Server running at port ${PORT}`)
    );
  } catch (err) {
    console.log(err);
  }
})(); //imediately invoked function

