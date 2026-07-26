const nodemailer = require("nodemailer");

function senderDetails() {
  const fallbackEmail = process.env.EMAIL_USER;
  const configured = String(process.env.EMAIL_FROM || "").trim();
  const match = configured.match(/^(?:"?([^"<]+)"?\s*)?<([^>]+)>$/);

  if (match) {
    return {
      name: match[1]?.trim() || "Nirali Saree",
      email: match[2].trim(),
    };
  }

  return {
    name: "Nirali Saree",
    email: configured || fallbackEmail,
  };
}

async function sendWithBrevo({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = senderDetails();
  if (!apiKey || !sender.email) {
    throw new Error("Brevo email configuration is incomplete");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`Brevo API error (${response.status}): ${body.message || "email delivery failed"}`);
  }
}

async function sendWithSmtp({ to, subject, text, html }) {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error("Nodemailer SMTP configuration is incomplete");
  }

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT || 587),
    secure: EMAIL_SECURE === "true",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const sender = senderDetails();
  await transporter.sendMail({
    from: `"${sender.name}" <${sender.email}>`,
    to,
    subject,
    text,
    html,
  });
}

async function sendTransactionalEmail(message) {
  if (process.env.BREVO_API_KEY) return sendWithBrevo(message);
  return sendWithSmtp(message);
}

async function sendOtpEmail(to, otp) {
  await sendTransactionalEmail({
    to,
    subject: "Your Nirali Saree email verification OTP",
    text: `Your Nirali Saree verification OTP is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0a1931">
        <h2>Nirali Saree Email Verification</h2>
        <p>Your OTP is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(to, resetUrl) {
  await sendTransactionalEmail({
    to,
    subject: "Reset your Nirali Saree password",
    text: `Reset your password using this link: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0a1931">
        <h2>Reset your Nirali Saree password</h2>
        <p>Use the button below to choose a new password.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#8b1e3f;color:#fff;text-decoration:none;border-radius:6px">
            Reset Password
          </a>
        </p>
        <p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>
      </div>
    `,
  });
}

module.exports = {
  sendOtpEmail,
  sendPasswordResetEmail,
  sendTransactionalEmail,
  senderDetails,
};
