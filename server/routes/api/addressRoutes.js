const router = require("express").Router();
const { protect } = require("../../middleware/authMiddleware");
const { listAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } = require("../../controllers/addressController");

router.use(protect);
router.get("/", listAddresses);
router.post("/", createAddress);
router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);
router.patch("/default/:id", setDefaultAddress);

module.exports = router;
