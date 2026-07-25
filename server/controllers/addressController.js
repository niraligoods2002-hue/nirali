const Address = require("../models/Address");
const { normalizeIndianPhone } = require("../utils/phone");

function shape(address) {
  return {
    id: address._id,
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    taluka: address.taluka,
    district: address.district,
    state: address.state,
    pincode: address.pincode,
    addressType: address.addressType,
    isDefault: address.isDefault,
    lastUsedAt: address.lastUsedAt,
  };
}

function clean(body, user, fallbackPhone = "") {
  const values = {
    fullName: String(body.fullName || body.name || "").trim(),
    phone: normalizeIndianPhone(body.phone || user.phone || fallbackPhone),
    addressLine1: String(body.addressLine1 || body.houseNumber || "").trim(),
    addressLine2: String(body.addressLine2 || body.address || "").trim(),
    city: String(body.city || "").trim(),
    taluka: String(body.taluka || "-").trim() || "-",
    district: String(body.district || "").trim(),
    state: String(body.state || "").trim(),
    pincode: String(body.pincode || "").trim(),
    addressType: ["Home", "Work", "Other"].includes(body.addressType) ? body.addressType : "Home",
  };
  const required = ["fullName", "phone", "addressLine1", "addressLine2", "city", "district", "state", "pincode"];
  const missing = required.find((field) => !values[field]);
  if (missing) return { error: `${missing} is required` };
  if (!/^\d{6}$/.test(values.pincode)) return { error: "Enter a valid 6-digit PIN code" };
  return { values };
}

async function clearDefault(userId, exceptId) {
  await Address.updateMany({ user: userId, isDefault: true, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }, { $set: { isDefault: false } });
}

async function migrateLegacy(user) {
  if (await Address.exists({ user: user._id })) return;
  const old = user.savedCheckoutAddress?.toObject?.() || user.savedCheckoutAddress;
  if (!old?.address || !old?.pincode) return;
  const parsed = clean(old, user);
  if (!parsed.error) await Address.create({ user: user._id, ...parsed.values, isDefault: true });
}

exports.listAddresses = async (req, res) => {
  try {
    await migrateLegacy(req.user);
    const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, lastUsedAt: -1, createdAt: -1 });
    res.json({ addresses: addresses.map(shape) });
  } catch (error) {
    console.error("List addresses error:", error);
    res.status(500).json({ message: "Could not load saved addresses" });
  }
};

exports.createAddress = async (req, res) => {
  try {
    const existingAddress = await Address.findOne({ user: req.user._id }).sort({ isDefault: -1, createdAt: 1 });
    const parsed = clean(req.body, req.user, existingAddress?.phone);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const isDefault = !existingAddress || req.body.isDefault === true;
    if (isDefault) await clearDefault(req.user._id);
    const address = await Address.create({ user: req.user._id, ...parsed.values, isDefault });
    res.status(201).json({ address: shape(address) });
  } catch (error) {
    console.error("Create address error:", error);
    res.status(error.name === "ValidationError" ? 400 : 500).json({ message: "Could not save address" });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) return res.status(404).json({ message: "Address not found" });
    const parsed = clean(req.body, req.user, address.phone);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    Object.assign(address, parsed.values);
    if (req.body.isDefault === true) {
      await clearDefault(req.user._id, address._id);
      address.isDefault = true;
    }
    await address.save();
    res.json({ address: shape(address) });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(error.name === "ValidationError" ? 400 : 500).json({ message: "Could not update address" });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!address) return res.status(404).json({ message: "Address not found" });
    if (address.isDefault) {
      const replacement = await Address.findOne({ user: req.user._id }).sort({ lastUsedAt: -1, createdAt: -1 });
      if (replacement) { replacement.isDefault = true; await replacement.save(); }
    }
    res.json({ message: "Address deleted" });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ message: "Could not delete address" });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) return res.status(404).json({ message: "Address not found" });
    await clearDefault(req.user._id, address._id);
    address.isDefault = true;
    await address.save();
    res.json({ address: shape(address) });
  } catch (error) {
    console.error("Set default address error:", error);
    res.status(500).json({ message: "Could not set default address" });
  }
};
