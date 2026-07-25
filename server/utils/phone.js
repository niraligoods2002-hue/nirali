function normalizeIndianPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const national = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(national)) return null;
  return `91${national}`;
}

module.exports = { normalizeIndianPhone };
