const stripe = require('stripe')('YOUR_STRIPE_SECRET_KEY');

async function createDiscount() {
  // Create a coupon for 50% off
  const coupon = await stripe.coupons.create({
    percent_off: 50,
    duration: 'once',
    max_redemptions: 100,
    name: 'BETA50',
    id: 'BETA50',
  });

  console.log('Created 50% discount coupon:', coupon.id);

  // Create a promotion code
  const promotionCode = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: 'BETA50',
    max_redemptions: 100,
  });

  console.log('Created promotion code:', promotionCode.code);

  return { coupon, promotionCode };
}

createDiscount().catch(console.error);
