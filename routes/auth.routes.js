const router = require("express").Router();

const service = require("../services/auth.services");

router.post("/signup", (req, res) => service.signUp(req, res));
router.post("/signin", (req, res) => service.signIn(req, res));

module.exports = router;
