import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection by counting users
    const userCount = await prisma.user.count()
    
    return NextResponse.json({
      success: true,
      message: 'Database connected successfully!',
      data: {
        userCount,
        timestamp: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}