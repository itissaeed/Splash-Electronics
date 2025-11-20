const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { normalizeBangladeshNumber } = require('../utils/numberNormalizer');
const signToken = (userId) => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not configured');
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};



exports.signup = async (req, res) => {
    try {
        const { name, email, number, password } = req.body;
        if (!name || !email || !number || !password) {
            return res.status(400).json({ status: 'fail', message: 'All fields (name, email, number, password) are required.' });
        }


        // Normalize and validate number before queries/creation
        const normalizedNumber = normalizeBangladeshNumber(number);
        const VALIDATION_ERROR = 'Invalid Bangladeshi phone number format.';
        if (!normalizedNumber) {
            return res.status(400).json({ status: 'fail', message: VALIDATION_ERROR });
        }

        // Check if user already exists (email or normalized phone)
        const existingUser = await User.findOne({ $or: [{ email }, { number: normalizedNumber }] });
        if (existingUser) {
            return res.status(409).json({ status: 'fail', message: 'User with this email or phone number already exists.' });
        }

        // Create new user (model pre-save will hash & validate again)
        const newUser = new User({ name, email, number: normalizedNumber, password });
        await newUser.save();

        const token = signToken(newUser._id);

        const userObj = newUser.toObject();
        delete userObj.password;
        delete userObj.resetPasswordToken;
        delete userObj.resetPasswordExpires;
        delete userObj.__v;

        return res.status(201).json({ status: 'success', token, user: userObj });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({ status: 'fail', message: 'Email or phone already in use.' });
        }
        // If your model throws a specific phone validation message, include it:
        if (error && typeof error.message === 'string' && error.message.toLowerCase().includes('bangladeshi')) {
            return res.status(400).json({ status: 'fail', message: error.message });
        }
        console.error('Signup Error:', error);
        return res.status(500).json({ status: 'error', message: 'An internal server error occurred during signup.' });
    }
};