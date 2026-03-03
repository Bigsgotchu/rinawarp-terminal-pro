import { useState } from "react";
import { 
  Truck, 
  Leaf, 
  Mountain, 
  Droplets, 
  Zap, 
  Shield,
  Mail,
  Menu,
  X,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Controlled Discharge",
      description: "Gradual and precise material release for accurate unloading"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Ergonomic Design",
      description: "Reduces physical strain with manual operation"
    },
    {
      icon: <CheckCircle2 className="w-6 h-6" />,
      title: "Multi-Purpose",
      description: "Handles soil, mulch, gravel, and landscaping materials"
    }
  ];

  const materials = [
    { icon: <Leaf className="w-8 h-8" />, name: "Soil", color: "bg-amber-700" },
    { icon: <Mountain className="w-8 h-8" />, name: "Mulch", color: "bg-amber-900" },
    { icon: <Droplets className="w-8 h-8" />, name: "Gravel", color: "bg-stone-500" },
    { icon: <Truck className="w-8 h-8" />, name: "Landscaping", color: "bg-green-700" }
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Truck className="w-8 h-8 text-amber-700" />
              <span className="ml-2 text-xl font-bold text-stone-800">Belly Dump</span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-stone-600 hover:text-stone-900 transition-colors">Features</a>
              <a href="#materials" className="text-stone-600 hover:text-stone-900 transition-colors">Materials</a>
              <a href="#contact" className="text-stone-600 hover:text-stone-900 transition-colors">Contact</a>
              <a 
                href="#contact" 
                className="bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800 transition-colors flex items-center"
              >
                Get Updates
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button 
              type="button"
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-stone-200">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-stone-600 hover:text-stone-900" onClick={() => setIsMenuOpen(false)}>Features</a>
              <a href="#materials" className="block text-stone-600 hover:text-stone-900" onClick={() => setIsMenuOpen(false)}>Materials</a>
              <a href="#contact" className="block text-stone-600 hover:text-stone-900" onClick={() => setIsMenuOpen(false)}>Contact</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-50 to-stone-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-amber-600 rounded-full mr-2 animate-pulse"></span>
              Founders Run Coming Soon
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 mb-6 tracking-tight">
              The Smarter Way to
              <span className="block text-amber-700">Move Materials</span>
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              Belly Dump is a manually operated garden utility wagon designed for controlled, 
              precise material discharge. Say goodbye to heavy lifting and messy spills.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="#contact"
                className="bg-amber-700 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-amber-800 transition-all shadow-lg hover:shadow-xl"
              >
                Join the Waitlist
              </a>
              <a 
                href="#features"
                className="bg-white text-stone-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-stone-50 transition-all border border-stone-200"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Product Visual */}
          <div className="mt-16 relative">
            <div className="bg-gradient-to-r from-stone-200 to-stone-300 rounded-3xl p-8 sm:p-12">
              <div className="bg-stone-800 rounded-2xl p-6 sm:p-10 text-center">
                <div className="w-32 h-32 mx-auto bg-amber-700 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
                  <Truck className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Belly Dump</h3>
                <p className="text-stone-400">Controlled Material Handling Wagon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              Why Choose Belly Dump?
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Designed for homeowners and landscaping professionals who demand precision and ease of use.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-stone-50 rounded-2xl p-8 hover:bg-amber-50 transition-colors border border-stone-100"
              >
                <div className="w-12 h-12 bg-amber-700 rounded-xl flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">{feature.title}</h3>
                <p className="text-stone-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Materials Section */}
      <section id="materials" className="py-20 px-4 sm:px-6 lg:px-8 bg-stone-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              Handles Any Material
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              From garden soil to gravel, Belly Dump handles it all with precision control.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {materials.map((material, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className={`w-16 h-16 ${material.color} rounded-xl flex items-center justify-center text-white mx-auto mb-4`}>
                  {material.icon}
                </div>
                <h3 className="font-semibold text-stone-900">{material.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-amber-700">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Perfect for Residential & Light Commercial Use
              </h2>
              <ul className="space-y-4">
                {[
                  "Reduce physical strain during landscaping projects",
                  "Precise material discharge eliminates waste",
                  "Easy to maneuver in tight spaces",
                  "Durable construction for long-lasting use",
                  "No power source required - fully manual"
                ].map((item, index) => (
                  <li key={index} className="flex items-start text-white">
                    <CheckCircle2 className="w-5 h-5 mr-3 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-white mb-2">🎯</div>
                <p className="text-amber-100 text-lg">
                  "Finally, a way to unload materials without making a mess or throwing out my back!"
                </p>
                <p className="text-amber-200 mt-4">— Early Beta Tester</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
            Be the First to Know
          </h2>
          <p className="text-lg text-stone-600 mb-8">
            Our Founders Run is in preparation. Sign up to get exclusive early access and updates.
          </p>
          
          <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200">
            <div className="flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-amber-700 mr-2" />
              <span className="text-stone-700 font-medium">bellydumpofficial@gmail.com</span>
            </div>
            <p className="text-sm text-stone-500">
              Have questions? Reach out to us directly!
            </p>
          </div>

          <div className="mt-8 text-sm text-stone-500">
            <p>© 2026 Belly Dump. All rights reserved.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <Truck className="w-6 h-6 text-amber-700" />
            <span className="ml-2 text-lg font-bold text-white">Belly Dump</span>
          </div>
          <p className="text-sm">Controlled Material Handling Wagon</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
