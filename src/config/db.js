const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.warn('[MongoDB] MONGODB_URI is not defined. Database connection skipped.');
            return;
        }

        const conn = await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[MongoDB] Connection Error: ${error.message}`);
        // Optionally process.exit(1) here if DB is strictly required for boot
    }
};

module.exports = connectDB;
