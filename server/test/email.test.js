const test = require("node:test");
const assert = require("node:assert/strict");
const { senderDetails, sendOtpEmail } = require("../utils/email");

test("senderDetails returns configured sender name and email when formatted as Name <email>", () => {
  const origFrom = process.env.EMAIL_FROM;
  try {
    process.env.EMAIL_FROM = '"Luxora Boutique" <contact@luxora.com>';
    const sender = senderDetails();
    assert.equal(sender.name, "Luxora Boutique");
    assert.equal(sender.email, "contact@luxora.com");
  } finally {
    if (origFrom) process.env.EMAIL_FROM = origFrom;
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
    assert.equal(sender.email, "no-reply@luxora.com");
  } finally {
    if (origFrom) process.env.EMAIL_FROM = origFrom;
    if (origUser) process.env.EMAIL_USER = origUser;
  }
});

test("sendOtpEmail builds message with subject, plain text, and HTML containing the OTP", async () => {
  const emailModule = require("../utils/email");
  let capturedMail;
  emailModule.setTransportOverride({
    sendMail: async (mail) => {
      capturedMail = mail;
      return { messageId: "test-id" };
    },
  });

  try {
    await emailModule.sendOtpEmail("buyer@example.com", "998877");
    assert.ok(capturedMail);
    assert.equal(capturedMail.to, "buyer@example.com");
    assert.match(capturedMail.subject, /Nirali Saree/);
    assert.match(capturedMail.text, /998877/);
    assert.match(capturedMail.html, /998877/);
  } finally {
    emailModule.setTransportOverride(null);
  }
});
