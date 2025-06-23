#!/usr/bin/env python3
"""
Simple demo script for the Multimodal Multi-Agent Framework

This script demonstrates basic usage of the framework with predefined examples.
"""

import os
import sys
from dotenv import load_dotenv
from multiagent_framework import MultiAgentFramework

def main():
    """Run a simple demo of the multi-agent framework"""
    
    print("🚀 Multimodal Multi-Agent Framework Demo")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Get Azure OpenAI credentials
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    
    # Validate credentials
    if not azure_endpoint or not api_key:
        print("❌ Error: Azure OpenAI credentials not found!")
        print("Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY environment variables.")
        print("You can copy .env.template to .env and fill in your values.")
        sys.exit(1)
    
    if azure_endpoint == "your-azure-openai-endpoint-here" or api_key == "your-azure-openai-api-key-here":
        print("❌ Error: Please update your .env file with actual Azure OpenAI credentials!")
        sys.exit(1)
    
    print(f"✅ Using endpoint: {azure_endpoint[:50]}...")
    print("✅ API key configured")
    
    try:
        # Initialize the framework
        print("\n📋 Initializing Multi-Agent Framework...")
        framework = MultiAgentFramework(
            azure_endpoint=azure_endpoint,
            api_key=api_key
        )
        
        # Start conversation
        print("\n🗣️ Starting conversation thread...")
        framework.start_conversation()
        
        # Demo scenarios
        demo_scenarios = [
            {
                "name": "Simple Image Generation",
                "query": "Generate an image of a peaceful mountain lake at sunrise with reflection in the water"
            },
            {
                "name": "Multi-Agent Collaboration", 
                "query": "Create an artistic image of a futuristic city, then analyze its visual quality and suggest improvements"
            },
            {
                "name": "Iterative Improvement",
                "query": "Generate a logo design for a tech startup, analyze it, and create an improved version based on the feedback"
            }
        ]
        
        # Run demos
        for i, scenario in enumerate(demo_scenarios, 1):
            print(f"\n🎯 Demo {i}: {scenario['name']}")
            print("-" * 40)
            print(f"Query: {scenario['query']}")
            print("\n⏳ Processing...")
            
            try:
                response = framework.send_user_message(scenario['query'])
                print(f"✅ Completed successfully!")
                print(f"Response length: {len(response)} characters")
                
                # Show first part of response
                if len(response) > 200:
                    print(f"Response preview: {response[:200]}...")
                else:
                    print(f"Response: {response}")
                    
            except Exception as e:
                print(f"❌ Error in scenario {i}: {str(e)}")
            
            if i < len(demo_scenarios):
                input("\nPress Enter to continue to next demo...")
        
        print(f"\n🎉 All demos completed!")
        
    except KeyboardInterrupt:
        print("\n⏹️ Demo interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        print("Please check your Azure OpenAI configuration and try again.")
    finally:
        # Cleanup
        try:
            framework.cleanup()
            print("\n🧹 Cleanup completed successfully!")
        except:
            print("\n⚠️ Warning: Could not complete cleanup")
    
    print("\n👋 Demo finished!")

if __name__ == "__main__":
    main()

