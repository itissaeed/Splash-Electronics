const mongoose = require('mongoose');


const connectDB = async () => {
    
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        
        console.log(`\nMongoDB Connected: ${conn.connection.host}`);
        return conn; 
    } catch (error) {
        
        console.error(`\nMongoDB connection error: ${error.message}`);
        
        
        process.exit(1); 
    }
};

module.exports = connectDB;