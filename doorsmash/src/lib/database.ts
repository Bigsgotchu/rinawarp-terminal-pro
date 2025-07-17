/**
 * doorsmash - Elite Dating Platform
 * Database utilities and types
 * Copyright (c) 2024 rinawarp Technologies, LLC
 * All rights reserved.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone_number?: string;
  bio?: string;
  occupation?: string;
  education?: string;
  location?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  profile_photo_url?: string;
  is_premium: boolean;
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
  last_active: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  stripe_payment_intent_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  description?: string;
  created_at: string;
}

export interface Verification {
  id: string;
  user_id: string;
  verification_type: 'id' | 'photo' | 'phone' | 'social' | 'background';
  status: 'pending' | 'approved' | 'rejected';
  document_url?: string;
  verification_data?: any;
  verified_at?: string;
  created_at: string;
}

export interface UserPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  is_primary: boolean;
  caption?: string;
  uploaded_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  min_age: number;
  max_age: number;
  preferred_gender?: string;
  max_distance: number;
  location_preference?: string;
  interests?: string[];
  deal_breakers?: string[];
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'pending' | 'matched' | 'unmatched';
  matched_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'emoji';
  is_read: boolean;
  sent_at: string;
}

export interface Swipe {
  id: string;
  swiper_id: string;
  swiped_id: string;
  action: 'like' | 'pass' | 'super_like';
  created_at: string;
}

// Database helper functions
export const db = {
  // User operations
  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_active'>) {
    const { data, error } = await supabase.from('users').insert([user]).select().single();

    if (error) throw error;
    return data;
  },

  async getUserById(id: string) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error) throw error;
    return data;
  },

  async getUserByEmail(email: string) {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();

    if (error) throw error;
    return data;
  },

  async updateUser(id: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Payment operations
  async createPayment(payment: Omit<Payment, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('payments').insert([payment]).select().single();

    if (error) throw error;
    return data;
  },

  async updatePayment(id: string, updates: Partial<Payment>) {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Verification operations
  async createVerification(verification: Omit<Verification, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('verifications')
      .insert([verification])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserVerifications(userId: string) {
    const { data, error } = await supabase.from('verifications').select('*').eq('user_id', userId);

    if (error) throw error;
    return data;
  },

  // Match operations
  async createMatch(match: Omit<Match, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('matches').insert([match]).select().single();

    if (error) throw error;
    return data;
  },

  async getUserMatches(userId: string) {
    const { data, error } = await supabase
      .from('matches')
      .select(
        `
        *,
        user1:users!matches_user1_id_fkey(*),
        user2:users!matches_user2_id_fkey(*)
      `
      )
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'matched');

    if (error) throw error;
    return data;
  },

  // Swipe operations
  async createSwipe(swipe: Omit<Swipe, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('swipes').insert([swipe]).select().single();

    if (error) throw error;
    return data;
  },

  async checkMutualLike(user1Id: string, user2Id: string) {
    const { data, error } = await supabase
      .from('swipes')
      .select('*')
      .eq('swiper_id', user2Id)
      .eq('swiped_id', user1Id)
      .eq('action', 'like')
      .single();

    return data !== null;
  },

  // Message operations
  async createMessage(message: Omit<Message, 'id' | 'sent_at'>) {
    const { data, error } = await supabase.from('messages').insert([message]).select().single();

    if (error) throw error;
    return data;
  },

  async getMatchMessages(matchId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(
        `
        *,
        sender:users!messages_sender_id_fkey(first_name, profile_photo_url)
      `
      )
      .eq('match_id', matchId)
      .order('sent_at', { ascending: true });

    if (error) throw error;
    return data;
  },
};
