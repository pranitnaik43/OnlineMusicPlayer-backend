const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: false });

const mongo = {
  users: null,
  songs: null,
  playlists: null,


  async connect() {
    await client.connect(); // Connecting to DB
    const db = client.db(process.env.MONGODB_NAME); // Selecting DB
    console.log("Mongo DB Connected");

    this.users = db.collection("users");
    this.songs = db.collection("songs");
    this.playlists = db.collection("playlists");
  }
};

module.exports = mongo;
