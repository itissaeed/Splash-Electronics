const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// JWT sign helper
const signToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                status: 'fail',
                message: 'Email and password are required' 
            });
        }

        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ 
                status: 'fail',
                message: 'Invalid credentials' 
            });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                status: 'fail',
                message: 'Invalid credentials' 
            });
        }

        const token = signToken(user._id);

        // Clean user object for response
        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.resetPasswordToken;
        delete userObj.resetPasswordExpires;
        delete userObj.__v;

        return res.status(200).json({
            status: 'success',
            token,
            user: userObj
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'An error occurred during login'
        });
    }
};