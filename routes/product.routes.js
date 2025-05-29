const express = require("express");
const productController = require("../controllers/product.controllers");
const router = express.Router();
const upload = require("../middlewares/cloudinary");
router.post(
  "/addProduct",
  upload.array("images", 8), // images[] in form-data
  productController.addProduct
);
router.get("/getProducts", productController.getProducts);

router.get("/getProductById/:productid", productController.getProductById); // Get product by ID
module.exports = router;
