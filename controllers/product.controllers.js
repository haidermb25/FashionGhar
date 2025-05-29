const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { client } = require("../config/db");

// Transactional insert of product + images
const addProduct = asyncHandler(async (req, res) => {
  console.log("I am in addProductWithImages function");

  const { productname, description, price, stock, categoryid } = req.body;

  // Validate inputs
  if (!productname || productname.trim() === "") {
    return res.status(400).json(new ApiError(400, "Product name is required"));
  }
  if (!price) {
    return res.status(400).json(new ApiError(400, "Price is required"));
  }
  if (!categoryid) {
    return res.status(400).json(new ApiError(400, "Category ID is required"));
  }

  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json(new ApiError(400, "At least one image must be uploaded"));
  }

  // Begin transaction
  await client.query("BEGIN");

  try {
    // Check category
    const categoryCheckQuery =
      "SELECT categoryid FROM category WHERE categoryid = $1";
    const categoryExists = await client.query(categoryCheckQuery, [categoryid]);

    if (categoryExists.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json(new ApiError(404, "Category not found"));
    }

    // Insert product
    const insertProductQuery = `
      INSERT INTO product (productname, description, price, stock, categoryid)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`;

    const newProduct = await client.query(insertProductQuery, [
      productname.trim(),
      description?.trim() || null,
      price,
      stock || 0,
      categoryid,
    ]);

    const productId = newProduct.rows[0].productid;

    // Upload image paths
    const imagePaths = req.files.map((file) => file.path);

    // Insert images
    const insertImageQuery = `
      INSERT INTO image (productid, imageurl)
      VALUES ($1, $2)
      RETURNING *`;

    const imageInsertions = await Promise.all(
      imagePaths.map((url) => client.query(insertImageQuery, [productId, url]))
    );

    const insertedImages = imageInsertions.map((result) => result.rows[0]);

    // All done — commit
    await client.query("COMMIT");

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          product: newProduct.rows[0],
          images: insertedImages,
        },
        "Product and images added successfully"
      )
    );
  } catch (err) {
    // Something failed — rollback everything
    await client.query("ROLLBACK");
    console.error("Error during product/image insert:", err);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to add product with images"));
  }
});

const getProducts = asyncHandler(async (req, res) => {
  console.log("I am in getProducts function");

  const { category } = req.query; // category = 'all' or actual category name
  console.log(category);
  try {
    let query = `
      SELECT DISTINCT ON (p.productid)
        p.productid,
        p.productname, 
        p.price, 
        c.categoryname, 
        i.imageurl
      FROM product p
      JOIN category c ON p.categoryid = c.categoryid
      LEFT JOIN image i ON p.productid = i.productid
    `;

    const queryParams = [];

    if (category && category.toLowerCase() !== "all") {
      query += ` WHERE c.categoryname = $1`;
      queryParams.push(category);
    }

    query += ` ORDER BY p.productid, i.imageid`; // Shared ORDER BY clause

    const result = await client.query(query, queryParams);

    return res
      .status(200)
      .json(
        new ApiResponse(200, result.rows, "Products retrieved successfully")
      );
  } catch (err) {
    console.error("Error during fetching products:", err);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to retrieve products"));
  }
});

const getProductById = asyncHandler(async (req, res) => {
  console.log("I am in getProductById function");
  console.log(req.params);

  const { productid } = req.params;

  if (!productid) {
    return res.status(400).json(new ApiError(400, "Product ID is required"));
  }

  try {
    // Fetch product details with images
    const productQuery = `
      SELECT 
        p.productid,
        p.productname,
        p.description,
        p.price,
        p.stock,
        c.categoryname,
        i.imageurl
      FROM product p
      JOIN category c ON p.categoryid = c.categoryid
      LEFT JOIN image i ON p.productid = i.productid
      WHERE p.productid = $1
    `;

    const productResult = await client.query(productQuery, [productid]);

    if (productResult.rows.length === 0) {
      return res.status(404).json(new ApiError(404, "Product not found"));
    }

    // Group images for the product
    const product = {
      productid: productResult.rows[0].productid,
      productname: productResult.rows[0].productname,
      description: productResult.rows[0].description,
      price: productResult.rows[0].price,
      stock: productResult.rows[0].stock,
      categoryname: productResult.rows[0].categoryname,
      images: productResult.rows.map((row) => row.imageurl).filter(Boolean),
    };

    return res
      .status(200)
      .json(
        new ApiResponse(200, product, "Product details retrieved successfully")
      );
  } catch (err) {
    console.error("Error during fetching product by ID:", err);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to retrieve product details"));
  }
});

module.exports = { addProduct, getProducts, getProductById };
