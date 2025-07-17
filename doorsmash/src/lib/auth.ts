/**
 * doorsmash - Elite Dating Platform
 * Authentication utilities and middleware
 * Copyright (c) 2024 rinawarp Technologies, LLC
 * All rights reserved.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const auth = {
  // Hash password
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  },

  // Verify password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  // Generate JWT token
  generateToken(payload: { userId: string; email: string }): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '7d',
      algorithm: 'HS256',
    });
  },

  // Verify JWT token
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new AuthError('Invalid token');
    }
  },

  // Register new user
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber?: string;
  }) {
    // Check if user already exists
    try {
      await db.getUserByEmail(userData.email);
      throw new AuthError('Email already registered', 400);
    } catch (error) {
      // User doesn't exist, continue with registration
    }

    // Hash password
    const passwordHash = await this.hashPassword(userData.password);

    // Create user
    const user = await db.createUser({
      email: userData.email,
      password_hash: passwordHash,
      first_name: userData.firstName,
      last_name: userData.lastName,
      date_of_birth: userData.dateOfBirth,
      gender: userData.gender,
      phone_number: userData.phoneNumber,
      verification_status: 'pending',
      is_premium: false,
    });

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        verificationStatus: user.verification_status,
        isPremium: user.is_premium,
      },
      token,
    };
  },

  // Login user
  async login(email: string, password: string) {
    // Find user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      throw new AuthError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new AuthError('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        verificationStatus: user.verification_status,
        isPremium: user.is_premium,
      },
      token,
    };
  },

  // Get current user from token
  async getCurrentUser(token: string) {
    const payload = this.verifyToken(token);
    const user = await db.getUserById(payload.userId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      verificationStatus: user.verification_status,
      isPremium: user.is_premium,
      profilePhotoUrl: user.profile_photo_url,
      bio: user.bio,
      occupation: user.occupation,
      location: user.location,
    };
  },

  // Middleware to protect routes
  async requireAuth(request: Request): Promise<{ userId: string; email: string }> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('No token provided');
    }

    const token = authHeader.substring(7);
    const payload = this.verifyToken(token);

    return {
      userId: payload.userId,
      email: payload.email,
    };
  },

  // Check if user has completed payment
  async requirePayment(userId: string) {
    const user = await db.getUserById(userId);
    if (!user.is_premium) {
      throw new AuthError('Payment required to access this feature', 402);
    }
  },

  // Check if user is verified
  async requireVerification(userId: string) {
    const user = await db.getUserById(userId);
    if (user.verification_status !== 'verified') {
      throw new AuthError('Account verification required', 403);
    }
  },
};

// Password validation
export const validatePassword = (password: string): string[] => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
