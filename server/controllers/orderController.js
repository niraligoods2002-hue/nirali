const Order = require("../models/Order");
const Product = require("../models/Product");
const Address = require("../models/Address");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { normalizeIndianPhone } = require("../utils/phone");
const PDFDocument = require("pdfkit");
const path = require("path");

async function restoreProductInventory(item) {
  const product = await Product.findById(item.product).select("colorStock");
  if (!product) return;
  const increments = { stock: item.quantity };
  if (item.color && product.colorStock?.has(item.color)) {
    increments[`colorStock.${item.color}`] = item.quantity;
  }
  await Product.updateOne({ _id: item.product }, { $inc: increments });
}

function shapeOrder(order) {
  return {
    id: order._id,
    customer: order.customer,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    razorpayPaymentId: order.razorpayPaymentId,
    status: order.status,
    createdAt: order.createdAt,
    user: order.user,
  };
}

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!keyId.startsWith("rzp_test_") || !keySecret) {
    const error = new Error("Razorpay test mode is not configured");
    error.status = 503;
    throw error;
  }
  return { keyId, keySecret };
}

async function razorpayRequest(endpoint, { method = "GET", body } = {}) {
  const { keyId, keySecret } = getRazorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.description || "Razorpay could not process the payment request");
    error.status = 502;
    throw error;
  }
  return data;
}

async function getCheckoutAmount(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    const error = new Error("Checkout must contain between 1 and 50 products");
    error.status = 400;
    throw error;
  }

  const quantities = new Map();
  for (const item of items) {
    const productId = String(item.id || item.product || "");
    const quantity = Number(item.quantity);
    if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      const error = new Error("Cart contains an invalid product or quantity");
      error.status = 400;
      throw error;
    }
    const color = String(item.color || "").trim();
    const key = `${productId}:${color}`;
    quantities.set(key, { productId, color, quantity: (quantities.get(key)?.quantity || 0) + quantity });
    if (quantities.get(key).quantity > 10) {
      const error = new Error("Maximum quantity is 10 per color");
      error.status = 400;
      throw error;
    }
  }

  const productIds = [...new Set([...quantities.values()].map((variant) => variant.productId))];
  const products = await Product.find({ _id: { $in: productIds }, stock: { $gt: 0 }, published: { $ne: false } });
  if (products.length !== productIds.length) {
    const error = new Error("One or more selected products are unavailable");
    error.status = 409;
    throw error;
  }

  let subtotal = 0;
  for (const variant of quantities.values()) {
    const product = products.find((candidate) => String(candidate._id) === variant.productId);
    if (product.colors?.length && !product.colors.includes(variant.color)) {
      const error = new Error(`Select a valid color for ${product.name}`);
      error.status = 400;
      throw error;
    }
    if (product.colorStock?.has(variant.color) && product.colorStock.get(variant.color) < variant.quantity) {
      const error = new Error(`${variant.color} is out of stock for ${product.name}`);
      error.status = 409;
      throw error;
    }
    subtotal += (product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price) * variant.quantity;
  }

  const FREE_SHIPPING_THRESHOLD = Number(process.env.FREE_SHIPPING_THRESHOLD || 2999);
  const configuredShipping = Number(process.env.SHIPPING_FEE || 100);
  const shipping = (subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD)
    ? (Number.isFinite(configuredShipping) ? Math.max(0, configuredShipping) : 100)
    : 0;
  return Math.round((subtotal + shipping) * 100);
}

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { addressId, items, idempotencyKey } = req.body;
    if (!mongoose.isValidObjectId(addressId)) return res.status(400).json({ message: "Select a valid delivery address" });
    const address = await Address.findOne({ _id: addressId, user: req.user._id });
    if (!address) return res.status(404).json({ message: "Selected delivery address was not found" });
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(String(idempotencyKey || ""))) {
      return res.status(400).json({ message: "A valid idempotency key is required" });
    }

    const amount = await getCheckoutAmount(items);
    const receipt = crypto.createHash("sha256").update(`${req.user._id}:${idempotencyKey}`).digest("hex").slice(0, 40);
    const order = await razorpayRequest("/orders", {
      method: "POST",
      body: {
        amount,
        currency: "INR",
        receipt,
        notes: { user_id: String(req.user._id), idempotency_key: idempotencyKey },
      },
    });
    res.status(201).json({ keyId: getRazorpayConfig().keyId, orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    res.status(error.status || 502).json({ message: error.status ? error.message : "Could not start Razorpay checkout" });
  }
};

exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { addressId, items, idempotencyKey, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (!orderId || !paymentId || !signature || !/^[A-Za-z0-9_-]{16,100}$/.test(String(idempotencyKey || ""))) {
      return res.status(400).json({ message: "Payment verification details are incomplete" });
    }

    const providerOrder = await razorpayRequest(`/orders/${encodeURIComponent(orderId)}`);
    if (providerOrder.notes?.user_id !== String(req.user._id) || providerOrder.notes?.idempotency_key !== idempotencyKey) {
      return res.status(400).json({ message: "This payment does not match your checkout" });
    }
    const expectedAmount = await getCheckoutAmount(items);
    if (providerOrder.currency !== "INR" || providerOrder.amount !== expectedAmount) {
      return res.status(400).json({ message: "The payment amount does not match this order" });
    }

    const { keySecret } = getRazorpayConfig();
    const expectedSignature = crypto.createHmac("sha256", keySecret).update(`${providerOrder.id}|${paymentId}`).digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const suppliedBuffer = Buffer.from(String(signature), "hex");
    if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      return res.status(400).json({ message: "Razorpay payment signature could not be verified" });
    }

    let payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
    if (payment.order_id !== providerOrder.id) return res.status(400).json({ message: "Payment is linked to a different Razorpay order" });
    if (payment.status === "authorized") {
      payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/capture`, {
        method: "POST",
        body: { amount: expectedAmount, currency: "INR" },
      });
    }
    if (payment.status !== "captured") return res.status(400).json({ message: "Razorpay has not captured this payment yet" });

    const originalBody = req.body;
    req.body = { ...req.body, paymentMethod: "razorpay" };
    req.razorpayVerified = true;
    req.razorpayPaymentId = paymentId;
    const orderResponse = {
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await exports.createOrder(req, orderResponse);
    req.body = originalBody;
    if (orderResponse.statusCode < 200 || orderResponse.statusCode >= 300) {
      try {
        await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/refund`, {
          method: "POST",
          body: { amount: expectedAmount },
        });
        return res.status(orderResponse.statusCode).json({ message: `${orderResponse.body?.message || "Order could not be created"}. The test payment has been refunded.` });
      } catch {
        return res.status(502).json({ message: "Payment succeeded but the order could not be created or refunded automatically. Contact support with your Razorpay payment ID." });
      }
    }
    return res.status(orderResponse.statusCode).json(orderResponse.body);
  } catch (error) {
    res.status(error.status || 502).json({ message: error.status ? error.message : "Could not verify Razorpay payment" });
  }
};

exports.createOrder = async (req, res) => {
  const reserved = [];
  try {
    const { customer, addressId, items, paymentMethod = "cod" } = req.body;
    const idempotencyKey = String(req.get("Idempotency-Key") || req.body.idempotencyKey || "").trim();

    if ((!customer && !addressId) || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Customer details and cart items are required" });
    }
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) {
      return res.status(400).json({ message: "A valid idempotency key is required" });
    }
    if (items.length > 50) return res.status(400).json({ message: "Too many cart items" });
    if (paymentMethod !== "cod" && !(paymentMethod === "razorpay" && req.razorpayVerified === true && req.razorpayPaymentId)) {
      return res.status(400).json({ message: "Select a supported payment method" });
    }

    const existingOrder = await Order.findOne({ user: req.user._id, idempotencyKey });
    if (existingOrder) return res.status(200).json({ message: "Order already placed", duplicate: true, order: shapeOrder(existingOrder) });

    let selectedAddress = null;
    let checkoutCustomer = customer;
    if (addressId) {
      if (!mongoose.isValidObjectId(addressId)) return res.status(400).json({ message: "Select a valid delivery address" });
      selectedAddress = await Address.findOne({ _id: addressId, user: req.user._id });
      if (!selectedAddress) return res.status(404).json({ message: "Selected delivery address was not found" });
      checkoutCustomer = {
        name: selectedAddress.fullName,
        email: req.user.email,
        phone: selectedAddress.phone,
        houseNumber: selectedAddress.addressLine1,
        address: selectedAddress.addressLine2,
        city: selectedAddress.city,
        taluka: selectedAddress.taluka,
        district: selectedAddress.district,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
      };
    }

    const requiredCustomerFields = ["name", "email", "phone", "houseNumber", "address", "city", "taluka", "district", "state", "pincode"];
    const missingField = requiredCustomerFields.find((field) => !checkoutCustomer?.[field]);
    if (missingField) {
      return res.status(400).json({ message: `${missingField} is required` });
    }
    if (!/^\d{6}$/.test(String(checkoutCustomer.pincode))) return res.status(400).json({ message: "Enter a valid 6-digit PIN code" });

    const phone = normalizeIndianPhone(checkoutCustomer.phone);
    if (!phone) return res.status(400).json({ message: "Enter a valid Indian mobile number" });

    const requested = new Map();
    const requestedVariants = new Map();
    for (const item of items) {
      const productId = String(item.id || item.product || "");
      const quantity = Number(item.quantity);
      if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return res.status(400).json({ message: "Cart contains an invalid product or quantity" });
      }
      requested.set(productId, (requested.get(productId) || 0) + quantity);
      const color = String(item.color || "").trim();
      const variantKey = `${productId}:${color}`;
      const existingVariant = requestedVariants.get(variantKey);
      requestedVariants.set(variantKey, {
        productId,
        color,
        quantity: (existingVariant?.quantity || 0) + quantity,
      });
      if (requestedVariants.get(variantKey).quantity > 10) {
        return res.status(400).json({ message: "Maximum quantity is 10 per color" });
      }
    }

    const products = await Product.find({ _id: { $in: [...requested.keys()] }, published: { $ne: false } });
    if (products.length !== requested.size) return res.status(400).json({ message: "One or more products no longer exist" });

    const cleanItems = [];
    for (const product of products) {
      const quantity = requested.get(String(product._id));
      const productVariants = [...requestedVariants.values()].filter((variant) => variant.productId === String(product._id));
      for (const variant of productVariants) {
        if (product.colors?.length && !product.colors.includes(variant.color)) {
          const error = new Error(`Select a valid color for ${product.name}`);
          error.status = 400;
          throw error;
        }
      }

      if (product.colorStock?.size) {
        for (const variant of productVariants) {
          const colorStockPath = `colorStock.${variant.color}`;
          const reservedProduct = await Product.findOneAndUpdate(
            { _id: product._id, stock: { $gte: variant.quantity }, published: { $ne: false }, [colorStockPath]: { $gte: variant.quantity } },
            { $inc: { stock: -variant.quantity, [colorStockPath]: -variant.quantity } },
            { returnDocument: "after" }
          );
          if (!reservedProduct) {
            const error = new Error(`${variant.color} is out of stock for ${product.name}`);
            error.status = 409;
            throw error;
          }
          reserved.push({ product: product._id, quantity: variant.quantity, color: variant.color });
        }
      } else {
        const reservedProduct = await Product.findOneAndUpdate(
          { _id: product._id, stock: { $gte: quantity }, published: { $ne: false } },
          { $inc: { stock: -quantity } },
          { returnDocument: "after" }
        );
        if (!reservedProduct) {
          const error = new Error(`${product.name} does not have enough stock`);
          error.status = 409;
          throw error;
        }
        reserved.push({ product: product._id, quantity });
      }

      for (const variant of productVariants) {
        cleanItems.push({
          product: product._id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0] || "/images/products/saree1.jpg",
          category: product.category,
          color: variant.color,
          price: product.discountPrice && product.discountPrice < product.price
            ? product.discountPrice
            : product.price,
          quantity: variant.quantity,
        });
      }
    }

    const calculatedSubtotal = cleanItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const FREE_SHIPPING_THRESHOLD = Number(process.env.FREE_SHIPPING_THRESHOLD || 2999);
    const configuredShipping = Number(process.env.SHIPPING_FEE || 100);
    const calculatedShipping = (calculatedSubtotal > 0 && calculatedSubtotal < FREE_SHIPPING_THRESHOLD)
      ? (Number.isFinite(configuredShipping) ? Math.max(0, configuredShipping) : 100)
      : 0;
    const calculatedTotal = calculatedSubtotal + calculatedShipping;

    const order = await Order.create({
      user: req.user._id,
      idempotencyKey,
      customer: {
        name: String(checkoutCustomer.name).trim().slice(0, 80),
        email: req.user.email,
        phone,
        houseNumber: String(checkoutCustomer.houseNumber).trim().slice(0, 100),
        address: String(checkoutCustomer.address).trim().slice(0, 500),
        city: String(checkoutCustomer.city).trim().slice(0, 100),
        taluka: String(checkoutCustomer.taluka).trim().slice(0, 100),
        district: String(checkoutCustomer.district).trim().slice(0, 100),
        state: String(checkoutCustomer.state).trim().slice(0, 100),
        pincode: String(checkoutCustomer.pincode).trim(),
      },
      items: cleanItems,
      subtotal: calculatedSubtotal,
      shipping: calculatedShipping,
      total: calculatedTotal,
      paymentMethod,
      paymentStatus: paymentMethod === "razorpay" ? "paid" : "pending",
      ...(paymentMethod === "razorpay" ? { razorpayPaymentId: req.razorpayPaymentId } : {}),
      status: "pending",
      auditLog: [{ actor: req.user._id, action: "order_created", to: { status: "pending" } }],
    });

    const savedCheckoutAddress = {
      name: checkoutCustomer.name,
      email: checkoutCustomer.email,
      phone,
      houseNumber: checkoutCustomer.houseNumber,
      address: checkoutCustomer.address,
      city: checkoutCustomer.city,
      taluka: checkoutCustomer.taluka,
      district: checkoutCustomer.district,
      state: checkoutCustomer.state,
      pincode: checkoutCustomer.pincode,
    };
    try {
      await req.user.constructor.updateOne(
        { _id: req.user._id },
        { $set: { savedCheckoutAddress } }
      );
    } catch (saveError) {
      console.error("Could not save checkout address:", saveError);
    }
    if (selectedAddress) {
      selectedAddress.lastUsedAt = new Date();
      await selectedAddress.save().catch((saveError) => console.error("Could not mark address as used:", saveError));
    }

    res.status(201).json({
      message: "Order placed successfully",
      order: shapeOrder(order),
    });
  } catch (error) {
    if (reserved.length) {
      await Promise.allSettled(reserved.map(restoreProductInventory));
    }
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      const order = await Order.findOne({ user: req.user._id, idempotencyKey: req.get("Idempotency-Key") || req.body.idempotencyKey });
      if (order) return res.status(200).json({ message: "Order already placed", duplicate: true, order: shapeOrder(order) });
    }
    console.error("Create order error:", error);
    res.status(error.status || (error.name === "ValidationError" ? 400 : 500)).json({ message: error.status ? error.message : "Server error creating order" });
  }
};

exports.getCheckoutDetails = async (req, res) => {
  const saved = req.user.savedCheckoutAddress?.toObject?.() || req.user.savedCheckoutAddress || {};
  res.json({
    hasSavedAddress: Boolean(saved.address && saved.pincode),
    customer: {
      name: saved.name || req.user.name || "",
      email: saved.email || req.user.email || "",
      phone: saved.phone || req.user.phone || "",
      houseNumber: saved.houseNumber || "",
      address: saved.address || "",
      city: saved.city || "",
      taluka: saved.taluka || "",
      district: saved.district || "",
      state: saved.state || "Gujarat",
      pincode: saved.pincode || "",
    },
  });
};

exports.updateCheckoutDetails = async (req, res) => {
  try {
    const fields = ["name", "phone", "houseNumber", "address", "city", "taluka", "district", "state", "pincode"];
    const missing = fields.find((field) => !String(req.body[field] || "").trim());
    if (missing) return res.status(400).json({ message: `${missing} is required` });
    if (!/^\d{6}$/.test(String(req.body.pincode))) return res.status(400).json({ message: "Enter a valid 6-digit PIN code" });

    const phone = normalizeIndianPhone(req.body.phone);
    if (!phone) return res.status(400).json({ message: "Enter a valid Indian mobile number" });
    const savedCheckoutAddress = {
      name: String(req.body.name).trim(),
      email: req.user.email,
      phone,
      houseNumber: String(req.body.houseNumber).trim(),
      address: String(req.body.address).trim(),
      city: String(req.body.city).trim(),
      taluka: String(req.body.taluka).trim(),
      district: String(req.body.district).trim(),
      state: String(req.body.state).trim(),
      pincode: String(req.body.pincode).trim(),
    };
    req.user.name = savedCheckoutAddress.name;
    req.user.phone = phone;
    req.user.savedCheckoutAddress = savedCheckoutAddress;
    await req.user.save();
    res.json({ message: "Profile and delivery address updated", customer: savedCheckoutAddress });
  } catch (error) {
    console.error("Update checkout details error:", error);
    res.status(500).json({ message: "Could not update profile" });
  }
};

exports.downloadDeliveryLabel = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const customer = order.customer;
    const shortId = String(order._id).slice(-6).toUpperCase();
    const doc = new PDFDocument({ size: [288, 432], margin: 14, info: { Title: `Delivery Label ${shortId}` } });
    doc.registerFont("Gujarati", path.join(__dirname, "../assets/fonts/NotoSansGujarati.ttf"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="delivery-label-${shortId}.pdf"`);
    doc.pipe(res);

    doc.rect(3, 3, 282, 426).lineWidth(2).stroke("#111111");
    doc.font("Gujarati").fillColor("#000000");
    doc.fontSize(25).text("લેનાર", 14, 16, { width: 260, align: "center" });
    doc.fontSize(7).text(`ORDER #${shortId}  |  COD ₹${order.total}`, 14, 51, { width: 260, align: "right" });

    let y = 70;
    const row = (label, value, options = {}) => {
      doc.fontSize(11).text(`${label}:`, 15, y, { width: 72 });
      doc.fontSize(options.size || 10.5).text(String(value || "-"), 88, y, { width: 180, height: options.height || 28 });
      y += options.step || 31;
      doc.moveTo(14, y - 7).lineTo(274, y - 7).lineWidth(0.6).stroke("#555555");
    };

    row("નામ", customer.name);
    row("મોબાઇલ નંબર", customer.phone);
    row("ઘર નંબર", customer.houseNumber);
    row("સરનામું", customer.address, { height: 48, step: 50, size: 9.5 });

    doc.fontSize(11).text("ગામ/શહેર:", 15, y, { width: 70 });
    doc.fontSize(10).text(customer.city || "-", 82, y, { width: 60 });
    doc.fontSize(11).text("તાલુકો:", 148, y, { width: 48 });
    doc.fontSize(10).text(customer.taluka || "-", 198, y, { width: 72 });
    y += 31;
    doc.moveTo(14, y - 7).lineTo(274, y - 7).lineWidth(0.6).stroke("#555555");

    doc.fontSize(11).text("જિલ્લો:", 15, y, { width: 52 });
    doc.fontSize(10).text(customer.district || "-", 65, y, { width: 78 });
    doc.fontSize(11).text("રાજ્ય:", 148, y, { width: 43 });
    doc.fontSize(10).text(customer.state || "-", 193, y, { width: 77 });
    y += 31;
    doc.moveTo(14, y - 7).lineTo(274, y - 7).lineWidth(0.6).stroke("#555555");
    row("પિનકોડ", customer.pincode, { step: 30 });

    doc.fontSize(17).text("મોકલનાર", 14, 342, { width: 260, align: "center" });
    doc.fontSize(12).text("નિરાલી સાડી સેન્ટર પાદરા", 14, 372, { width: 260, align: "center" });
    doc.fontSize(11).text("મોબાઇલ નંબર: 7623857001", 14, 397, { width: 260, align: "center" });
    doc.end();
  } catch (error) {
    console.error("Delivery label PDF error:", error);
    if (!res.headersSent) res.status(500).json({ message: "Could not generate delivery label" });
    else res.end();
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders: orders.map(shapeOrder) });
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(500).json({ message: "Server error fetching orders" });
  }
};

exports.getAllOrders = async (_req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json({ orders: orders.map(shapeOrder) });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ message: "Server error fetching orders" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus, reason } = req.body;
    const allowedStatuses = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];
    const allowedPaymentStatuses = ["pending", "paid", "failed", "refunded"];
    const statusTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["packed", "cancelled"],
      packed: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };
    const update = {};

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid order status" });
      }
      update.status = status;
    }

    if (paymentStatus) {
      if (!allowedPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }
      update.paymentStatus = paymentStatus;
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status && status !== order.status && !statusTransitions[order.status].includes(status)) {
      return res.status(409).json({ message: `Cannot change an order from ${order.status} to ${status}` });
    }
    if (paymentStatus === "refunded" && order.paymentStatus !== "paid") {
      return res.status(409).json({ message: "Only a paid order can be refunded" });
    }

    const from = { status: order.status, paymentStatus: order.paymentStatus };
    if (status === "cancelled" && order.status !== "cancelled" && !order.inventoryRestored) {
      const claim = await Order.updateOne({ _id: order._id, inventoryRestored: false }, { $set: { inventoryRestored: true } });
      if (claim.modifiedCount) {
        try {
          await Promise.all(order.items.map(restoreProductInventory));
          order.inventoryRestored = true;
        } catch (restoreError) {
          await Order.updateOne({ _id: order._id }, { $set: { inventoryRestored: false } });
          throw restoreError;
        }
      }
    }
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    order.auditLog.push({ actor: req.user._id, action: "admin_status_update", from, to: { status: order.status, paymentStatus: order.paymentStatus }, reason: String(reason || "").slice(0, 300) });
    await order.save();

    res.json({ order: shapeOrder(order) });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Server error updating order" });
  }
};
