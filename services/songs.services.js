const { ObjectId } = require("mongodb");
const Joi = require("joi");
const multer  = require('multer');
const path = require("path");

const db = require("../mongo");

const songBody = Joi.object({
  name: Joi.string().required(),
  // thumbnail: Joi.required(),
  // song: Joi.required(),
  lyrics: Joi.string().allow(null, '').optional(),
  artists: Joi.string().allow(null, '').optional()
});
const supportedAudioMimeTypes = ['audio/mp3', 'audio/mpeg'];
const supportedThumnbnailMimeTypes = ['image/jpeg', 'image/webp'];

//using multer for saving images and songs to storage
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    //Validate Request Body
    const { error } = await songBody.validate(req.body);
    if (error) cb({ message: error.details[0].message });

    console.log("check",req.body, req.files);
    if (file.fieldname === "song" && supportedAudioMimeTypes.includes(file.mimetype)) {  //audio file
      cb(null, 'public/songs')
    } else if (file.fieldname === "thumbnail" && supportedThumnbnailMimeTypes.includes(file.mimetype)) {  //image file
      cb(null, 'public/thumbnails')
    } else {
      console.log("invalidFileType: ",file.mimetype);
      cb({ message: 'Mime type not supported' })
    }
  },
  filename: (req, file, cb) => {
    let extension = path.extname(file.originalname);
    let fileNameWithoutExt = path.basename(file.originalname, extension);
    cb(null, fileNameWithoutExt + '-' + Date.now() + extension);
  }
})
const upload = multer({ storage: storage }).any();

const updateProduct = async (productId, productBody) => {
  try {
    //check if product exists
    const data = await db.products.findOne({ _id: new ObjectId(productId) });
    if(!data) {
      return { error: { message: "Product does not exist" }};
    }

    await db.products.updateOne(
      { _id: new ObjectId(productId) },
      { $set: { ...productBody } }
    );
    return { success: { message: "Product updated successfully" }};
  } catch(err) {
    console.log(err);
    return { error: { message: "Operation failed" }};
  }
}

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
        
        //check if files were stored
        if(!req.files) { //this files are added by multer after storing
          return res.send({ error: { message: "Error in saving file" }});
        }
        req.files.forEach(file => {
          req.body[file.fieldname+'details'] = file;
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
      // Validate Request Body
      const { error } = await songBody.validate(req.body);
      if (error) return res.send({ error: { message: error.details[0].message }});

      let result = await updateProduct(req.params.id, req.body);
      res.send(result);
    } catch(err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" }});
    }
  },
  async deleteById(req, res) {
    try {
      //check if product exists
      const data = await db.products.findOne({ _id: new ObjectId(req.params.id) });
      if(!data) {
        return res.send({ error: { message: "Product does not exist" }});
      }

      await db.products.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send({ success: { message: "Product deleted successfully" }});
    } catch(err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" }});
    }
  },
  async removeCategoryForProducts(category_id) {
    try {
      const products = await db.products.find().toArray();
      console.log("check123");
      await Promise.all(products.map(async product => {
        let categories = product.category;
        if(categories) {
          product.category = categories.filter(id => (id !== category_id));
        }
        await updateProduct(product._id, product);
      }));
    } catch(err) {
      console.log(err);
      res.send({ error: { message: "Operation failed" }});
    }
  }

};

module.exports = service;
