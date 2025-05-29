const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { errorMiddleware } = require("./middlewares/error");
const morgan = require("morgan");
const dotenv = require("dotenv");
const categoryRoute = require("./routes/category.routes");
const productRoute = require("./routes/product.routes");
const orderRoute = require("./routes/order.routes");
dotenv.config({ path: "./.env" });

const envMode = process.env.NODE_ENV?.trim() || "DEVELOPMENT";

const port = process.env.PORT || 3000;

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: envMode !== "DEVELOPMENT",
    crossOriginEmbedderPolicy: envMode !== "DEVELOPMENT",
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: " * ", credentials: true }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// your routes here
app.use("/category", categoryRoute);
app.use("/product", productRoute);
app.use("/order", orderRoute);

app.get("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Page not found",
  });
});

app.use(errorMiddleware);

app.listen(port, () =>
  console.log("Server is working on Port:" + port + " in " + envMode + " Mode.")
);

module.exports = { envMode };
