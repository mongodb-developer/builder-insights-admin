#!/usr/bin/env node
/**
 * Seed Admin User Script
 * 
 * Run with: node scripts/seed-admin.mjs
 * 
 * This script ensures Michael.lynn@mongodb.com exists as an admin.
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'devrel-insights';

const ADMIN_EMAIL = 'michael.lynn@mongodb.com';
const ADMIN_NAME = 'Michael Lynn';

async function seedAdmin() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env.local');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const advocates = db.collection('advocates');

    // Check if admin exists
    const existing = await advocates.findOne({
      email: { $regex: new RegExp(`^${ADMIN_EMAIL}$`, 'i') },
    });

    if (existing) {
      if (existing.role === 'admin') {
        console.log(`✅ ${ADMIN_EMAIL} is already an admin`);
        console.log(`   Role: ${existing.role}`);
        console.log(`   ID: ${existing._id}`);
      } else {
        // Upgrade to admin
        await advocates.updateOne(
          { _id: existing._id },
          {
            $set: {
              role: 'admin',
              isAdmin: true,
              updatedAt: new Date().toISOString(),
            },
          }
        );
        console.log(`✅ Upgraded ${ADMIN_EMAIL} to admin role`);
      }
    } else {
      // Create new admin
      const now = new Date().toISOString();
      const result = await advocates.insertOne({
        email: ADMIN_EMAIL.toLowerCase(),
        name: ADMIN_NAME,
        role: 'admin',
        isAdmin: true,
        isActive: true,
        region: 'Americas',
        createdAt: now,
        updatedAt: now,
      });
      console.log(`✅ Created admin advocate: ${ADMIN_EMAIL}`);
      console.log(`   ID: ${result.insertedId}`);
    }

    // List all admins
    const admins = await advocates.find({ role: 'admin' }).toArray();
    console.log(`\n📋 Current admins (${admins.length}):`);
    admins.forEach((a) => {
      console.log(`   - ${a.name} <${a.email}>`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 Disconnected from MongoDB');
  }
}

seedAdmin();
