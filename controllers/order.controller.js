const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { client } = require("../config/db");
const nodemailer = require("nodemailer");

const sendOrderEmail = async (userDetails, orderItems, totalPrice) => {
  console.log("Total Price:", totalPrice);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "alinaqishah5336@gmail.com", // Replace with your email
      pass: "eaid jeik lfxa vxmy", // Replace with your App Password (not email password)
    },
  });

  const orderRows = orderItems
    .map(
      (item) =>
        `<tr><td>${item.productname || "Unknown Suit"}</td><td>${
          item.quantity
        }</td></tr>`
    )
    .join("");

  const html = `
    <p>Respected Naqi Shah,</p>
    <p>Here is your new order. Go and confirm the order through the given below phone numbers:</p>
    <p><strong>Phone number 1:</strong> ${userDetails.phonenumber1}</p>
    <p><strong>Phone number 2:</strong> ${userDetails.phonenumber2 || "N/A"}</p>
    <h3>Order Details:</h3>
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>Suit Name</th>
          <th>Quantity</th>
        </tr>
      </thead>
      <tbody>
        ${orderRows}
      </tbody>
    </table>
    <p><strong>Price:</strong> Rs.${totalPrice}</p>
    <p><strong>Address:</strong> ${userDetails.address}</p>
  `;

  const mailOptions = {
    from: "alinaqishah5336@gmail.com",
    to: "alinaqishah5336@gmail.com", // Replace with actual recipient
    subject: "🛍️ New Order Received",
    html,
  };

  await transporter.sendMail(mailOptions);
};

const addNewOrder = asyncHandler(async (req, res) => {
  const { userDetails, orderItems } = req.body;
  if (
    !userDetails?.fullname ||
    !userDetails?.phonenumber1 ||
    !userDetails?.address ||
    !Array.isArray(orderItems) ||
    orderItems.length === 0
  ) {
    return res
      .status(400)
      .json(new ApiError(400, "User details and order items are required"));
  }

  await client.query("BEGIN");

  try {
    const userQuery = `
        INSERT INTO users (fullname, phonenumber1, address, phonenumber2)
        VALUES ($1, $2, $3, $4)
        RETURNING userid AS id;
      `;
    const userValues = [
      userDetails.fullname,
      userDetails.phonenumber1,
      userDetails.address,
      userDetails.phonenumber2 || null,
    ];
    const userResult = await client.query(userQuery, userValues);
    const userId = userResult.rows[0].id;

    const orderQuery = `
        INSERT INTO addtocart (userid, productid, quantity, totalprice)
        VALUES ($1, $2, $3, $4);
      `;

    let totalPrice = 0;

    for (const item of orderItems) {
      if (!item.productid || !item.quantity || !item.totalprice) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json(new ApiError(400, "Invalid order item detected"));
      }

      totalPrice = item.totalprice;

      console.log("TotalPrice:", totalPrice);

      const orderValues = [
        userId,
        item.productid,
        item.quantity,
        item.totalprice,
      ];
      await client.query(orderQuery, orderValues);
    }

    await client.query("COMMIT");

    // Call the email function with dynamic data
    await sendOrderEmail(userDetails, orderItems, totalPrice);

    return res
      .status(201)
      .json(new ApiResponse(201, "Order created successfully"));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error during order insert:", err);
    return res.status(500).json(new ApiError(500, "Failed to create order"));
  }
});

module.exports = { addNewOrder };
