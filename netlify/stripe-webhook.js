const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    const sig = event.headers['stripe-signature'];
    
    // Handle CORS for preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(
            event.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.log(`⚠️  Webhook signature verification failed:`, err.message);
        return { 
            statusCode: 400, 
            body: `Webhook Error: ${err.message}`,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        };
    }

    console.log('✅ Webhook received:', stripeEvent.type);

    // Handle different event types
    switch (stripeEvent.type) {
        case 'checkout.session.completed':
            await handleCheckoutCompleted(stripeEvent.data.object);
            break;
        case 'payment_intent.succeeded':
            await handlePaymentSucceeded(stripeEvent.data.object);
            break;
        case 'payment_intent.payment_failed':
            await handlePaymentFailed(stripeEvent.data.object);
            break;
        default:
            console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { 
        statusCode: 200, 
        body: JSON.stringify({ received: true }),
        headers: {
            'Access-Control-Allow-Origin': '*'
        }
    };
};

async function handleCheckoutCompleted(session) {
    console.log('🎉 Checkout completed for session:', session.id);
    console.log('Customer email:', session.customer_details?.email);
    console.log('Amount paid:', session.amount_total / 100, session.currency.toUpperCase());
    
    // Here you can:
    // 1. Send confirmation email
    // 2. Generate download links
    // 3. Update your database
    // 4. Send to analytics
    
    await fulfillOrder(session);
}

async function handlePaymentSucceeded(paymentIntent) {
    console.log('💰 Payment succeeded:', paymentIntent.id);
    console.log('Amount:', paymentIntent.amount / 100, paymentIntent.currency.toUpperCase());
}

async function handlePaymentFailed(paymentIntent) {
    console.log('❌ Payment failed:', paymentIntent.id);
    console.log('Failure reason:', paymentIntent.last_payment_error?.message);
}

async function fulfillOrder(session) {
    try {
        // Extract order details
        const customerEmail = session.customer_details?.email;
        const customerName = session.customer_details?.name;
        const amountPaid = session.amount_total / 100;
        const currency = session.currency.toUpperCase();
        
        console.log('📦 Fulfilling order for:', {
            email: customerEmail,
            name: customerName,
            amount: `${amountPaid} ${currency}`,
            sessionId: session.id
        });
        
        // TODO: Implement your fulfillment logic here:
        // - Send welcome email with download links
        // - Generate license keys
        // - Add customer to your CRM/database
        // - Send to analytics (Google Analytics, etc.)
        
        // Example: You might want to call an email service
        // await sendWelcomeEmail(customerEmail, customerName);
        
        // Example: You might want to track the conversion
        // await trackConversion(session);
        
    } catch (error) {
        console.error('Error fulfilling order:', error);
        // You might want to set up alerts for failed order fulfillments
    }
}
