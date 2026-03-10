import mongoose from 'mongoose';
declare global { var _mongoConn: typeof mongoose | undefined; }

export async function connectDB() {
  if (global._mongoConn) return global._mongoConn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const c = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 });
  global._mongoConn = c;
  return c;
}
