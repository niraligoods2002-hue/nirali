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

function defaultsFromEnvironment() {
  const images = String(process.env.HOME_ADVERTISEMENT_IMAGES || "")
    .split(",").map((image) => image.trim()).filter((image) => validUrl(image, { image: true })).slice(0, 5);
  return {
    slides: images.map((image, index) => ({
      name: `NIRALI campaign advertisement ${index + 1}`,
      eyebrow: "THE NIRALI FESTIVE EDIT",
      title: "Celebrate in Heirloom Style",
      description: "Discover handcrafted sarees made for the moments you will remember.",
      image,
      linkLabel: "Explore the Collection",
      linkUrl: "/shop",
      note: "Handpicked styles · Pan-India delivery",
    })),
    offers: DEFAULT_OFFERS,
  };
}

router.get("/", async (_req, res, next) => {
  try {
    const settings = await HomepageSettings.findOne({ key: "homepage" }).lean();
    res.json(settings ? { slides: settings.slides || [], offers: settings.offers?.length ? settings.offers : DEFAULT_OFFERS } : defaultsFromEnvironment());
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
      if (!slide.title || !validUrl(slide.image, { image: true }) || !validUrl(slide.linkUrl)) {
        return res.status(400).json({ message: "Each hero slide needs a title, a valid image URL, and a valid link (site path or HTTPS URL)." });
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
