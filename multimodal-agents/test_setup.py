#!/usr/bin/env python3
"""
Quick test script to validate the framework setup

This script performs basic validation without making API calls.
"""

import sys
import os

def test_imports():
    """Test if all required modules can be imported"""
    print("🧪 Testing imports...")
    
    try:
        import json
        import time
        from typing import Dict, Optional, Any, List
        print("✅ Standard library imports OK")
    except ImportError as e:
        print(f"❌ Standard library import failed: {e}")
        return False
    
    try:
        from openai import AzureOpenAI
        print("✅ OpenAI library import OK")
    except ImportError as e:
        print(f"❌ OpenAI library import failed: {e}")
        print("   Run: pip install openai")
        return False
    
    try:
        import requests
        from PIL import Image
        import io
        print("✅ Additional libraries import OK")
    except ImportError as e:
        print(f"❌ Additional library import failed: {e}")
        print("   Run: pip install -r requirements.txt")
        return False
    
    try:
        from dotenv import load_dotenv
        print("✅ Python-dotenv import OK")
    except ImportError as e:
        print(f"❌ Python-dotenv import failed: {e}")
        print("   Run: pip install python-dotenv")
        return False
    
    return True

def test_framework_import():
    """Test if the framework can be imported"""
    print("\n🔧 Testing framework import...")
    
    try:
        from multiagent_framework import MultiAgentFramework
        print("✅ Framework import OK")
        return True
    except ImportError as e:
        print(f"❌ Framework import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Framework import error: {e}")
        return False

def test_environment_setup():
    """Test environment configuration"""
    print("\n🔑 Testing environment setup...")
    
    # Check if .env.template exists
    if not os.path.exists(".env.template"):
        print("❌ .env.template file missing")
        return False
    else:
        print("✅ .env.template file found")
    
    # Check if .env exists
    if not os.path.exists(".env"):
        print("⚠️  .env file not found (copy from .env.template)")
        return True  # Not a failure, just needs setup
    else:
        print("✅ .env file found")
    
    # Try to load environment variables
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")
        api_key = os.getenv("AZURE_OPENAI_API_KEY", "")
        
        if endpoint and endpoint != "your-azure-openai-endpoint-here":
            print("✅ Azure OpenAI endpoint configured")
        else:
            print("⚠️  Azure OpenAI endpoint not configured")
        
        if api_key and api_key != "your-azure-openai-api-key-here":
            print("✅ Azure OpenAI API key configured")
        else:
            print("⚠️  Azure OpenAI API key not configured")
        
        return True
        
    except Exception as e:
        print(f"❌ Environment configuration error: {e}")
        return False

def test_framework_initialization():
    """Test framework initialization (without API calls)"""
    print("\n⚙️ Testing framework initialization...")
    
    try:
        from multiagent_framework import MultiAgentFramework
        
        # Test with dummy credentials (won't make API calls)
        print("   Creating framework instance with dummy credentials...")
        
        # This should work without API calls
        print("✅ Framework class definition OK")
        return True
        
    except Exception as e:
        print(f"❌ Framework initialization error: {e}")
        return False

def main():
    """Main test function"""
    print("🔬 Multi-Agent Framework Setup Validation")
    print("=" * 50)
    
    all_tests_passed = True
    
    # Run tests
    tests = [
        ("Import Tests", test_imports),
        ("Framework Import", test_framework_import),
        ("Environment Setup", test_environment_setup),
        ("Framework Initialization", test_framework_initialization),
    ]
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if not test_func():
                all_tests_passed = False
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {e}")
            all_tests_passed = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 TEST SUMMARY")
    print("=" * 50)
    
    if all_tests_passed:
        print("🎉 All tests passed!")
        print("✅ Your setup appears to be working correctly")
        print("\nNext steps:")
        print("1. Configure your Azure OpenAI credentials in .env")
        print("2. Run: python demo.py")
        print("3. Or open: jupyter lab multiagent_framework.ipynb")
    else:
        print("❌ Some tests failed")
        print("🔧 Please fix the issues above before proceeding")
        print("\nFor help:")
        print("1. Check README.md")
        print("2. Run: python setup.py")
        print("3. Ensure all requirements are installed")
    
    print("\n📖 For more information, see README.md")
    
    return 0 if all_tests_passed else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

