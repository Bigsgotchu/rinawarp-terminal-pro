# Quick Reference Guide - Email Template System

## Emergency Contacts
- **Technical Issues**: tech@rinawarptech.com
- **Campaign Support**: campaigns@rinawarptech.com
- **Training Help**: training@rinawarptech.com

## Quick Commands

### Testing
```bash
# Validate HTML
npm run validate-html

# Check all links
npm run check-links

# Test across email clients
npm run test-clients

# Check spam score
npm run spam-check
```

### Deployment
```bash
# Send test email
npm run send-test

# Deploy to production
npm run deploy

# Monitor campaign
npm run monitor
```

## Common Tasks

### 1. Updating Email Copy
1. Open template file in `templates/` directory
2. Find placeholder text (marked with `{{}}`)
3. Replace with new content
4. Save and test: `npm run validate-html`

### 2. Changing Colors
1. Locate `<style>` section in template
2. Update CSS variables:
   ```css
   :root {
     --primary-color: #1a365d;
     --secondary-color: #ff6b9d;
     --accent-color: #4fd1c7;
   }
   ```
3. Test across clients: `npm run test-clients`

### 3. Adding New Images
1. Upload images to `assets/images/`
2. Update `src` attributes in template
3. Add alt text for accessibility
4. Test image loading

### 4. Setting Up A/B Test
1. Create template variations
2. Define test parameters in `ab-tests/config.json`
3. Run: `npm run ab-test`
4. Monitor results in dashboard

### 5. Configuring Tracking
1. Update UTM parameters in links
2. Set up Google Analytics goals
3. Configure email provider tracking
4. Test tracking pixels

## Template Variables

### Personalization
- `{{first_name}}` - User's first name
- `{{email}}` - User's email address
- `{{company}}` - User's company
- `{{signup_date}}` - Account creation date

### System Variables
- `{{unsubscribe_url}}` - Unsubscribe link
- `{{view_online_url}}` - View in browser link
- `{{tracking_pixel}}` - Analytics tracking
- `{{current_date}}` - Today's date

## Email Provider Settings

### SendGrid
```env
SENDGRID_API_KEY=your_key_here
SENDGRID_FROM_EMAIL=noreply@rinawarptech.com
SENDGRID_TEMPLATE_ID=d-1234567890
```

### Mailchimp
```env
MAILCHIMP_API_KEY=your_key_here
MAILCHIMP_LIST_ID=your_list_id
MAILCHIMP_TEMPLATE_ID=123456
```

### Custom SMTP
```env
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASS=your_password
```

## Troubleshooting

### Email Not Sending
1. Check API keys and credentials
2. Verify sender email is authenticated
3. Check for template syntax errors
4. Review server logs

### Images Not Loading
1. Verify image URLs are accessible
2. Check image file sizes (keep under 1MB)
3. Test with different email clients
4. Ensure proper hosting

### Poor Deliverability
1. Check spam score: `npm run spam-check`
2. Verify sender reputation
3. Review email content for spam triggers
4. Check blacklist status

### Mobile Display Issues
1. Test on actual devices
2. Check responsive CSS
3. Verify font sizes (minimum 14px)
4. Test touch targets (minimum 44px)

## Quality Checklist

Before sending any email:
- [ ] HTML validates without errors
- [ ] All links work correctly
- [ ] Images display properly
- [ ] Mobile responsive design
- [ ] Accessibility standards met
- [ ] Personalization populated
- [ ] Unsubscribe link present
- [ ] Tracking configured
- [ ] Legal compliance verified
- [ ] A/B test set up (if applicable)

## Performance Metrics

### Track These KPIs
- **Open Rate**: Target 20-25%
- **Click Rate**: Target 3-5%
- **Conversion Rate**: Target 1-3%
- **Bounce Rate**: Keep under 2%
- **Unsubscribe Rate**: Keep under 0.5%

### Red Flags
- Open rate below 15%
- High bounce rate (>5%)
- Increasing unsubscribe rate
- Poor click-to-open ratio
- Deliverability issues

## Emergency Procedures

### Campaign Issues
1. Pause campaign immediately
2. Identify and fix issue
3. Test fix thoroughly
4. Resume or reschedule campaign
5. Document incident

### Template Errors
1. Revert to last working version
2. Fix issue in development
3. Test thoroughly
4. Deploy fix
5. Monitor for issues

## Support Resources

### Documentation
- [Email Template Style Guide](../docs/style-guide.md)
- [Integration Guide](../docs/integration-guide.md)
- [Workflow Documentation](../docs/workflow-guide.md)

### Training Materials
- [Video Tutorials](../training/videos/)
- [Interactive Workshops](../training/workshops/)
- [Best Practice Examples](../training/examples/)

### Tools
- [HTML Validator](https://validator.w3.org/)
- [Email Client Tester](https://www.emailonacid.com/)
- [Spam Score Checker](https://www.mail-tester.com/)

---

*Keep this guide handy for quick reference during campaigns!*
