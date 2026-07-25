const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60_000;

async function postalRequest(path) {
  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const response = await fetch(`https://api.postalpincode.in/${path}`, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Postal API returned ${response.status}`);
  const value = await response.json();
  cache.set(path, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  if (cache.size > 1000) cache.delete(cache.keys().next().value);
  return value;
}

exports.lookupPincode = async (req, res) => {
  const pincode = String(req.params.pincode || "").trim();
  if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ message: "Enter a valid 6-digit PIN code" });
  try {
    const payload = await postalRequest(`pincode/${pincode}`);
    const offices = payload?.[0]?.PostOffice || [];
    if (!offices.length) return res.status(404).json({ message: "No location found for this PIN code" });
    const requestedCity = String(req.query.city || "").trim().toLowerCase();
    const office = offices.find((item) => item.Name?.toLowerCase() === requestedCity) ||
      offices.find((item) => requestedCity && item.Name?.toLowerCase().startsWith(requestedCity)) || offices[0];
    res.json({ city: office.Name || "", taluka: office.Block || office.Division || "", district: office.District || "", state: office.State || "", pincode });
  } catch (error) {
    console.error("PIN code lookup error:", error);
    res.status(502).json({ message: "Location lookup is temporarily unavailable. Enter it manually." });
  }
};

exports.lookupCity = async (req, res) => {
  const city = String(req.params.city || "").trim();
  if (city.length < 2) return res.status(400).json({ message: "Enter a valid city" });
  try {
    const payload = await postalRequest(`postoffice/${encodeURIComponent(city)}`);
    const offices = payload?.[0]?.PostOffice || [];
    const office = offices.find((item) => item.Name?.toLowerCase() === city.toLowerCase()) || offices[0];
    if (!office) return res.status(404).json({ message: "No location found for this city" });
    res.json({ city: office.Name || city, taluka: office.Block || office.Division || "", district: office.District || "", state: office.State || "", pincode: office.Pincode || "" });
  } catch (error) {
    console.error("City lookup error:", error);
    res.status(502).json({ message: "City lookup is temporarily unavailable. Enter it manually." });
  }
};

exports.suggestCities = async (req, res) => {
  const query = String(req.params.query || "").trim();
  if (query.length < 3) return res.json({ locations: [] });
  try {
    const payload = await postalRequest(`postoffice/${encodeURIComponent(query)}`);
    const offices = payload?.[0]?.PostOffice || [];
    const seen = new Set();
    const locations = offices.filter((office) => {
      const key = `${office.Name}|${office.District}|${office.State}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 10).map((office) => ({
      name: office.Name || "",
      taluka: office.Block || office.Division || "",
      district: office.District || "",
      state: office.State || "",
      pincode: office.Pincode || "",
    }));
    res.json({ locations });
  } catch (error) {
    console.error("City suggestions error:", error);
    res.json({ locations: [] });
  }
};
