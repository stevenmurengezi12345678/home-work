export const runtime = 'nodejs'

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET

function validatePassword(password) {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' }
  }

  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Password must contain letters and numbers' }
  }

  return { valid: true }
}

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const validation = validatePassword(password)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 })
    }

    const db = await getDb()

    const existingUser = await db.collection('users').findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const userId = uuidv4()

    await db.collection('users').insertOne({
      id: userId,
      email,
      password: hashedPassword,
      createdAt: new Date()
    })

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })

    return NextResponse.json({ token })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
