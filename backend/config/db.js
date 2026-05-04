const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is not defined in .env');
      process.exit(1);
    }

    console.log('🔄 Attempting to connect to MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n❌ ERROR: Failed to connect to MongoDB Atlas`);
    console.error(`Actual Error: ${error.message}`);

    if (error.message.includes('querySrv ECONNREFUSED')) {
      console.error('\n--- TROUBLESHOOTING SRV/DNS ISSUE ---');
      console.error('1. Your network might be blocking DNS SRV lookups (common in some office/public networks).');
      console.error('2. Try changing the MONGO_URI in .env to a standard connection string (starting with "mongodb://" instead of "mongodb+srv://").');
      console.error('3. Check your MongoDB Atlas Network Access (whitelist your current IP).');
      console.error('---------------------------------------\n');
    }

    process.exit(1);
  }
};

module.exports = connectDB;
