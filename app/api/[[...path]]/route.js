import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'money_tracker_db';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

function validatePassword(password) {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Password must contain both letters and numbers' };
  }
  
  return { valid: true };
}

function verifyToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function GET(request) {
  try {
    const { pathname } = new URL(request.url);
    const path = pathname.replace('/api', '') || '/';
    const { db } = await connectToDatabase();

    // Root endpoint
    if (path === '/' || path === '') {
      return NextResponse.json({ message: 'Money Tracker API is running' });
    }

    // Check authentication
    if (path === '/auth/check') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }
      return NextResponse.json({ authenticated: true, user: { id: user.userId, email: user.email } });
    }

    // Get all places
    if (path === '/places') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const places = await db.collection('places')
        .find({ userId: user.userId })
        .sort({ createdAt: -1 })
        .toArray();

      // Get record counts and totals for each place
      const placesWithStats = await Promise.all(
        places.map(async (place) => {
          const records = await db.collection('records')
            .find({ placeId: place.id })
            .toArray();
          
          const totalMoneyGiven = records.reduce((sum, r) => sum + (r.moneyGiven || 0), 0);
          const totalMoneyUsed = records.reduce((sum, r) => sum + (r.moneyUsed || 0), 0);
          const totalPowerUnits = records.reduce((sum, r) => sum + (r.powerUnits || 0), 0);
          
          return {
            ...place,
            recordCount: records.length,
            totalMoneyGiven,
            totalMoneyUsed,
            totalPowerUnits
          };
        })
      );

      return NextResponse.json({ places: placesWithStats });
    }

    // Get single place by slug
    if (path.startsWith('/places/')) {
      const slug = path.split('/places/')[1];
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const place = await db.collection('places').findOne({ slug, userId: user.userId });
      if (!place) {
        return NextResponse.json({ error: 'Place not found' }, { status: 404 });
      }

      const records = await db.collection('records')
        .find({ placeId: place.id })
        .sort({ date: -1 })
        .toArray();

      return NextResponse.json({ place, records });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { pathname } = new URL(request.url);
    const path = pathname.replace('/api', '') || '/';
    const body = await request.json();
    const { db } = await connectToDatabase();

    // Signup
    if (path === '/auth/signup') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return NextResponse.json({ error: passwordValidation.message }, { status: 400 });
      }

      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      await db.collection('users').insertOne({
        id: userId,
        email,
        password: hashedPassword,
        createdAt: new Date()
      });

      const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

      return NextResponse.json({ token, user: { id: userId, email } });
    }

    // Login
    if (path === '/auth/login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const user = await db.collection('users').findOne({ email });
      if (!user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      return NextResponse.json({ token, user: { id: user.id, email: user.email } });
    }

    // Create place
    if (path === '/places') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { name } = body;
      if (!name) {
        return NextResponse.json({ error: 'Place name is required' }, { status: 400 });
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const placeId = uuidv4();

      // Check if slug already exists for this user
      const existingPlace = await db.collection('places').findOne({ slug, userId: user.userId });
      if (existingPlace) {
        return NextResponse.json({ error: 'A place with this name already exists' }, { status: 400 });
      }

      const place = {
        id: placeId,
        name,
        slug,
        userId: user.userId,
        createdAt: new Date()
      };

      await db.collection('places').insertOne(place);

      return NextResponse.json({ place });
    }

    // Create record
    if (path === '/records') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { placeId, date, moneyGiven, moneyUsed, powerUnits } = body;

      if (!placeId || !date) {
        return NextResponse.json({ error: 'Place ID and date are required' }, { status: 400 });
      }

      // Verify place belongs to user
      const place = await db.collection('places').findOne({ id: placeId, userId: user.userId });
      if (!place) {
        return NextResponse.json({ error: 'Place not found' }, { status: 404 });
      }

      const recordId = uuidv4();
      const record = {
        id: recordId,
        placeId,
        date: new Date(date),
        moneyGiven: parseFloat(moneyGiven) || 0,
        moneyUsed: parseFloat(moneyUsed) || 0,
        powerUnits: parseFloat(powerUnits) || 0,
        createdAt: new Date()
      };

      await db.collection('records').insertOne(record);

      return NextResponse.json({ record });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { pathname } = new URL(request.url);
    const path = pathname.replace('/api', '') || '/';
    const { db } = await connectToDatabase();

    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete record
    if (path.startsWith('/records/')) {
      const recordId = path.split('/records/')[1];
      
      const record = await db.collection('records').findOne({ id: recordId });
      if (!record) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      // Verify place belongs to user
      const place = await db.collection('places').findOne({ id: record.placeId, userId: user.userId });
      if (!place) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      await db.collection('records').deleteOne({ id: recordId });

      return NextResponse.json({ message: 'Record deleted successfully' });
    }

    // Delete place
    if (path.startsWith('/places/')) {
      const slug = path.split('/places/')[1];
      
      const place = await db.collection('places').findOne({ slug, userId: user.userId });
      if (!place) {
        return NextResponse.json({ error: 'Place not found' }, { status: 404 });
      }

      // Delete all records for this place
      await db.collection('records').deleteMany({ placeId: place.id });
      
      // Delete the place
      await db.collection('places').deleteOne({ id: place.id });

      return NextResponse.json({ message: 'Place deleted successfully' });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}