const { ObjectId } = require("mongodb");
const Joi = require("joi");
const multer  = require('multer');
const path = require("path");

const azureServices = require("./azure.services")
const db = require("../mongo");

const songBody = Joi.object({
  name: Joi.string().required(),
  // thumbnail: Joi.required(),
  // song: Joi.required(),
  lyrics: Joi.string().allow(null, '').optional(),
  artists: Joi.string().allow(null, '').optional()
});
const supportedAudioMimeTypes = ['audio/mp3', 'audio/mpeg'];
const supportedThumnbnailMimeTypes = ['image/jpeg', 'image/webp', 'image/png'];
const ONE_MEGABYTE = 1024 * 1024;

//using multer for storing images and songs to memory
const storage = multer.memoryStorage()

const fileFilter = async (req, file, cb) => {
  //Validate Request Body
  const { error } = await songBody.validate(req.body);
  if (error) cb({ message: error.details[0].message }, false);

  // console.log("check",req.body, req.files);
  if (file.fieldname === "song" && supportedAudioMimeTypes.includes(file.mimetype)) {  //audio file
    cb(null, true)
  } else if (file.fieldname === "thumbnail" && supportedThumnbnailMimeTypes.includes(file.mimetype)) {  //image file
    cb(null, true)
  } else {
    console.log("invalidFileType: ",file.mimetype);
    cb({ message: 'Mime type not supported' }, false)
  }
  // cb(new Error('error'))
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 6*ONE_MEGABYTE, files: 2 } }).any();

const getBlobName = (file) => {
  let extension = path.extname(file.originalname);
  let fileNameWithoutExt = path.basename(file.originalname, extension);
  return file.fieldname + "/" + fileNameWithoutExt + '-' + Date.now() + extension;
};

const service = {
  async findAll(req, res) {
    try{
      const data = await db.songs.find().toArray();
      res.send(data);
    } catch(err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" }});
    }
  },
  async findById(req, res) {
    try{
      let songId = req.params.id;
      // console.log(songId);
      const data = await db.songs.findOne({ _id: new ObjectId(songId) });
      res.send(data);
    } catch(err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" }});
    }
  },
  async insert(req, res) {
    try {
      upload(req, res, async (err) => {
        // console.log("check123 ", req.body, req.files)
        if (err) {
          return res.send({ error: { message: "Error in saving file: "+err.message }});
        }

        //check if song already exists
        const data = await db.songs.findOne({ name: req.body.name });
        if(data) {
          return res.send({ error: { message: "Song already exists" }});
        }
        
        //check if files were stored
        // console.log(req.files);
        if(!req.files) { //these files are added by multer after storing
          return res.send({ error: { message: "Error in saving file" }});
        }
        req.files.forEach(file => {
          let blobName = getBlobName(file);
          req.body[file.fieldname+'details'] = {
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            size: file.size,
            blobname: blobName
          };
          let response = azureServices.save(blobName, file.buffer);
          if(response.error) return res.send({ error: { message: "Failed to upload files" }});
        });
        await db.songs.insertOne(req.body);
        res.send({ success: { message: "Song added successfully" }});
      })
    } catch(err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" }});
    }
  },
  async updateById(req, res) {
    try {
      upload(req, res, async (err) => {
        let songId = req.params.id;
        // console.log("check123 ", req.body, req.files)
        if (err) {
          return res.send({ error: { message: "Error in saving file: "+err.message }});
        }

        //check if song with given id exists
        const data = await db.songs.findOne({ _id: new ObjectId(songId) });
        if(!data) {
          return res.send({ error: { message: "Invalid ID" }});
        }
        
        //add files to body
        req.files.forEach(file => {
          req.body[file.fieldname+'details'] = file;
        });

        await db.songs.updateOne(
          { _id: new ObjectId(songId) },
          { $set: { ...req.body } }
        );
        res.send({ success: { message: "Song updated successfully" }});
      })
    } catch(err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" }});
    }
  },
  async deleteById(req, res) {
    try {
      let songId = req.params.id;
      //check if song exists
      const data = await db.songs.findOne({ _id: new ObjectId(songId) });
      if(!data) {
        return res.send({ error: { message: "Song does not exist" }});
      }

      await db.products.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send({ success: { message: "Song deleted successfully" }});
    } catch(err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" }});
    }
  },
  async addToPlaylists(req, res) {
    try {
      let songId = req.params.id;
      //check if song exists
      const data = await db.songs.findOne({ _id: new ObjectId(songId) });
      if(!data) {
        return res.send({ error: { message: "Song does not exist" }});
      }

      let playlists = req.body.playlists;
      if(!playlists) {
        return res.send({ error: { message: "Invalid request" }});
      }

      let failed = [];
      await Promise.all(playlists.map(async (playlistId) => {
        //get the playlist
        let playlist = await db.playlists.findOne({ _id: new ObjectId(playlistId) });
        if(!playlist) {
          failed.push({id: playlist, reason: "does not exist"});
        }
        //check if playlist belongs to the user
        if(!playlist.userId===req.userId) {
          failed.push({id: playlist, reason: "does not have access"});
          return;
        }
        //check if playlist contains the song array
        if(!playlist.songs) {
          playlist.songs = [];
        }
        //add song if not already present in the playlist
        if(!playlist.songs.includes(songId)) {
          playlist.songs.push(songId);
        }
        //update the playlist
        await db.playlists.updateOne(
          { _id: new ObjectId(playlistId) },
          { $set: { ...playlist } }
        );
      }));
      res.send({ success: { message: "Added to the playlists", failed }});

    } catch(err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" }});
    }
  }
};

module.exports = service;
