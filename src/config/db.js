const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.warn('[MongoDB] MONGODB_URI is not defined. Database connection skipped.');
            return;
        }

        // Note: useNewUrlParser / useUnifiedTopology were removed in Mongoose 8+.
        // They are no longer needed — modern mongoose handles both automatically.
        const conn = await mongoose.connect(uri);

        console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[MongoDB] Connection Error: ${error.message}`);
        // Optionally process.exit(1) here if DB is strictly required for boot
    }
};

module.exports = connectDB;
