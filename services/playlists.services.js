const { ObjectId } = require("mongodb");
const Joi = require("joi");

const db = require("../mongo");

const type = {
  PUBLIC: "public",
  PRIVATE: "private"
}

//required field for creating and uodating playlist
const playlistBody = Joi.object({
  name: Joi.string().required(),
  color: Joi.string().allow(null, '').optional(),
  type: Joi.string().allow(null, '').optional(), // public(added by admin) or private(added by user)
  songs: Joi.array().allow(null).optional()   //not needed during creation
});

const service = {
  async findAll(req, res) {
    //get all the playlists for the user
    try {
      let userId = req.userId;
      let isAdmin = req.isAdmin;
      if (isAdmin) {
        //if admin, send all public playlists
        var data = await db.playlists.find({ type: "public" }).toArray();
        return res.send(data);
      }
      var data = await db.playlists.find({ userId }).toArray();
      res.send(data);
    } catch (err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" } });
    }
  },
  async findPublicPlaylists(req, res) {
    //get all the public playlists
    try {
      var data = await db.playlists.find({ type: "public" }).toArray();
      return res.send(data);
    } catch (err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" } });
    }
  },
  async findById(req, res) {
    //get playlist by id(along with songs data)
    try {
      let playlistId = req.params.id;

      //get playlist
      const playlist = await db.playlists.findOne({ _id: new ObjectId(playlistId) });

      //if playlist is not found
      if (!playlist) {
        return res.send({ error: { message: "Playlist not found" } });
      }
      res.send({ ...playlist });

    } catch (err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" } });
    }
  },
  async insert(req, res) {
    try {
      //Validate Request Body
      const { error } = await playlistBody.validate(req.body);
      if (error) return res.send({ error: { message: error.details[0].message } });
      
      //check if name already exists
      const data = await db.playlists.findOne({ name: req.body.name, userId: req.userId });
      if (data) {
        return res.send({ error: { message: "Playlist name already exists" } });
      }
      
      if(req.isAdmin) {
        req.body.type = type.PUBLIC;
      } else {
        req.body.type = type.PRIVATE;
      }
      // console.log(req.isAdmin, req.body.type);

      req.body.userId = req.userId;
      await db.playlists.insertOne(req.body);
      res.send({ success: { message: "Playlist created successfully" } });

    } catch (err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" } });
    }
  },
  async updateById(req, res) {
    try {
      //Validate Request Body
      const { error } = await playlistBody.validate(req.body);
      if (error) return res.send({ error: { message: error.details[0].message } });
      
      let playlistId = req.params.id;
      const playlist = await db.playlists.findOne({ _id: new ObjectId(playlistId) });
      //check if playlist exists
      if(!playlist) {
        return res.send({ error: { message: "Playlist does not exists" } });
      }

      //admin playlists
      if(playlist.type===type.PUBLIC && !req.isAdmin) {
        return res.send({ error: { message: "You don't have access to edit this playlist" } });
      }

      await db.playlists.updateOne(
        { _id: new ObjectId(playlistId) },
        { $set: { ...req.body } }
      );
      res.send({ success: { message: "Playlist updated successfully" } });

    } catch (err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" } });
    }
  },
  async deleteById(req, res) {
    try {
      let playlistId = req.params.id;
      //check if playlist exists
      const data = await db.playlists.findOne({ _id: new ObjectId(playlistId) });
      if (!data) {
        return res.send({ error: { message: "Playlist does not exist" } });
      }
      //delete
      await db.playlists.deleteOne({ _id: new ObjectId(playlistId) });
      res.send({ success: { message: "Playlist deleted successfully" } });
    } catch (err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" } });
    }
  }

};

module.exports = service;
