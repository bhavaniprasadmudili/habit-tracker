const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const ResetToken = require('../models/ResetToken');
const ActivityLog = require('../models/ActivityLog');
const { sendEmail } = require('../email/emailService');

const createJwt = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: '7d' });
};

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  return email.toLowerCase().trim();
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

async function logActivity(userId, action, req, meta = {}) {
  await ActivityLog.create({ userId, action, ip: req.ip, device: req.headers['user-agent'] || 'unknown', meta });
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getOtpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

async function createOtp({ userId, type, email }) {
  const code = generateOtpCode();
  const expiresAt = getOtpExpiry();
  await Otp.deleteMany({ userId, type });
  await Otp.create({ userId, type, code, expiresAt });

  const subject = type === 'register'
    ? 'Verify your Trackkar account'
    : type === 'login'
      ? 'Your Trackkar login OTP'
      : 'Your Trackkar password reset OTP';

  const text = `Your Trackkar ${type === 'register' ? 'verification' : type === 'login' ? 'login' : 'reset'} code is ${code}. It expires in 10 minutes.`;
  const html = `<p>Your Trackkar ${type === 'register' ? 'verification' : type === 'login' ? 'login' : 'reset'} code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`;

  let otpForDev = null;
  if (email) {
    try {
      await sendEmail({ to: email, subject, text, html });
    } catch (err) {
      console.warn('[auth] OTP email send failed, returning OTP in response for development:', err.message);
      otpForDev = code;
    }
  } else {
    otpForDev = code;
  }

  return { code: otpForDev, expiresAt };
}

async function verifyOtpCode({ userId, type, code, markUsed = true }) {
  const record = await Otp.findOne({ userId, type, code, used: false, expiresAt: { $gt: new Date() } });
  if (!record) {
    return null;
  }

  if (markUsed) {
    record.used = true;
    await record.save();
  }

  return record;
}

async function register(req, res) {
  try {
    const { name, email, password, confirmPassword, phone } = req.body;
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Name, email, password and confirm password are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be minimum 8 characters and include uppercase, lowercase, number, and special character' });
    }

    const existingQuery = [{ email: normalizedEmail }];
    if (phone) {
      existingQuery.push({ phone });
    }

    const existing = await User.findOne({ $or: existingQuery });
    if (existing) {
      return res.status(400).json({ message: 'User already exists with that email or phone' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone,
      passwordHash,
      verified: false,
    });

    await logActivity(user._id, 'USER_REGISTERED', req, { email: normalizedEmail, phone });
    const otpResponse = await createOtp({ userId: user._id, type: 'register', email: user.email });

    return res.json({
      userId: user._id,
      message: 'OTP sent to your email. Enter the code to verify your account.',
      otp: otpResponse.code,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to register user' });
  }
}

async function login(req, res) {
  try {
    const { email, password, phone } = req.body;
    if (!password || (!email && !phone)) {
      return res.status(400).json({ message: 'Email or phone and password are required' });
    }

    const query = email
      ? { email: normalizeEmail(email) }
      : { phone };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.suspended) {
      return res.status(403).json({ message: 'Account is suspended' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'admin') {
      const token = createJwt(user);
      await logActivity(user._id, 'ADMIN_LOGGED_IN', req, { email: query.email, phone });
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    const otpResponse = await createOtp({ userId: user._id, type: 'login', email: user.email });
    await logActivity(user._id, 'USER_LOGIN_OTP_SENT', req, { email: query.email, phone });

    return res.json({
      userId: user._id,
      message: 'OTP sent to your email. Enter the code to complete login.',
      otp: otpResponse.code,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to log in' });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (user) {
      await logActivity(user._id, 'PASSWORD_RESET_OTP_REQUESTED', req, { email: normalizedEmail });
      const otpResponse = await createOtp({ userId: user._id, type: 'reset', email: user.email });
      return res.json({
        userId: user._id,
        message: 'OTP sent to your email. Enter the code to reset your password.',
        otp: otpResponse.code,
      });
    }

    return res.json({ message: 'If an account exists, a reset OTP has been sent to the email address provided.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to process password reset request' });
  }
}

async function verifyOtp(req, res) {
  try {
    const { userId, type, code } = req.body;
    if (!userId || !type || !code) {
      return res.status(400).json({ message: 'userId, type and code are required' });
    }

    const validTypes = ['register', 'login', 'reset'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid OTP type' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const markUsed = type !== 'reset';
    const record = await verifyOtpCode({ userId, type, code, markUsed });
    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    if (type === 'register') {
      user.verified = true;
      await user.save();
      await logActivity(user._id, 'USER_REGISTERED_OTP_VERIFIED', req);
    }

    if (type === 'login') {
      await logActivity(user._id, 'USER_LOGIN_OTP_VERIFIED', req);
    }

    if (type === 'reset') {
      return res.json({ message: 'OTP verified. Enter your new password.', userId: user._id });
    }

    const token = createJwt(user);
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to verify OTP' });
  }
}

async function resendOtp(req, res) {
  try {
    const { userId, type } = req.body;
    if (!userId || !type) {
      return res.status(400).json({ message: 'userId and type are required' });
    }

    const validTypes = ['register', 'login', 'reset'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid OTP type' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otpResponse = await createOtp({ userId: user._id, type, email: user.email });
    await logActivity(user._id, 'OTP_RESENT', req, { type });

    return res.json({ message: 'OTP resent to your email.', otp: otpResponse.code });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to resend OTP' });
  }
}

async function resetPassword(req, res) {
  try {
    const { userId, otp, resetToken, password, confirmPassword } = req.body;
    if (!password || !confirmPassword) {
      return res.status(400).json({ message: 'Password and confirmPassword are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be minimum 8 characters and include uppercase, lowercase, number, and special character' });
    }

    let user;

    if (resetToken) {
      if (!resetToken) {
        return res.status(400).json({ message: 'resetToken is required' });
      }

      const record = await ResetToken.findOne({ token: resetToken });
      if (!record || record.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      user = await User.findById(record.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await ResetToken.deleteMany({ userId: user._id });
    } else {
      if (!userId || !otp) {
        return res.status(400).json({ message: 'userId and otp are required' });
      }

      const record = await verifyOtpCode({ userId, type: 'reset', code: otp, markUsed: true });
      if (!record) {
        return res.status(400).json({ message: 'Invalid or expired OTP code' });
      }

      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.verified = true;
    await user.save();
    await logActivity(user._id, 'PASSWORD_RESET_COMPLETED', req);

    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to reset password' });
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  verifyOtp,
  resendOtp,
  resetPassword,
};
