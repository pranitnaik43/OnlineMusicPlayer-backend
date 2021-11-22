const router = require("express").Router();

const authService = require("../services/auth.services");
const service = require("../services/playlists.services");

router.get("/", service.findAll);
router.get("/public", service.findPublicPlaylists);
router.get("/:id", service.findById);

router.post("/", service.insert);
router.put("/:id", service.updateById);
router.delete("/:id", service.deleteById);

module.exports = router;
