const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { normalizeBangladeshNumber, VALIDATION_ERROR } = require('../utils/numberNormalizer');
// IMPORT: For password reset token generation
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    // Using a dedicated String for numbers is appropriate here
    number: {
        type: String,
        required: true,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    // Stores the HASHED token
    resetPasswordToken: String,
    resetPasswordExpires: Date,

}, {
    timestamps: true,
});

// --- Pre-Save Hook (Data Validation & Password Hashing) ---
userSchema.pre('save', async function (next) {
    try {
        // Normalize phone if changed using shared util
        if (this.isModified('number')) {
            const normalized = normalizeBangladeshNumber(this.number);
            if (!normalized) {
                return next(new Error(VALIDATION_ERROR));
            }
            this.number = normalized;
        }

        // --- Password Hashing ---
        if (!this.isModified('password')) {
            return next(); // Skip hashing if password hasn't changed
        }
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error); // Pass any error to the save operation
    }
});

// --- Instance Method: Compare Password ---
// Compares the entered password (raw) with the hashed password (DB)
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// --- Instance Method: Generate Reset Token ---
// Generates a random token, hashes it for storage, and returns the RAW token for email.
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store HASHED token in DB for comparison
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // Token expires in 1 hour

    return resetToken; // Return this RAW token to send to the user via email
};


const User = mongoose.model('User', userSchema);

module.exports = User;