const test = require("node:test");
const assert = require("node:assert/strict");
const { senderDetails, sendOtpEmail, sendTransactionalEmail, setTransportOverride } = require("../utils/email");

test("senderDetails returns configured sender name and email when formatted as Name <email>", () => {
  const origFrom = process.env.EMAIL_FROM;
  try {
    process.env.EMAIL_FROM = '"Nirali Saree Boutique" <contact@niralisaree.com>';
    const sender = senderDetails();
    assert.equal(sender.name, "Nirali Saree Boutique");
    assert.equal(sender.email, "contact@niralisaree.com");
  } finally {
    if (origFrom !== undefined) process.env.EMAIL_FROM = origFrom;
    else delete process.env.EMAIL_FROM;
  }
});

test("senderDetails falls back to default sender details when EMAIL_FROM and EMAIL_USER are absent", () => {
  const origFrom = process.env.EMAIL_FROM;
  const origUser = process.env.EMAIL_USER;
  try {
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_USER;
    const sender = senderDetails();
    assert.equal(sender.name, "Nirali Saree");
    assert.equal(sender.email, "no-reply@niralisaree.com");
  } finally {
    if (origFrom !== undefined) process.env.EMAIL_FROM = origFrom;
    else delete process.env.EMAIL_FROM;
    if (origUser !== undefined) process.env.EMAIL_USER = origUser;
    else delete process.env.EMAIL_USER;
  }
});

test("sendOtpEmail builds message with subject, plain text, and HTML containing the OTP", async () => {
  let capturedMail;
  setTransportOverride({
    sendMail: async (mail) => {
      capturedMail = mail;
      return { messageId: "test-id" };
    },
  });

  try {
    await sendOtpEmail("buyer@example.com", "998877");
    assert.ok(capturedMail);
    assert.equal(capturedMail.to, "buyer@example.com");
    assert.match(capturedMail.subject, /Nirali Saree/);
    assert.match(capturedMail.text, /998877/);
    assert.match(capturedMail.html, /998877/);
  } finally {
    setTransportOverride(null);
  }
});

test("transportOverride intercepts sendTransactionalEmail even if BREVO_API_KEY is present", async () => {
  const origBrevo = process.env.BREVO_API_KEY;
  let capturedMail;
  process.env.BREVO_API_KEY = "dummy_brevo_key_for_test";
  setTransportOverride({
    sendMail: async (mail) => {
      capturedMail = mail;
      return { messageId: "override-brevo-id" };
    },
  });

  try {
    await sendTransactionalEmail({
      to: "customer@example.com",
      subject: "Test Subject",
      text: "Test content",
    });
    assert.ok(capturedMail);
    assert.equal(capturedMail.to, "customer@example.com");
    assert.equal(capturedMail.subject, "Test Subject");
  } finally {
    setTransportOverride(null);
    if (origBrevo !== undefined) process.env.BREVO_API_KEY = origBrevo;
    else delete process.env.BREVO_API_KEY;
  }
});
