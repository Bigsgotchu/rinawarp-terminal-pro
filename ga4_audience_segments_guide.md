# Google Analytics 4 Audience Segments Setup Guide

## Overview
This guide provides step-by-step instructions for creating 5 strategic audience segments in Google Analytics 4 to better understand and target different user behaviors.

## Prerequisites
- Admin access to your Google Analytics 4 property
- Custom events tracking for terminal commands, AI interactions, and feature usage
- E-commerce or conversion tracking setup for pricing page views

## How to Create Audiences in GA4

1. Navigate to **Admin** → **Audiences** in your GA4 property
2. Click **New audience**
3. Choose **Create a custom audience**
4. Configure conditions as specified below for each segment

---

## 1. Power Users Audience

### Purpose
Identify most engaged users for premium feature targeting

### Audience Name
`Power Users`

### Conditions
**Include users when:**

**Group 1 (Terminal Commands):**
- Event name: `terminal_command` (or your custom event)
- Parameter: `session_commands` greater than 50
- Time frame: Any session

**OR (Use "OR" operator)**

**Group 2 (Session Frequency):**
- Active users in last 7 days ≥ 3

**AND (Use "AND" operator)**

**Group 3 (AI Usage):**
- Event name: `ai_interaction` (or your custom event)
- Parameter: `session_interactions` greater than 10
- Time frame: Any session

### Membership Duration
**90 days** (to capture power user behavior patterns)

### Additional Settings
- Enable **Advertising** for remarketing campaigns
- Enable **Analytics** for analysis

---

## 2. Feature Explorers Audience

### Purpose
Target with advanced feature education and conversion offers

### Audience Name
`Feature Explorers`

### Conditions
**Include users when:**

**Group 1 (Feature Diversity):**
- Event name: `feature_used`
- Parameter: `feature_type` equals "AI" 
**AND**
- Event name: `feature_used`
- Parameter: `feature_type` equals "voice"
**AND**
- Event name: `feature_used`
- Parameter: `feature_type` equals "themes"

**AND**

**Group 2 (Session Duration):**
- Session duration greater than 600 seconds (10 minutes)

### Membership Duration
**60 days**

### Additional Settings
- Enable **Advertising** for conversion campaigns
- Enable **Analytics** for behavior analysis

---

## 3. At-Risk Users Audience

### Purpose
Re-engagement campaigns for users showing declining activity

### Audience Name
`At-Risk Users`

### Conditions
**Include users when:**

**Group 1 (Recent Inactivity):**
- Days since last session ≥ 7

**AND**

**Group 2 (Previous Activity):**
- Total sessions ≥ 5
- Time frame: First 7 days after first visit

### Exclusions
**Exclude users when:**
- Active in last 7 days

### Membership Duration
**30 days** (shorter duration for timely re-engagement)

### Additional Settings
- Enable **Advertising** for re-engagement campaigns
- Set up **Automatic campaign triggers** if using Google Ads

---

## 4. High-Intent Non-Purchasers Audience

### Purpose
Targeted conversion campaigns for users who showed purchase intent

### Audience Name
`High-Intent Non-Purchasers`

### Conditions
**Include users when:**

**Group 1 (Pricing Interest):**
- Page location contains "pricing" OR "upgrade" OR "plans"
- Event name: `page_view`

**AND**

**Group 2 (Feature Engagement):**
- Total events ≥ 20 (indicates multiple feature usage)
- Session duration ≥ 900 seconds (15 minutes)

**Exclude users when:**
- Conversion event: `purchase` OR `subscription_start`

### Membership Duration
**45 days** (conversion window consideration)

### Additional Settings
- Enable **Advertising** for conversion campaigns
- Link to **Google Ads** for automated bidding strategies

---

## 5. New User Cohorts Audience

### Purpose
Onboarding optimization and source analysis

### Audience Name Template
`New Users - [Source]` (Create separate audiences for each major source)

### Base Conditions for All Cohorts
**Include users when:**
- First visit date within last 7 days

### Source-Specific Segments

#### 5a. New Users - Organic Search
**Additional Condition:**
- First user default channel grouping = "Organic Search"

#### 5b. New Users - Paid Search  
**Additional Condition:**
- First user default channel grouping = "Paid Search"

#### 5c. New Users - Social Media
**Additional Condition:**
- First user default channel grouping = "Paid Social" OR "Organic Social"

#### 5d. New Users - Direct
**Additional Condition:**
- First user default channel grouping = "Direct"

### Feature Usage Segmentation
For each source audience, create sub-segments based on initial feature usage:

**Conditions to add:**
- Event name: `feature_first_use`
- Parameter: `feature_type` equals [specific feature]

### Membership Duration
**14 days** (short duration for immediate onboarding actions)

### Additional Settings
- Enable **Analytics** for onboarding funnel analysis
- Create **custom reports** to track onboarding success by source

---

## Implementation Checklist

### Before Creating Audiences
- [ ] Verify custom event tracking is implemented
- [ ] Confirm parameter naming conventions
- [ ] Test event firing in GA4 DebugView
- [ ] Set up conversion events (purchase, subscription, etc.)

### After Creating Audiences
- [ ] Verify audience population is reasonable (not 0% or 100%)
- [ ] Set up **custom reports** for each audience
- [ ] Create **comparison reports** between segments
- [ ] Link audiences to **Google Ads** for remarketing
- [ ] Set up **automated alerts** for significant changes

### Monthly Review Tasks
- [ ] Analyze audience size trends
- [ ] Review membership duration effectiveness
- [ ] Update conditions based on new insights
- [ ] A/B test different messaging for each segment

---

## Custom Events Needed

If you haven't implemented these custom events yet, you'll need:

```javascript
// Terminal command tracking
gtag('event', 'terminal_command', {
  'session_commands': command_count,
  'command_type': command_category
});

// AI interaction tracking
gtag('event', 'ai_interaction', {
  'session_interactions': interaction_count,
  'interaction_type': interaction_category
});

// Feature usage tracking
gtag('event', 'feature_used', {
  'feature_type': 'AI|voice|themes',
  'feature_name': specific_feature
});

// Feature first use
gtag('event', 'feature_first_use', {
  'feature_type': feature_category,
  'user_tenure': days_since_signup
});
```

---

## Notes and Best Practices

1. **Audience Overlap**: These segments may overlap - this is intentional for comprehensive targeting
2. **Data Delays**: GA4 audiences can take 24-48 hours to populate fully
3. **Privacy Compliance**: Ensure all tracking complies with privacy regulations
4. **Testing**: Use GA4's **Audience Insights** to validate segment behavior
5. **Iteration**: Review and refine conditions monthly based on performance data

## Troubleshooting

**Audience showing 0 users:**
- Check event implementation in DebugView
- Verify parameter names match exactly
- Confirm time frame settings aren't too restrictive

**Audience too large/small:**
- Adjust threshold values (50 commands, 10 interactions, etc.)
- Modify time windows
- Add/remove AND/OR conditions

**Data not updating:**
- Allow 24-48 hours for population
- Check data processing status in Admin
- Verify no conflicting exclusion rules
