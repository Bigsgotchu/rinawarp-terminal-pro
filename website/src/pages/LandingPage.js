import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Shield, RotateCcw, Zap, Terminal, Check } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: 'Proof-First Execution',
      description: 'Every action generates cryptographic receipts. Full audit trail with SHA-256 proofs.',
    },
    {
      icon: RotateCcw,
      title: 'Receipt-Backed Recovery',
      description: 'Never lose progress. Resume failed runs from the last verified checkpoint.',
    },
    {
      icon: Terminal,
      title: 'Local & Remote Agents',
      description: 'Run agents locally for privacy or connect to hosted infrastructure for scale.',
    },
    {
      icon: Zap,
      title: 'Build, Test, Deploy',
      description: 'Integrated workflows for the complete development lifecycle.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_electron-agent-hub/artifacts/hygsyojc_rinawarpterminallogo.png" 
                alt="RinaWarp Technologies" 
                className="h-10 w-auto"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255, 0, 128, 0.5))' }}
              />
              <div>
                <h1 className="text-xl font-bold infinity-gradient">
                  RinaWarp
                </h1>
                <span className="text-xs text-muted-foreground">Terminal Pro</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm hover:text-[#00d4ff] transition">
                Features
              </a>
              <a href="#pricing" onClick={() => navigate('/pricing')} className="text-sm hover:text-[#00d4ff] transition cursor-pointer">
                Pricing
              </a>
              <button
                onClick={() => navigate('/download')}
                className="px-4 py-2 bg-gradient-infinity rounded-lg font-medium shadow-neon-gradient hover:shadow-neon-cyan transition"
                style={{ 
                  background: 'linear-gradient(90deg, #ff0080 0%, #ff8800 50%, #00d4ff 100%)',
                  color: '#000'
                }}
              >
                Download
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-block mb-6 px-4 py-2 glass rounded-full">
            <span className="text-sm text-[#4dd4d4]">✨ Proof-First AI Agent Workbench</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Get Technical Work Done
            <br />
            <span className="text-[#4dd4d4]">With Verified Receipts</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            RinaWarp Terminal Pro is a desktop AI agent workbench that helps you build, test, deploy, and
            recover technical work through cryptographically verified runs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              data-testid="hero-download-button"
              onClick={() => navigate('/download')}
              className="px-8 py-4 bg-gradient-to-r from-[#ff5a78] to-[#ff3d5e] text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-[#ff5a78]/40 transition flex items-center space-x-2"
            >
              <Download size={20} />
              <span>Download for Free</span>
            </button>
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 glass rounded-xl font-semibold text-lg hover:border-[#4dd4d4]/50 transition"
            >
              Learn More
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            macOS • Windows • Linux • Free Trial • No Credit Card Required
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-gradient-to-b from-transparent to-black/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why RinaWarp Terminal Pro?</h2>
            <p className="text-xl text-muted-foreground">Built for developers who need proof, not promises</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  data-testid={`feature-${index}`}
                  className="glass p-8 rounded-2xl hover:border-[#4dd4d4]/30 transition group"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#4dd4d4] to-[#3ac4c4] flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-[#4dd4d4]/30 transition">
                    <Icon size={24} className="text-black" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Simple workflow, powerful results</p>
          </div>
          <div className="space-y-12">
            {[
              { step: '01', title: 'Describe Your Task', desc: 'Write what you want to accomplish in plain language' },
              { step: '02', title: 'Agent Executes', desc: 'Local or remote agent breaks down and executes your task step-by-step' },
              { step: '03', title: 'Receipts Generate', desc: 'Each action produces a cryptographic proof - full audit trail' },
              { step: '04', title: 'Recover Anytime', desc: 'If something fails, resume from the last verified checkpoint' },
            ].map((item, index) => (
              <div key={index} className="flex items-start space-x-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-[#ff5a78] to-[#ff3d5e] flex items-center justify-center text-2xl font-bold">
                  {item.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-lg text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6 bg-gradient-to-b from-black/20 to-transparent">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-12">Trusted by Developers Worldwide</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { metric: '10K+', label: 'Active Users' },
              { metric: '50K+', label: 'Verified Runs' },
              { metric: '99.9%', label: 'Uptime' },
            ].map((stat, index) => (
              <div key={index} className="glass p-8 rounded-2xl">
                <div className="text-4xl font-bold text-[#4dd4d4] mb-2">{stat.metric}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="glass p-12 rounded-3xl text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Download RinaWarp Terminal Pro and start building with verified, recoverable agent runs.
            </p>
            <button
              data-testid="cta-download-button"
              onClick={() => navigate('/download')}
              className="px-10 py-5 bg-gradient-to-r from-[#ff5a78] to-[#ff3d5e] text-white rounded-xl font-bold text-xl hover:shadow-2xl hover:shadow-[#ff5a78]/40 transition inline-flex items-center space-x-3"
            >
              <Download size={24} />
              <span>Download Now - It's Free</span>
            </button>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • Free trial included • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">
                <span className="text-[#ff5a78]">Rina</span>
                <span className="text-[#4dd4d4]">Warp</span>
              </h3>
              <p className="text-sm text-muted-foreground">Proof-first AI agent workbench</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-[#4dd4d4] transition">Features</a></li>
                <li><a href="/pricing" className="hover:text-[#4dd4d4] transition">Pricing</a></li>
                <li><a href="/download" className="hover:text-[#4dd4d4] transition">Download</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-[#4dd4d4] transition">Documentation</a></li>
                <li><a href="/account" className="hover:text-[#4dd4d4] transition">Account</a></li>
                <li><a href="#" className="hover:text-[#4dd4d4] transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-[#4dd4d4] transition">Privacy</a></li>
                <li><a href="#" className="hover:text-[#4dd4d4] transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-center text-sm text-muted-foreground">
            © 2026 RinaWarp. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
