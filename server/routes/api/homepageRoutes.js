const router = require("express").Router();
const HomepageSettings = require("../../models/HomepageSettings");
const { protect, adminOnly } = require("../../middleware/authMiddleware");

const DEFAULT_OFFERS = [
  "Complimentary shipping on orders above ₹2,999",
  "Explore new arrivals from our atelier",
  "Handcrafted heritage weaves, chosen for you",
  "Enjoy our 5-day return and exchange promise",
];

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validUrl(value, { image = false } = {}) {
  const url = cleanText(value, 2048);
  if (!url) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try { return new URL(url).protocol === "https:"; } catch { return false; }
}

router.get("/", async (_req, res, next) => {
  try {
    const settings = await HomepageSettings.findOne({ key: "homepage" }).lean();
    res.json(settings ? { slides: settings.slides || [], offers: settings.offers?.length ? settings.offers : DEFAULT_OFFERS } : { slides: [], offers: DEFAULT_OFFERS });
  } catch (error) { next(error); }
});

router.put("/", protect, adminOnly, async (req, res, next) => {
  try {
    const rawSlides = Array.isArray(req.body.slides) ? req.body.slides : [];
    const rawOffers = Array.isArray(req.body.offers) ? req.body.offers : [];
    if (rawSlides.length > 5) return res.status(400).json({ message: "You can publish up to 5 hero slides." });
    if (rawOffers.length > 10) return res.status(400).json({ message: "You can publish up to 10 offer messages." });

    const slides = rawSlides.filter((slide) => slide && typeof slide === "object").map((slide) => ({
      name: cleanText(slide.name, 100),
      eyebrow: cleanText(slide.eyebrow, 60),
      title: cleanText(slide.title, 120),
      description: cleanText(slide.description, 240),
      image: cleanText(slide.image, 2048),
      linkLabel: cleanText(slide.linkLabel, 50),
      linkUrl: cleanText(slide.linkUrl, 300),
      note: cleanText(slide.note, 100),
    }));
    for (const slide of slides) {
      if (!validUrl(slide.image, { image: true }) || !validUrl(slide.linkUrl)) {
        return res.status(400).json({ message: "Each hero slide needs a valid image URL and a destination (site path or HTTPS URL)." });
      }
    }
    const offers = rawOffers.map((offer) => cleanText(offer, 120)).filter(Boolean);
    if (!offers.length) return res.status(400).json({ message: "Add at least one scrolling offer." });

    const settings = await HomepageSettings.findOneAndUpdate(
      { key: "homepage" }, { $set: { slides, offers }, $setOnInsert: { key: "homepage" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ message: "Homepage promotions saved.", slides: settings.slides, offers: settings.offers });
  } catch (error) { next(error); }
});

module.exports = router;
