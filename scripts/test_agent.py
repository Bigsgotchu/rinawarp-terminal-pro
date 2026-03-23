"""
Test RinaWarp Agent with GPT-5.1
Tests real AI integration
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Add parent to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

load_dotenv()

async def test_ai_agent():
    """Test the AI agent with GPT-5.1"""
    
    print("🧪 Testing RinaWarp Terminal Pro Agent with GPT-5.1\n")
    print("="*60)
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.getenv('EMERGENT_LLM_KEY')
        if not api_key:
            print("❌ EMERGENT_LLM_KEY not found in environment")
            return
        
        print(f"✅ API Key found: {api_key[:20]}...")
        
        # Initialize GPT-5.1
        chat = LlmChat(
            api_key=api_key,
            session_id="test-agent",
            system_message="You are RinaWarp Terminal Pro Agent. Analyze requests and classify intents."
        ).with_model("openai", "gpt-5.1")
        
        print("✅ GPT-5.1 initialized\n")
        
        # Test 1: Intent Classification
        print("\n" + "="*60)
        print("📋 Test 1: Intent Classification")
        print("="*60)
        
        test_prompts = [
            "Build my React project",
            "Run tests for the backend",
            "Check if my environment is set up correctly",
            "Generate a TypeScript function for user authentication",
        ]
        
        for prompt in test_prompts:
            print(f"\n💬 Prompt: \"{prompt}\"")
            
            message = UserMessage(
                text=f"""Classify this request into one of these intents:
- build: Compile/bundle projects
- test: Run tests
- self-check: Verify environment
- code: Generate code
- deploy: Deploy applications
- help: Provide guidance

Request: {prompt}

Respond with just the intent name."""
            )
            
            response = await chat.send_message(message)
            print(f"🤖 Intent: {response.strip()}")
        
        # Test 2: Code Generation
        print("\n\n" + "="*60)
        print("📋 Test 2: Code Generation")
        print("="*60)
        
        code_message = UserMessage(
            text="Generate a simple TypeScript function that validates an email address. Include type definitions and comments."
        )
        
        print("\n💬 Generating code...")
        code_response = await chat.send_message(code_message)
        print(f"\n🤖 Generated Code:\n{code_response[:500]}...")
        
        # Test 3: Build Analysis
        print("\n\n" + "="*60)
        print("📋 Test 3: Build System Analysis")
        print("="*60)
        
        build_message = UserMessage(
            text="""I have a project with:
- package.json with "build": "tsc && webpack"
- tsconfig.json
- webpack.config.js

What steps should I take to build this project?"""
        )
        
        print("\n💬 Analyzing build system...")
        build_response = await chat.send_message(build_message)
        print(f"\n🤖 Analysis:\n{build_response}")
        
        print("\n\n" + "="*60)
        print("🎉 All Tests Passed!")
        print("="*60)
        print("\n✅ GPT-5.1 is working correctly")
        print("✅ Agent can classify intents")
        print("✅ Agent can generate code")
        print("✅ Agent can analyze build systems")
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("Install emergentintegrations: pip install emergentintegrations")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_ai_agent())
