const express = require("express");
const router = express.Router();
const {
  addNewOrder,
  sendOrderEmail,
} = require("../controllers/order.controller");

router.post("/addNewOrder", addNewOrder);

module.exports = router;
