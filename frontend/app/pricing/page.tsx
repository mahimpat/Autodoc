'use client';
import { useState } from 'react';
import Link from 'next/link';
import { 
  CheckIcon, 
  XMarkIcon,
  SparklesIcon,
  RocketLaunchIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import Header from '../../components/Header';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '../../components/ui';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  popular?: boolean;
  enterprise?: boolean;
  features: string[];
  limitations?: string[];
  icon: React.ReactNode;
  stripePriceId?: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for trying out AutoDoc',
    features: [
      '5 documents per day',
      '100K tokens per month',
      'Basic templates (TDD, README)',
      'Standard AI models',
      'Community support'
    ],
    limitations: [
      'Limited document history',
      'No priority support',
      'Basic export formats'
    ],
    icon: <SparklesIcon className="w-6 h-6" />
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    period: 'month',
    description: 'Best for professionals and small teams',
    popular: true,
    features: [
      'Unlimited documents',
      '1M tokens per month',
      'All premium templates',
      'Advanced AI models',
      'Priority support',
      'Custom branding',
      'Advanced export formats',
      'API access',
      'Analytics dashboard'
    ],
    icon: <RocketLaunchIcon className="w-6 h-6" />,
    stripePriceId: 'price_pro_monthly'
  },
  {
    id: 'team',
    name: 'Team',
    price: 99,
    period: 'month',
    description: 'For growing teams and organizations',
    features: [
      'Everything in Pro',
      '5M tokens per month',
      'Team collaboration',
      'Shared workspaces',
      'Advanced permissions',
      'SSO integration',
      'Custom AI training',
      'Dedicated support',
      'SLA guarantee'
    ],
    icon: <BuildingOfficeIcon className="w-6 h-6" />,
    stripePriceId: 'price_team_monthly'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    period: 'custom',
    description: 'Custom solutions for large organizations',
    enterprise: true,
    features: [
      'Custom token limits',
      'On-premise deployment',
      'Custom integrations',
      'Advanced security',
      'Compliance certifications',
      'Custom SLA',
      '24/7 dedicated support',
      'Training and onboarding'
    ],
    icon: <BuildingOfficeIcon className="w-6 h-6" />
  }
];

const faqs = [
  {
    question: 'What are tokens?',
    answer: 'Tokens are units of text processing. Roughly 1 token = 0.75 words. A typical document uses 2,000-10,000 tokens depending on length and complexity.'
  },
  {
    question: 'Can I upgrade or downgrade anytime?',
    answer: 'Yes! You can change your plan anytime. Upgrades take effect immediately, downgrades at your next billing cycle.'
  },
  {
    question: 'Do you offer refunds?',
    answer: 'We offer a 14-day money-back guarantee for all paid plans. No questions asked.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.'
  }
];

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (tierName: string, stripePriceId?: string) => {
    if (!stripePriceId) return;
    
    setIsLoading(tierName);
    
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: stripePriceId })
      });
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const getDiscountedPrice = (price: number) => {
    return billingPeriod === 'yearly' ? Math.round(price * 0.8) : price;
  };

  return (
    <div className="min-h-screen relative">
      <div className="aurora fixed inset-0 pointer-events-none" />
      <Header />
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-16">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-neutral-900 via-primary-600 to-neutral-900 dark:from-neutral-100 dark:via-primary-400 dark:to-neutral-100 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </span>
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-300 mb-8">
            Choose the perfect plan for your documentation needs. Upgrade or downgrade at any time.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Yearly
              <Badge className="ml-2 bg-success-100 text-success-700 border-success-200">
                Save 20%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid lg:grid-cols-4 gap-8 mb-20">
          {pricingTiers.map((tier) => (
            <Card 
              key={tier.id} 
              className={`relative p-6 ${
                tier.popular ? 'card-premium ring-2 ring-primary-500/20' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary-600 text-white border-0 px-4 py-1">
                    <StarIcon className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8">
                <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${
                  tier.popular ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400' :
                  tier.enterprise ? 'bg-secondary-100 text-secondary-600 dark:bg-secondary-900/50 dark:text-secondary-400' :
                  'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                }`}>
                  {tier.icon}
                </div>
                
                <CardTitle className="text-xl font-bold mb-2">{tier.name}</CardTitle>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6">
                  {tier.description}
                </p>
                
                <div className="mb-6">
                  {tier.enterprise ? (
                    <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                      Custom
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">
                          ${tier.price === 0 ? '0' : getDiscountedPrice(tier.price)}
                        </span>
                        {tier.price > 0 && (
                          <span className="text-neutral-600 dark:text-neutral-400">
                            /{billingPeriod === 'yearly' ? 'year' : tier.period}
                          </span>
                        )}
                      </div>
                      {billingPeriod === 'yearly' && tier.price > 0 && (
                        <div className="text-sm text-neutral-500 line-through">
                          ${tier.price}/{tier.period}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 text-sm">
                      <CheckIcon className="w-4 h-4 text-success-500 flex-shrink-0" />
                      <span className="text-neutral-700 dark:text-neutral-300">{feature}</span>
                    </li>
                  ))}
                  {tier.limitations?.map((limitation, index) => (
                    <li key={`limit-${index}`} className="flex items-center gap-3 text-sm">
                      <XMarkIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      <span className="text-neutral-500 dark:text-neutral-400">{limitation}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {tier.id === 'free' ? (
                  <Link href="/register">
                    <Button className="w-full" variant="outline">
                      Get Started Free
                    </Button>
                  </Link>
                ) : tier.enterprise ? (
                  <Button className="w-full" variant="outline">
                    Contact Sales
                  </Button>
                ) : (
                  <Button
                    className="w-full group"
                    variant={tier.popular ? 'primary' : 'outline'}
                    onClick={() => handleSubscribe(tier.name, tier.stripePriceId)}
                    loading={isLoading === tier.name}
                  >
                    {isLoading === tier.name ? 'Processing...' : `Start ${tier.name} Plan`}
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-neutral-900 dark:text-neutral-100">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="p-6">
                <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100 mb-3">
                  {faq.question}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {faq.answer}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20 p-12 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950/50 dark:to-secondary-950/50 rounded-2xl border border-primary-200/50 dark:border-primary-800/50">
          <h2 className="text-3xl font-bold mb-4 text-neutral-900 dark:text-neutral-100">
            Ready to Transform Your Documentation?
          </h2>
          <p className="text-xl text-neutral-600 dark:text-neutral-300 mb-8 max-w-2xl mx-auto">
            Join thousands of developers and teams who use AutoDoc to create professional documentation effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="primary" className="group">
                Start Free Trial
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}