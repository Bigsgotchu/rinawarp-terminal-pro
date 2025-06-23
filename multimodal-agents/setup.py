#!/usr/bin/env python3
"""
Setup script for the Multimodal Multi-Agent Framework

This script helps with initial setup and configuration.
"""

import os
import sys
import subprocess

def install_requirements():
    """Install required packages"""
    print("📦 Installing required packages...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing requirements: {e}")
        return False

def setup_environment():
    """Setup environment configuration"""
    print("\n🔧 Setting up environment configuration...")
    
    env_file = ".env"
    template_file = ".env.template"
    
    if os.path.exists(env_file):
        print("✅ .env file already exists")
        return True
    
    if not os.path.exists(template_file):
        print("❌ .env.template file not found")
        return False
    
    try:
        # Copy template to .env
        with open(template_file, 'r') as template:
            content = template.read()
        
        with open(env_file, 'w') as env:
            env.write(content)
        
        print(f"✅ Created {env_file} from template")
        print("⚠️  Please edit .env file with your Azure OpenAI credentials")
        return True
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    print("🐍 Checking Python version...")
    
    version = sys.version_info
    if version.major == 3 and version.minor >= 8:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} is not supported")
        print("   Please use Python 3.8 or higher")
        return False

def check_credentials():
    """Check if credentials are configured"""
    print("\n🔑 Checking Azure OpenAI credentials...")
    
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")
        api_key = os.getenv("AZURE_OPENAI_API_KEY", "")
        
        if not endpoint or endpoint == "your-azure-openai-endpoint-here":
            print("⚠️  AZURE_OPENAI_ENDPOINT not configured")
            return False
        
        if not api_key or api_key == "your-azure-openai-api-key-here":
            print("⚠️  AZURE_OPENAI_API_KEY not configured")
            return False
        
        print("✅ Azure OpenAI credentials are configured")
        return True
        
    except ImportError:
        print("⚠️  python-dotenv not installed, cannot check credentials")
        return False
    except Exception as e:
        print(f"❌ Error checking credentials: {e}")
        return False

def test_framework():
    """Test if the framework can be imported"""
    print("\n🧪 Testing framework import...")
    
    try:
        from multiagent_framework import MultiAgentFramework
        print("✅ Framework imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Error importing framework: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Multimodal Multi-Agent Framework Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install requirements
    if not install_requirements():
        print("❌ Setup failed: Could not install requirements")
        sys.exit(1)
    
    # Setup environment
    if not setup_environment():
        print("❌ Setup failed: Could not setup environment")
        sys.exit(1)
    
    # Test framework import
    if not test_framework():
        print("❌ Setup failed: Could not import framework")
        sys.exit(1)
    
    # Check credentials
    credentials_ok = check_credentials()
    
    print("\n" + "=" * 50)
    print("🎉 Setup completed!")
    print("=" * 50)
    
    if credentials_ok:
        print("✅ Your framework is ready to use!")
        print("\nNext steps:")
        print("1. Run: python demo.py")
        print("2. Or open: jupyter lab multiagent_framework.ipynb")
    else:
        print("⚠️  Please configure your Azure OpenAI credentials:")
        print("1. Edit the .env file with your credentials")
        print("2. Then run: python demo.py")
    
    print("\n📖 For more information, see README.md")

if __name__ == "__main__":
    main()

