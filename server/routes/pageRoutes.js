const express = require("express");
const Product = require("../models/Product");
const Review = require("../models/Review");
const HomepageSettings = require("../models/HomepageSettings");

const router = express.Router();

const reviews = [
  { name: "Priya Sharma", rating: 5, date: "1 month ago", text: "The saree arrived in the most exquisite keepsake box. The fabric feels like liquid silk and the craftsmanship exceeded every expectation. I received countless compliments at my sister’s wedding!" },
  { name: "Anjali Patel", rating: 5, date: "3 weeks ago", text: "NIRALI has become my sole destination for authentic handlooms. The chiffon drape is featherlight yet carries such a regal presence. Truly an heirloom piece." },
  { name: "Sneha Reddy", rating: 5, date: "2 months ago", text: "NIRALI has become my go-to store for traditional wear. Highly recommended!" },
];

function normalizeProduct(p) {
  const newArrival = Boolean(
    p.newArrival ||
    p.badge === "NEW" ||
    (p.createdAt && Date.now() - new Date(p.createdAt).getTime() < 1000 * 60 * 60 * 24 * 30)
  );

  return {
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    category: p.category,
    price: p.price,
    discountPrice: p.discountPrice,
    oldPrice: p.discountPrice || p.oldPrice,
    rating: p.rating || 5,
    reviews: p.reviews || 0,
    badge: p.bestseller ? "BEST SELLER" : newArrival ? "NEW" : p.featured ? "FEATURED" : "",
    image: p.images?.[0] || p.image,
    images: p.images || [p.image],
    description: p.description,
    colors: p.colors || [],
    colorImages: p.colorImages instanceof Map ? Object.fromEntries(p.colorImages) : (p.colorImages || {}),
    colorStock: p.colorStock instanceof Map ? Object.fromEntries(p.colorStock) : (p.colorStock || {}),
    sizes: p.sizes || ["Free Size"],
    stock: p.stock || 0,
    featured: p.featured,
    bestseller: p.bestseller,
    newArrival,
    details: p.details || {},
  };
}

function requireUserPage(req, res, next) {
  if (req.user) return next();
  return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
}

router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } }).limit(12);
    const homepageSettings = await HomepageSettings.findOne({ key: "homepage" }).lean();
    res.render("pages/home", {
      layout: "layouts/main",
      title: "NIRALI | Luxury Indian Sarees & Heritage Fashion",
      path: "/",
      user: req.user || null,
      pageStyle: "home",
      widgetScript: "featured-products",
      homeProducts: products.map(normalizeProduct),
      homeAdvertisementSlides: homepageSettings?.slides || [],
      homeOffers: homepageSettings?.offers?.length ? homepageSettings.offers : [
        "Complimentary shipping on orders above ₹2,999",
        "Explore new arrivals from our atelier",
        "Handcrafted heritage weaves, chosen for you",
        "Enjoy our 5-day return and exchange promise",
      ],
    });
  } catch (err) {
    res.render("pages/home", {
      layout: "layouts/main",
      title: "NIRALI | Luxury Indian Sarees & Heritage Fashion",
      path: "/",
      user: req.user || null,
      pageStyle: "home",
      widgetScript: "featured-products",
      homeProducts: [],
      homeAdvertisementSlides: [],
      homeOffers: ["Complimentary shipping on orders above ₹2,999", "Explore new arrivals from our atelier"],
    });
  }
});

router.get("/shop", async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } });
    res.render("pages/shop", {
      layout: "layouts/main",
      title: "Curated Sarees | NIRALI",
      path: "/shop",
      user: req.user || null,
      pageStyle: "shop",
      widgetScript: "product-shop",
      products: products.map(normalizeProduct),
      filter: req.query.filter || "",
      search: req.query.search || "",
    });
  } catch (err) {
    res.render("pages/shop", {
      layout: "layouts/main",
      title: "Curated Sarees | NIRALI",
      path: "/shop",
      user: req.user || null,
      pageStyle: "shop",
      widgetScript: "product-shop",
      products: [],
      filter: "",
      search: "",
    });
  }
});

router.get("/best-sellers", async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } });
    res.render("pages/shop", {
      layout: "layouts/main",
      title: "Best Sellers | NIRALI Luxury Sarees",
      path: "/best-sellers",
      user: req.user || null,
      pageStyle: "shop",
      widgetScript: "product-shop",
      products: products.map(normalizeProduct),
      filter: "bestseller",
      search: "",
    });
  } catch (err) {
    res.redirect("/shop?filter=bestseller");
  }
});

router.get("/new-arrivals", async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } }).sort({ createdAt: -1 });
    res.render("pages/shop", {
      layout: "layouts/main",
      title: "New Arrivals | NIRALI Luxury Sarees",
      path: "/new-arrivals",
      user: req.user || null,
      pageStyle: "shop",
      widgetScript: "product-shop",
      products: products.map(normalizeProduct),
      filter: "new",
      search: "",
    });
  } catch (err) {
    res.redirect("/shop?filter=new");
  }
});

router.get("/products/:slug", async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, stock: { $gt: 0 } });
    if (!product) {
      return res.status(404).render("pages/shop", {
        layout: "layouts/main",
        title: "Not Found | NIRALI",
        path: "/shop",
        user: req.user || null,
        pageStyle: "shop",
        widgetScript: "product-shop",
        products: [],
        filter: "",
        search: "",
      });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      stock: { $gt: 0 },
    }).limit(4);

    res.render("pages/product-detail", {
      layout: "layouts/main",
      title: `${product.name} | NIRALI Luxury Sarees`,
      path: "/shop",
      user: req.user || null,
      pageStyle: "product-detail",
      widgetScript: "product-detail",
      product: normalizeProduct(product),
      relatedProducts: relatedProducts.map(normalizeProduct),
    });
  } catch (err) {
    res.redirect("/shop");
  }
});

router.get("/cart", (req, res) => {
  res.render("pages/cart", {
    layout: "layouts/main",
    title: "Shopping Bag | NIRALI",
    path: "/cart",
    user: req.user || null,
    pageStyle: "cart",
    widgetScript: "cart-page",
  });
});

router.get("/checkout", requireUserPage, (req, res) => {
  res.render("pages/checkout", {
    layout: "layouts/main",
    title: "Checkout | NIRALI",
    path: "/checkout",
    user: req.user || null,
    pageStyle: "checkout",
    widgetScript: "cart-page",
    razorpayEnabled: Boolean(process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") && process.env.RAZORPAY_KEY_SECRET),
  });
});

router.get("/login", (req, res) => {
  if (req.user) return res.redirect(req.user.role === "admin" ? "/admin" : "/");
  res.render("pages/login", {
    layout: "layouts/main",
    title: "Sign In | NIRALI",
    path: "/login",
    user: null,
    pageStyle: "auth",
  });
});

router.get("/signup", (req, res) => {
  if (req.user) return res.redirect(req.user.role === "admin" ? "/admin" : "/");
  res.render("pages/signup", {
    layout: "layouts/main",
    title: "Create Account | NIRALI",
    path: "/signup",
    user: null,
    pageStyle: "auth",
  });
});

router.get("/forgot-password", (_req, res) => {
  res.render("pages/forgot-password", {
    layout: "layouts/main",
    title: "Forgot Password | NIRALI",
    path: "/forgot-password",
    user: null,
    pageStyle: "auth",
  });
});

router.get("/reset-password", (_req, res) => {
  res.render("pages/reset-password", {
    layout: "layouts/main",
    title: "Reset Password | NIRALI",
    path: "/reset-password",
    user: null,
    pageStyle: "auth",
  });
});

router.get("/account", requireUserPage, (req, res) => {
  res.render("pages/account", {
    layout: "layouts/main",
    title: "My Account | NIRALI",
    path: "/account",
    user: req.user,
    pageStyle: "account",
    widgetScript: "user-dashboard",
  });
});

router.get("/verify-email", (req, res) => {
  res.render("pages/verify-email", {
    layout: "layouts/main",
    title: "Verify Account | NIRALI",
    path: "/verify-email",
    user: null,
    pageStyle: "auth",
  });
});

router.get("/about", (req, res) => {
  res.render("pages/about", {
    layout: "layouts/main",
    title: "The Atelier Story | NIRALI",
    path: "/about",
    user: req.user || null,
    pageStyle: "about",
  });
});

router.get("/contact", (req, res) => {
  res.render("pages/contact", {
    layout: "layouts/main",
    title: "Concierge & Boutique | NIRALI",
    path: "/contact",
    user: req.user || null,
    pageStyle: "contact",
  });
});

router.get("/reviews", async (req, res) => {
  try {
    const dbReviews = await Review.find({ status: "approved" }).sort({ createdAt: -1 });
    res.render("pages/reviews", {
      layout: "layouts/main",
      title: "Patron Diaries | NIRALI",
      path: "/reviews",
      user: req.user || null,
      pageStyle: "reviews",
      reviews: [
        ...dbReviews.map((review) => ({
          id: review._id.toString(),
          name: review.name,
          rating: review.rating,
          date: review.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
          text: review.text,
        })),
        ...reviews,
      ],
    });
  } catch (err) {
    res.render("pages/reviews", {
      layout: "layouts/main",
      title: "Patron Diaries | NIRALI",
      path: "/reviews",
      user: req.user || null,
      pageStyle: "reviews",
      reviews,
    });
  }
});

// Informational & Policy Pages
const policyData = {
  "shipping-policy": {
    title: "Shipping & Delivery Policy",
    subtitle: "Complimentary express courier service across all pin codes in India.",
    sections: [
      {
        heading: "Domestic Dispatch & Delivery",
        body: "All NIRALI orders are processed and inspected at our boutique atelier within 24 to 48 hours of confirmation. Orders are dispatched via reputed express couriers (Bluedart, Delhivery, DTDC). Standard transit time is 3 to 5 business days depending on destination pincode."
      },
      {
        heading: "Complimentary Shipping",
        body: "We are pleased to offer complimentary door-to-door express delivery on all orders valued above ₹2,999. A nominal fee of ₹100 applies to smaller orders."
      },
      {
        heading: "Signature Packaging",
        body: "Every saree is wrapped in archival tissue and sealed inside our signature gilded keepsake box, ensuring it arrives in pristine, ready-to-wear condition."
      },
      {
        heading: "Order Tracking",
        body: "Once dispatched, you will receive real-time consignment tracking numbers via SMS and email."
      }
    ]
  },
  "return-policy": {
    title: "Return & Exchange Policy",
    subtitle: "A seamless, 5-day doorstep exchange and return experience.",
    sections: [
      {
        heading: "5-Day Return Window",
        body: "We stand behind the artistry of each weave. If you are not completely delighted with your purchase, you may initiate a return or exchange within 5 days of delivery."
      },
      {
        heading: "Eligibility Conditions",
        body: "Items must be unused, unwashed, unaltered, and retained with original luxury packaging, fold creases, and security tags intact."
      },
      {
        heading: "Hassle-Free Doorstep Pickup",
        body: "Our logistics partners will arrange a complimentary pickup from your delivery address upon approval of your request."
      },
      {
        heading: "Refund Processing",
        body: "Approved refunds are credited to your original payment method or bank account within 3–5 business days of inspection."
      }
    ]
  },
  "privacy-policy": {
    title: "Privacy Policy",
    subtitle: "Your personal data is treated with utmost discretion and security.",
    sections: [
      {
        heading: "Information Collection",
        body: "We collect personal details such as your name, delivery address, contact number, and email solely to fulfill orders, provide concierge customer service, and communicate tracking information."
      },
      {
        heading: "Data Protection & Encryption",
        body: "All transmissions are encrypted via industry-standard SSL protocols. We do not store credit card or debit card numbers on our servers."
      },
      {
        heading: "Third-Party Confidentiality",
        body: "We strictly never sell or trade your data to third-party marketing brokers. Information is shared only with verified logistics partners required to complete delivery."
      }
    ]
  },
  "terms": {
    title: "Terms & Conditions",
    subtitle: "Guidelines governing the use of the NIRALI digital boutique.",
    sections: [
      {
        heading: "Authenticity & Handcraft Disclaimer",
        body: "Due to the artisanal handloom weaving techniques and screen calibration, subtle variations in thread texture, zari shimmer, and dye shade are characteristic of authentic handwoven textiles."
      },
      {
        heading: "Pricing & Availability",
        body: "All prices are listed in Indian Rupees (INR) inclusive of applicable taxes. Limited edition pieces are subject to weaver availability."
      },
      {
        heading: "Intellectual Property",
        body: "All brand imagery, design motifs, photography, and text content are exclusive intellectual property of NIRALI."
      }
    ]
  },
  "faq": {
    title: "Frequently Asked Questions",
    subtitle: "Answers to common queries regarding curations, orders, and care.",
    sections: [
      {
        heading: "Do NIRALI sarees come with blouse pieces?",
        body: "Yes, our sarees include an unstitched 0.8-meter matching or contrast designer blouse piece unless specifically noted otherwise."
      },
      {
        heading: "How should I care for my saree?",
        body: "We recommend professional dry cleaning for all zari, silk, and delicate chiffon sarees to preserve their luster and structural integrity."
      },
      {
        heading: "Can I place an order over WhatsApp?",
        body: "Yes, our WhatsApp concierge (+91 76238 57001) is available Monday through Saturday to assist with bespoke order placement and styling queries."
      },
      {
        heading: "Do you offer Cash on Delivery (COD)?",
        body: "Yes, Cash on Delivery is supported across eligible pin codes across India."
      }
    ]
  }
};

router.get(["/shipping-policy", "/return-policy", "/privacy-policy", "/terms", "/faq"], (req, res) => {
  const slug = req.path.replace(/^\//, "");
  const policy = policyData[slug] || policyData["shipping-policy"];

  res.render("pages/policy", {
    layout: "layouts/main",
    title: `${policy.title} | NIRALI`,
    path: req.path,
    user: req.user || null,
    pageStyle: "about",
    policy,
  });
});

router.get(["/admin", "/admin/products", "/admin/orders", "/admin/reviews", "/admin/users", "/admin/homepage"], requireUserPage, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).redirect("/");
  res.render("pages/admin", {
    layout: "layouts/admin",
    title: "Admin Dashboard | NIRALI",
    user: req.user || null,
  });
});

module.exports = router;
