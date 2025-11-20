// lib/mongodb.ts
// Mongoose connection helper for Next.js (TypeScript)
// - Strongly typed (no `any`)
// - Caches the connection across hot reloads in development to prevent multiple connections
// - Throws early if the MongoDB URI is missing

import mongoose from 'mongoose';

// Read the MongoDB connection string from the environment.
// Ensure this is set in your .env.local (e.g., MONGODB_URI="mongodb+srv://user:pass@cluster/db")
const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

// Type alias for the Mongoose instance type returned by the default import.
// `typeof mongoose` is the correct way to reference the Mongoose instance type.
export type MongooseInstance = typeof mongoose;

// Cache shape stored on globalThis to survive Next.js hot reloads in development.
interface MongooseCache {
  conn: MongooseInstance | null;
  promise: Promise<MongooseInstance> | null;
}

// Augment the Node.js global type to include our cache key.
// `var` ensures the declaration merges correctly when the module is reloaded.
declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

// Initialize the cache exactly once. In dev, Next.js can re-import modules on HMR,
// so we reuse the existing cache if present.
const globalCache: MongooseCache = globalThis.__mongooseCache ?? {
  conn: null,
  promise: null,
};
if (!globalThis.__mongooseCache) {
  globalThis.__mongooseCache = globalCache;
}

// Connect to MongoDB, reusing the existing connection when available.
// - bufferCommands: false -> fail fast if not connected (prefer explicit handling)
// - maxPoolSize and serverSelectionTimeoutMS are sane defaults for server environments
export async function connectToDatabase(): Promise<MongooseInstance> {
  if (globalCache.conn) return globalCache.conn;

  if (!globalCache.promise) {
    globalCache.promise = mongoose
      .connect(MONGODB_URI, {
        // If your URI includes the db name, this is optional.
        // dbName: process.env.MONGODB_DB,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        bufferCommands: false,
      })
      .then((mongooseInstance) => mongooseInstance)
      .catch((error) => {
        globalCache.promise = null;
        throw error;
      });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}

export default connectToDatabase;
