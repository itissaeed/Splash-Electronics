const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(cors({
    origin: 'http://localhost:3000', // allow only my frontend
    credentials: true              // allow cookies or auth headers if needed
}));

app.use(express.json());



// Home route
app.get('/', (req, res) => {
    res.send("Splash Electronics Backend is running.");
});
// Mount routes
app.use('/api/auth', authRoutes);
// Product routes
app.use('/api/products', productRoutes);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
    });
});

// Handle unhandled routes
app.use((req, res) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find ${req.originalUrl} on this server!`
    });
});
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error("Failed to start server due to DB error.");
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});
