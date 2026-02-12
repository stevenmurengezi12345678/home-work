export const runtime = 'nodejs'

import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'



const JWT_SECRET = process.env.JWT_SECRET

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET)

    return NextResponse.json({
      authenticated: true,
      user: { id: decoded.userId, email: decoded.email }
    })

  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
