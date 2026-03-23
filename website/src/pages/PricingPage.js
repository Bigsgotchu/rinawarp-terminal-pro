import React from 'react';
import { Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PricingPage() {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out RinaWarp',
      features: [
        { text: '10 runs per month', included: true },
        { text: 'Local agent execution', included: true },
        { text: 'Receipt verification', included: true },
        { text: 'Community support', included: true },
        { text: 'Remote agents', included: false },
        { text: 'Priority support', included: false },
      ],
      cta: 'Download Free',
      popular: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      description: 'For professional developers',
      features: [
        { text: 'Unlimited runs', included: true },
        { text: 'Local & remote agents', included: true },
        { text: 'Receipt verification', included: true },
        { text: 'Priority support', included: true },
        { text: 'Team collaboration', included: true },
        { text: 'Advanced diagnostics', included: true },
      ],
      cta: 'Start Pro Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For teams and organizations',
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Dedicated infrastructure', included: true },
        { text: 'SLA guarantees', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'On-premise deployment', included: true },
        { text: '24/7 support', included: true },
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen py-20 px-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you need more power
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              data-testid={`plan-${plan.name.toLowerCase()}`}
              className={`glass p-8 rounded-2xl relative ${
                plan.popular ? 'border-[#4dd4d4]/50' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#4dd4d4] to-[#3ac4c4] rounded-full text-sm font-semibold text-black">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground ml-2">/ {plan.period}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-center space-x-3">
                    {feature.included ? (
                      <Check size={18} className="text-[#4dd4d4] flex-shrink-0" />
                    ) : (
                      <X size={18} className="text-muted-foreground flex-shrink-0" />
                    )}
                    <span
                      className={feature.included ? 'text-foreground' : 'text-muted-foreground'}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate('/download')}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  plan.popular
                    ? 'bg-gradient-to-r from-[#ff5a78] to-[#ff3d5e] text-white hover:shadow-lg hover:shadow-[#ff5a78]/30'
                    : 'glass hover:border-[#4dd4d4]/30'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Can I try Pro for free?',
                a: 'Yes! Pro includes a 14-day free trial. No credit card required.',
              },
              {
                q: 'What happens when I reach the run limit?',
                a: 'On the Free plan, you\'ll need to wait until next month or upgrade to Pro for unlimited runs.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Absolutely. Cancel anytime from your account dashboard. No questions asked.',
              },
              {
                q: 'Do you offer discounts for students or open source?',
                a: 'Yes! Contact us at support@rinawarp.com with proof of student status or your open source project.',
              },
            ].map((faq, index) => (
              <div key={index} className="glass p-6 rounded-xl">
                <h3 className="font-semibold mb-2 text-[#4dd4d4]">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
