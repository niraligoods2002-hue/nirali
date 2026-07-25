const nodemailer = require("nodemailer");

async function sendOtpEmail(to, otp) {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) throw new Error("Nodemailer SMTP configuration is incomplete");

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT || 587),
    secure: EMAIL_SECURE === "true",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });

  await transporter.sendMail({
    from: EMAIL_FROM || `"Nirali Saree" <${EMAIL_USER}>`,
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
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) throw new Error("Nodemailer SMTP configuration is incomplete");

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT || 587),
    secure: EMAIL_SECURE === "true",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });

  await transporter.sendMail({
    from: EMAIL_FROM || `"Nirali Saree" <${EMAIL_USER}>`,
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

module.exports = { sendOtpEmail, sendPasswordResetEmail };
