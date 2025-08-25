import mongoose from 'mongoose';
import { CONFIG } from './config';

export async function connectDB() {
  try {
    await mongoose.connect(CONFIG.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error; // Let the calling code handle the error
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
  }
}
