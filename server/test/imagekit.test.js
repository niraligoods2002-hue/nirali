const test = require("node:test");
const assert = require("node:assert/strict");

test("isConfigured verifies presence of ImageKit public key, private key, and URL endpoint", () => {
  const savedPublicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const savedPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const savedUrlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  try {
    delete process.env.IMAGEKIT_PUBLIC_KEY;
    delete process.env.IMAGEKIT_PRIVATE_KEY;
    delete process.env.IMAGEKIT_URL_ENDPOINT;
    delete require.cache[require.resolve("../config/imagekit")];
    const { isConfigured: unconfigured } = require("../config/imagekit");
    assert.equal(unconfigured(), false);

    process.env.IMAGEKIT_PUBLIC_KEY = "test_public_key";
    process.env.IMAGEKIT_PRIVATE_KEY = "test_private_key";
    process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test";
    delete require.cache[require.resolve("../config/imagekit")];
    const { isConfigured: configured, imagekit } = require("../config/imagekit");
    assert.equal(configured(), true);
    assert.ok(imagekit);
  } finally {
    if (savedPublicKey) process.env.IMAGEKIT_PUBLIC_KEY = savedPublicKey;
    else delete process.env.IMAGEKIT_PUBLIC_KEY;
    if (savedPrivateKey) process.env.IMAGEKIT_PRIVATE_KEY = savedPrivateKey;
    else delete process.env.IMAGEKIT_PRIVATE_KEY;
    if (savedUrlEndpoint) process.env.IMAGEKIT_URL_ENDPOINT = savedUrlEndpoint;
    else delete process.env.IMAGEKIT_URL_ENDPOINT;
    delete require.cache[require.resolve("../config/imagekit")];
  }
});

test("uploadProductImage returns 500 when ImageKit is not configured", async () => {
  const savedPublicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const savedPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const savedUrlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  try {
    delete process.env.IMAGEKIT_PUBLIC_KEY;
    delete process.env.IMAGEKIT_PRIVATE_KEY;
    delete process.env.IMAGEKIT_URL_ENDPOINT;
    delete require.cache[require.resolve("../config/imagekit")];
    delete require.cache[require.resolve("../controllers/productController")];
    const { uploadProductImage } = require("../controllers/productController");

    let statusCode;
    let jsonBody;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      },
    };

    await uploadProductImage({}, res);
    assert.equal(statusCode, 500);
    assert.equal(jsonBody.message, "ImageKit is not configured on the server");
  } finally {
    if (savedPublicKey) process.env.IMAGEKIT_PUBLIC_KEY = savedPublicKey;
    else delete process.env.IMAGEKIT_PUBLIC_KEY;
    if (savedPrivateKey) process.env.IMAGEKIT_PRIVATE_KEY = savedPrivateKey;
    else delete process.env.IMAGEKIT_PRIVATE_KEY;
    if (savedUrlEndpoint) process.env.IMAGEKIT_URL_ENDPOINT = savedUrlEndpoint;
    else delete process.env.IMAGEKIT_URL_ENDPOINT;
    delete require.cache[require.resolve("../config/imagekit")];
    delete require.cache[require.resolve("../controllers/productController")];
  }
});

test("uploadProductImage returns 400 when configured but no file is uploaded", async () => {
  const savedPublicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const savedPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const savedUrlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  try {
    process.env.IMAGEKIT_PUBLIC_KEY = "test_public_key";
    process.env.IMAGEKIT_PRIVATE_KEY = "test_private_key";
    process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test";
    delete require.cache[require.resolve("../config/imagekit")];
    delete require.cache[require.resolve("../controllers/productController")];
    const { uploadProductImage } = require("../controllers/productController");

    let statusCode;
    let jsonBody;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      },
    };

    await uploadProductImage({}, res);
    assert.equal(statusCode, 400);
    assert.equal(jsonBody.message, "Please select an image to upload");
  } finally {
    if (savedPublicKey) process.env.IMAGEKIT_PUBLIC_KEY = savedPublicKey;
    else delete process.env.IMAGEKIT_PUBLIC_KEY;
    if (savedPrivateKey) process.env.IMAGEKIT_PRIVATE_KEY = savedPrivateKey;
    else delete process.env.IMAGEKIT_PRIVATE_KEY;
    if (savedUrlEndpoint) process.env.IMAGEKIT_URL_ENDPOINT = savedUrlEndpoint;
    else delete process.env.IMAGEKIT_URL_ENDPOINT;
    delete require.cache[require.resolve("../config/imagekit")];
    delete require.cache[require.resolve("../controllers/productController")];
  }
});

test("uploadProductImage uploads file successfully and returns url, publicId, and fileId", async () => {
  const savedPublicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const savedPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const savedUrlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  try {
    process.env.IMAGEKIT_PUBLIC_KEY = "test_public_key";
    process.env.IMAGEKIT_PRIVATE_KEY = "test_private_key";
    process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test";
    delete require.cache[require.resolve("../config/imagekit")];
    delete require.cache[require.resolve("../controllers/productController")];

    const imagekitModule = require("../config/imagekit");
    const mockImageKit = {
      upload: async (params) => {
        assert.ok(params.file);
        assert.ok(params.fileName.startsWith("product-"));
        assert.equal(params.folder, "/luxora/products");
        assert.equal(params.useUniqueFileName, true);
        return {
          url: "https://ik.imagekit.io/test/luxora/products/test-upload.jpg",
          fileId: "test_file_id_12345",
        };
      },
    };

    Object.defineProperty(imagekitModule, "imagekit", {
      get: () => mockImageKit,
      configurable: true,
    });

    const { uploadProductImage } = require("../controllers/productController");

    let statusCode;
    let jsonBody;
    const req = {
      file: {
        originalname: "sample saree.jpg",
        buffer: Buffer.from("fake image bytes"),
      },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      },
    };

    await uploadProductImage(req, res);
    assert.equal(statusCode, 201);
    assert.deepEqual(jsonBody, {
      url: "https://ik.imagekit.io/test/luxora/products/test-upload.jpg",
      publicId: "test_file_id_12345",
      fileId: "test_file_id_12345",
    });
  } finally {
    if (savedPublicKey) process.env.IMAGEKIT_PUBLIC_KEY = savedPublicKey;
    else delete process.env.IMAGEKIT_PUBLIC_KEY;
    if (savedPrivateKey) process.env.IMAGEKIT_PRIVATE_KEY = savedPrivateKey;
    else delete process.env.IMAGEKIT_PRIVATE_KEY;
    if (savedUrlEndpoint) process.env.IMAGEKIT_URL_ENDPOINT = savedUrlEndpoint;
    else delete process.env.IMAGEKIT_URL_ENDPOINT;
    delete require.cache[require.resolve("../config/imagekit")];
    delete require.cache[require.resolve("../controllers/productController")];
  }
});

test("uploadProductImage returns 500 when imagekit.upload throws an error", async () => {
  const savedPublicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const savedPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const savedUrlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  const originalError = console.error;
  console.error = () => {}; // suppress expected error log in test output

  try {
    process.env.IMAGEKIT_PUBLIC_KEY = "test_public_key";
    process.env.IMAGEKIT_PRIVATE_KEY = "test_private_key";
    process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test";
    delete require.cache[require.resolve("../config/imagekit")];
    delete require.cache[require.resolve("../controllers/productController")];

    const imagekitModule = require("../config/imagekit");
    const mockImageKit = {
      upload: async () => {
        throw new Error("Simulated upload network timeout");
      },
    };

    Object.defineProperty(imagekitModule, "imagekit", {
      get: () => mockImageKit,
      configurable: true,
    });

    const { uploadProductImage } = require("../controllers/productController");

    let statusCode;
    let jsonBody;
    const req = {
      file: {
        originalname: "faulty.jpg",
        buffer: Buffer.from("bytes"),
      },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      },
    };

    await uploadProductImage(req, res);
    assert.equal(statusCode, 500);
    assert.equal(jsonBody.message, "Could not upload image. Please try again.");
  } finally {
    console.error = originalError;
    if (savedPublicKey) process.env.IMAGEKIT_PUBLIC_KEY = savedPublicKey;
    else delete process.env.IMAGEKIT_PUBLIC_KEY;
    if (savedPrivateKey) process.env.IMAGEKIT_PRIVATE_KEY = savedPrivateKey;
    else delete process.env.IMAGEKIT_PRIVATE_KEY;
    if (savedUrlEndpoint) process.env.IMAGEKIT_URL_ENDPOINT = savedUrlEndpoint;
    else delete process.env.IMAGEKIT_URL_ENDPOINT;
    delete require.cache[require.resolve("../config/imagekit")];
    delete require.cache[require.resolve("../controllers/productController")];
  }
});
