/**
 * doorsmash - Elite Dating Platform
 * User login API endpoint
 * Copyright (c) 2024 rinawarp Technologies, LLC
 * All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, validateEmail, AuthError } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Attempt login
    const result = await auth.login(email, password);

    return NextResponse.json({
      message: 'Login successful',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
