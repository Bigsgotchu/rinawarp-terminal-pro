/**
 * doorsmash - Elite Dating Platform
 * User registration API endpoint
 * Copyright (c) 2024 rinawarp Technologies, LLC
 * All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, validateEmail, validatePassword, AuthError } from '@/lib/auth';
import { payment, MINIMUM_PAYMENT_AMOUNT } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, dateOfBirth, gender, phoneNumber } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !dateOfBirth || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return NextResponse.json(
        { error: 'Password requirements not met', details: passwordErrors },
        { status: 400 }
      );
    }

    // Validate age (must be 18+)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      return NextResponse.json(
        { error: 'You must be at least 18 years old to register' },
        { status: 400 }
      );
    }

    // Register user
    const result = await auth.register({
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phoneNumber,
    });

    // Create payment intent for the $100 membership fee
    const paymentIntent = await payment.createPaymentIntent({
      amount: MINIMUM_PAYMENT_AMOUNT,
      currency: 'USD',
      userId: result.user.id,
      description: 'doorsmash Premium Membership - Initial Registration',
    });

    return NextResponse.json({
      message: 'User registered successfully',
      user: result.user,
      token: result.token,
      paymentIntent: {
        clientSecret: paymentIntent.clientSecret,
        amount: MINIMUM_PAYMENT_AMOUNT,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
