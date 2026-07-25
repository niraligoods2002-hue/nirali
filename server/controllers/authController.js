const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendOtpEmail, sendPasswordResetEmail } = require("../utils/email");

// Generate JWT token
function signToken(user) {
  return jwt.sign({ id: user._id, sessionVersion: user.sessionVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function setSessionCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
  return crypto
    .createHash("sha256")
    .update(`${otp}${process.env.JWT_SECRET || "nirali"}`)
    .digest("hex");
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function sendEmailOtp(email, otp) {
  await sendOtpEmail(email, otp);
}

async function setEmailVerificationOtp(user) {
  if (user.emailVerificationOtpLastSentAt && Date.now() - user.emailVerificationOtpLastSentAt.getTime() < 60_000) {
    const error = new Error("Please wait 60 seconds before requesting another OTP");
    error.status = 429;
    throw error;
  }
  const otp = generateOtp();
  user.emailVerificationOtpHash = hashOtp(otp);
  user.emailVerificationOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.emailVerificationOtpAttempts = 0;
  user.emailVerificationOtpLastSentAt = new Date();
  await user.save();
  await sendEmailOtp(user.email, otp);
}

// Helper: shape user response
function userResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || "user",
    isEmailVerified: user.isEmailVerified !== false,
  };
}

// ─── REGISTER ────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }
    if (String(name).trim().length < 2 || String(name).trim().length > 50) return res.status(400).json({ message: "Name must be between 2 and 50 characters" });
    if (String(password).length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: "Password must contain at least 8 characters, including a letter and a number" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.isEmailVerified === false) {
      const user = await User.findById(existingUser._id).select(
        "+emailVerificationOtpHash +emailVerificationOtpExpires +emailVerificationOtpAttempts +emailVerificationOtpLastSentAt"
      );
      await setEmailVerificationOtp(user);
      return res.status(200).json({
        requiresVerification: true,
        email: user.email,
        message: "Account already exists. We sent a new OTP to verify your email.",
      });
    }

    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      isEmailVerified: false,
    });
    await setEmailVerificationOtp(user);

    res.status(201).json({
      requiresVerification: true,
      email: user.email,
      message: "OTP sent. Please verify your email to continue.",
    });
  } catch (error) {
    console.error("Register error:", error);

    if (error.status) return res.status(error.status).json({ message: error.message });

    // Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({ message: `${field} already exists` });
    }

    // Mongoose validation error
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({ message: "Server error during registration" });
  }
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("+password +emailVerificationOtpLastSentAt +emailVerificationOtpAttempts");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.isEmailVerified === false) {
      await setEmailVerificationOtp(user);
      return res.status(403).json({
        requiresVerification: true,
        email: user.email,
        message: "Please verify your email first. We sent a new OTP.",
      });
    }

    const token = signToken(user);
    setSessionCookie(res, token);

    res.json({
      token,
      user: userResponse(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Server error during login" });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+emailVerificationOtpHash +emailVerificationOtpExpires +emailVerificationOtpAttempts +emailVerificationOtpLastSentAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified !== false) {
      return res.status(409).json({ message: "Email is already verified. Please sign in with your password." });
    }

    const otpExpired =
      !user.emailVerificationOtpExpires ||
      user.emailVerificationOtpExpires.getTime() < Date.now();

    if (otpExpired || user.emailVerificationOtpAttempts >= 5 || user.emailVerificationOtpHash !== hashOtp(otp)) {
      user.emailVerificationOtpAttempts = (user.emailVerificationOtpAttempts || 0) + 1;
      if (user.emailVerificationOtpAttempts >= 5) user.emailVerificationOtpExpires = new Date(0);
      await user.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isEmailVerified = true;
    user.emailVerificationOtpHash = undefined;
    user.emailVerificationOtpExpires = undefined;
    user.emailVerificationOtpAttempts = 0;
    await user.save();

    const token = signToken(user);
    setSessionCookie(res, token);

    res.json({
      token,
      user: userResponse(user),
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify email OTP error:", error);
    res.status(500).json({ message: "Server error verifying email" });
  }
};

exports.resendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+emailVerificationOtpHash +emailVerificationOtpExpires +emailVerificationOtpAttempts +emailVerificationOtpLastSentAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified !== false) {
      return res.json({ message: "Email is already verified" });
    }

    await setEmailVerificationOtp(user);
    res.json({ message: "New OTP sent" });
  } catch (error) {
    console.error("Resend email OTP error:", error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Server error sending OTP" });
  }
};

exports.forgotPassword = async (req, res) => {
  const genericMessage = "If an account exists for that email, a password reset link has been sent.";
  try {
    const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
    if (!normalizedEmail) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+passwordResetTokenHash +passwordResetTokenExpires"
    );
    if (!user) return res.json({ message: genericMessage });

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = hashResetToken(rawToken);
    user.passwordResetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const configuredBaseUrl = String(process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    const baseUrl = configuredBaseUrl || `${req.protocol}://${req.get("host")}`;
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      user.passwordResetTokenHash = undefined;
      user.passwordResetTokenExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("Password reset email error:", error.message);
    }

    res.json({ message: genericMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Could not process password reset request" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");
    if (!token || !password) return res.status(400).json({ message: "Reset token and new password are required" });
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: "Password must contain at least 8 characters, including a letter and a number" });
    }

    const user = await User.findOne({
      passwordResetTokenHash: hashResetToken(token),
      passwordResetTokenExpires: { $gt: new Date() },
    }).select("+password +passwordResetTokenHash +passwordResetTokenExpires");

    if (!user) return res.status(400).json({ message: "Reset link is invalid or has expired" });

    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetTokenExpires = undefined;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();

    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ message: "Password reset successfully. Please sign in with your new password." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Could not reset password" });
  }
};

exports.hashResetToken = hashResetToken;

// POST /api/auth/logout
exports.logout = (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ message: "Logged out successfully" });
};

// ─── GET PROFILE (protected) ─────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    res.json({ user: userResponse(req.user) });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

// ─── GET ALL USERS (admin only) ──────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v").sort({ createdAt: -1 });
    const list = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role || "user",
      createdAt: u.createdAt,
    }));
    res.json({ users: list });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Server error fetching users" });
  }
};

// ─── UPDATE USER ROLE (admin only) ───────────────────────────────────────────
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: userResponse(user) });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ message: "Server error updating user role" });
  }
};

// ─── DELETE USER (admin only) ────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error deleting user" });
  }
};
