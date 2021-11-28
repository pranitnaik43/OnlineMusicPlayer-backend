const { ObjectId } = require("mongodb");

const db = require("../mongo");

const createIndex = async () => {
  try {
  let indices = await db.songs.getIndexes();
  if(indices && indices.length > 1) return true; //text index already exists

  await db.songs.createIndex({"name":"text","lyrics":"text"}, {"weights": { name: 3, lyrics:1 }});
  return true;
  } catch(err) {
    console.log(err);
    return false;
  }
}

const service = {
  async searchSongs(req, res) {
    try {
      // let createdIndex = await createIndex();
      // if(!createdIndex) return res.send({ error: { message: "Indexing failed" }});

      let searchText = req.query.text;

      if(!searchText) {
        return res.send({ error: { message: "No text found" }});
      }
      let result = await db.songs.find({$text: {$search: searchText}}, {score: {$meta: "textScore"}}).sort({score:{$meta:"textScore"}}).limit(10).toArray();
      // console.log(result)
      res.send(result);
    } 
    catch(err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" }});
    }
  }
};

module.exports = service;
