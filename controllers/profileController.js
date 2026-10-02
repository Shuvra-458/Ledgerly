const User = require('../models/User');
const { SUPPORTED_CURRENCIES } = require('../utils/currency');
const { generateToken, cookieOptions } = require('../utils/generateToken');

// ---------- Helpers ----------

/**
 * Build the common locals used by every render of the profile page.
 */
function profileLocals(extra = {}) {
  return {
    title: 'Profile',
    currencies: SUPPORTED_CURRENCIES,
    success: null,
    errors: [],
    ...extra,
  };
}

/**
 * Determine a success flash from query string (simple, no session needed).
 */
function successFromQuery(q) {
  if (q.updated) return 'Profile updated successfully.';
  if (q.passwordChanged) return 'Password changed. You are still logged in.';
  return null;
}

// ---------- GET /profile ----------

exports.showProfile = async (req, res, next) => {
  try {
    res.render('profile/index', profileLocals({
      success: successFromQuery(req.query),
      form: {
        name: req.user.name,
        email: req.user.email,
        currency: req.user.currency,
      },
    }));
  } catch (err) {
    next(err);
  }
};

// ---------- POST /profile (update details) ----------

exports.updateProfile = async (req, res, next) => {
  const { name = '', email = '', currency = '' } = req.body;
  const errors = [];

  const trimmedName = name.trim();
  const normalizedEmail = email.toLowerCase().trim();

  if (trimmedName.length < 2) errors.push('Name must be at least 2 characters.');
  if (trimmedName.length > 50) errors.push('Name cannot exceed 50 characters.');
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) errors.push('Please enter a valid email address.');
  if (!SUPPORTED_CURRENCIES.includes(currency)) errors.push('Please choose a valid currency.');

  if (errors.length) {
    return res.status(400).render('profile/index', profileLocals({
      errors,
      form: { name, email, currency },
    }));
  }

  try {
    if (normalizedEmail !== req.user.email) {
      const conflict = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: req.user._id },
      });
      if (conflict) {
        return res.status(400).render('profile/index', profileLocals({
          errors: ['That email is already in use by another account.'],
          form: { name, email, currency },
        }));
      }
    }

    req.user.name = trimmedName;
    req.user.email = normalizedEmail;
    req.user.currency = currency;
    await req.user.save();

    res.redirect('/profile?updated=1');
  } catch (err) {
    next(err);
  }
};

// ---------- POST /profile/password (change password) ----------

exports.changePassword = async (req, res, next) => {
  const { currentPassword = '', newPassword = '', confirmPassword = '' } = req.body;
  const errors = [];

  if (!currentPassword) errors.push('Please enter your current password.');
  if (newPassword.length < 6) errors.push('New password must be at least 6 characters.');
  if (newPassword !== confirmPassword) errors.push('New passwords do not match.');
  if (newPassword && newPassword === currentPassword) {
    errors.push('New password must be different from your current password.');
  }

  // password field for verification
  const user = await User.findById(req.user._id).select('+password');

  if (!errors.length) {
    const ok = await user.matchPassword(currentPassword);
    if (!ok) errors.push('Current password is incorrect.');
  }

  if (errors.length) {
    return res.status(400).render('profile/index', profileLocals({
      errors,
      form: {
        name: req.user.name,
        email: req.user.email,
        currency: req.user.currency,
      },
    }));
  }

  try {
    user.password = newPassword;      
    await user.save();

    // Rotate the JWT cookie 
    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);

    res.redirect('/profile?passwordChanged=1');
  } catch (err) {
    next(err);
  }
};