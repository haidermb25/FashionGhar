const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { client } = require("../config/db");

async function isCategoryAlreadyExists(value, column = "categoryname") {
  const validColumns = ["categoryname", "categoryid"];

  if (!validColumns.includes(column)) {
    throw new Error("Invalid column name provided");
  }

  const categoryExistsQuery = `SELECT * FROM category WHERE ${column} = $1`;
  const categoryExistsResult = await client.query(categoryExistsQuery, [value]);

  return categoryExistsResult.rows.length > 0; // Returns true if category exists, otherwise false
}

//Add Category
const addCategory = asyncHandler(async (req, res) => {
  try {
    console.log("I am in add Category function");
    const { categoryname } = req.body;

    if (!categoryname || categoryname.trim() === "") {
      return res.status(400).json(new ApiError(400, "All Fields are required"));
    }

    console.log("Checking if already exists...");
    if (await isCategoryAlreadyExists(categoryname, "categoryname")) {
      return res.status(409).json(new ApiError(409, "Category Already Exists"));
    }

    console.log("Inserting category...");
    const insertCategoryQuery =
      "INSERT INTO category (categoryname) VALUES ($1) RETURNING *";
    const newCategory = await client.query(insertCategoryQuery, [categoryname]);

    console.log("Insertion successful.");
    return res
      .status(201)
      .json(
        new ApiResponse(201, newCategory.rows[0], "Category added successfully")
      );
  } catch (err) {
    console.error("Error in addCategory:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

// Delete Category
const deleteCategory = asyncHandler(async (req, res) => {
  const categoryid = parseInt(req.params.categoryid, 10); // Convert ID to number
  console.log("I am in delete Category function", categoryid);

  // Validate categoryid
  if (isNaN(categoryid)) {
    return res.status(400).json(new ApiError(400, "Invalid Category ID"));
  }

  // Check if category exists
  if (!(await isCategoryAlreadyExists(categoryid, "categoryid"))) {
    return res.status(404).json(new ApiError(404, "Category not found"));
  }

  // Delete category
  const deleteCategoryQuery = "DELETE FROM category WHERE categoryid = $1";
  await client.query(deleteCategoryQuery, [categoryid]);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted successfully"));
});

//update Category
const updateCategory = asyncHandler(async (req, res) => {
  const { categoryid } = req.params; // Get category ID from params
  const { categoryname } = req.body; // Get new category name from body

  console.log("Updating category:", categoryid, categoryname);

  // Validate inputs
  if (!categoryid || isNaN(categoryid)) {
    return res.status(400).json(new ApiError(400, "Invalid Category ID"));
  }
  if (!categoryname || categoryname.trim() === "") {
    return res.status(400).json(new ApiError(400, "Category name is required"));
  }

  // Check if category exists
  if (!(await isCategoryAlreadyExists(categoryid, "categoryid"))) {
    return res.status(404).json(new ApiError(404, "Category not found"));
  }

  // Update category name
  const updateCategoryQuery =
    "UPDATE category SET categoryname = $1 WHERE categoryid = $2";
  await client.query(updateCategoryQuery, [categoryname, categoryid]);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Category updated successfully"));
});

//Get all categories
const getCategory = asyncHandler(async (req, res) => {
  console.log("Fetching all categories");

  // Fetch all categories from the database
  const getCategoryQuery = "SELECT * FROM category";
  const categories = await client.query(getCategoryQuery);

  return res
    .status(200)
    .json(
      new ApiResponse(200, categories.rows, "Categories fetched successfully")
    );
});

module.exports = {
  addCategory,
  deleteCategory,
  updateCategory,
  getCategory,
};
