const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class AuthManager {
  constructor() {
    this.users = new Map(); // In production, use a database
    this.sessions = new Map();
  }

  async register(email, password, name) {
    try {
      if (this.users.has(email)) {
        throw new Error('User already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = uuidv4();

      const user = {
        id: userId,
        email,
        name,
        password: hashedPassword,
        tier: 'free',
        subscriptionId: null,
        createdAt: new Date().toISOString(),
      };

      this.users.set(email, user);
      return { userId, email, name, tier: 'free' };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async login(email, password) {
    try {
      const user = this.users.get(email);
      if (!user) {
        throw new Error('User not found');
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new Error('Invalid password');
      }

      // Create session token
      const sessionToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          tier: user.tier,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      this.sessions.set(sessionToken, {
        userId: user.id,
        email: user.email,
        tier: user.tier,
        lastActive: Date.now(),
      });

      return {
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
        },
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async updateSubscription(userId, tier, subscriptionId) {
    try {
      // Find user and update subscription
      for (const [email, user] of this.users.entries()) {
        if (user.id === userId) {
          user.tier = tier;
          user.subscriptionId = subscriptionId;
          user.updatedAt = new Date().toISOString();
          return true;
        }
      }
      throw new Error('User not found');
    } catch (error) {
      throw new Error(`Subscription update failed: ${error.message}`);
    }
  }

  validateSession(token) {
    const session = this.sessions.get(token);
    if (!session) {
      throw new Error('Invalid session');
    }

    // Update last active
    session.lastActive = Date.now();
    return session;
  }

  logout(token) {
    this.sessions.delete(token);
  }
}

module.exports = new AuthManager();
