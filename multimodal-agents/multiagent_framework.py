"""
Multimodal Multi-Agent Framework using Azure OpenAI Assistant API

This implementation creates a collaborative multi-agent system with:
- User Proxy Assistant (orchestrator)
- DALL-E Assistant (image generation)
- Vision Assistant (image analysis)

Based on the architecture described in the Azure OpenAI Assistant API documentation.
"""

import json
import time
import os
from typing import Dict, Optional, Any, List
from openai import AzureOpenAI
import base64
import requests
from PIL import Image
import io


class MultiAgentFramework:
    def __init__(self, 
                 azure_endpoint: str, 
                 api_key: str, 
                 api_version: str = "2024-02-15-preview",
                 assistant_deployment_name: str = "gpt-4-1106-preview"):
        """
        Initialize the Multi-Agent Framework
        
        Args:
            azure_endpoint: Azure OpenAI endpoint URL
            api_key: Azure OpenAI API key
            api_version: API version to use
            assistant_deployment_name: Model deployment name for assistants
        """
        self.client = AzureOpenAI(
            azure_endpoint=azure_endpoint,
            api_key=api_key,
            api_version=api_version
        )
        
        self.assistant_deployment_name = assistant_deployment_name
        self.assistants = {}
        self.main_thread = None
        self.agents_threads: Dict[str, Dict[str, Optional[Any]]] = {}
        
        # Available functions for assistants
        self.available_functions = {
            'send_message_to_agent': self.send_message_to_agent,
            'generate_image': self.generate_image,
            'analyze_image': self.analyze_image
        }
        
        self._initialize_assistants()
    
    def _initialize_assistants(self):
        """Initialize all assistants with their specific instructions and tools"""
        
        # User Proxy Assistant - Main orchestrator
        user_proxy_instructions = """
        You are the User Proxy Assistant, the main orchestrator for a multi-agent system.
        Your role is to coordinate between specialized agents to accomplish user tasks.
        
        Available agents:
        - dalle_assistant: Can generate images using DALL-E
        - vision_assistant: Can analyze images using GPT-4 Vision
        
        Process workflow:
        1. Analyze the user's request
        2. Determine which agents need to be involved
        3. Send messages to appropriate agents using the send_message_to_agent function
        4. Coordinate responses and iterate as needed
        5. Provide final consolidated response to user
        
        Optional Plan (for structured workflow):
        1. dalle_assistant creates and sends the image to the user_proxy agent
        2. vision_assistant analyzes images and sends feedback to the user_proxy agent
        3. dalle_assistant creates improved image based on feedback
        4. vision_assistant analyzes the improved image
        5. dalle_assistant creates final optimized image
        
        Always communicate clearly with the user about what each agent is doing.
        """
        
        user_proxy_tools = [
            {
                "type": "function",
                "function": {
                    "name": "send_message_to_agent",
                    "description": "Send a message to a specific agent to request their services",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "agent_name": {
                                "type": "string",
                                "enum": ["dalle_assistant", "vision_assistant"],
                                "description": "Name of the agent to send message to"
                            },
                            "message": {
                                "type": "string",
                                "description": "Message to send to the agent"
                            }
                        },
                        "required": ["agent_name", "message"]
                    }
                }
            }
        ]
        
        # DALL-E Assistant - Image generation specialist
        dalle_instructions = """
        You are the DALL-E Assistant, specialized in image generation.
        Your primary function is to create images based on text descriptions using DALL-E.
        
        When you receive a request:
        1. Analyze the description carefully
        2. Use the generate_image function to create the image
        3. Provide the image URL and a description of what was created
        4. If feedback is provided, use it to improve subsequent generations
        
        Focus on creating high-quality, detailed images that match the user's requirements.
        """
        
        dalle_tools = [
            {
                "type": "function",
                "function": {
                    "name": "generate_image",
                    "description": "Generate an image using DALL-E based on a text prompt",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "prompt": {
                                "type": "string",
                                "description": "Detailed text description of the image to generate"
                            },
                            "size": {
                                "type": "string",
                                "enum": ["1024x1024", "1792x1024", "1024x1792"],
                                "description": "Size of the generated image",
                                "default": "1024x1024"
                            }
                        },
                        "required": ["prompt"]
                    }
                }
            }
        ]
        
        # Vision Assistant - Image analysis specialist
        vision_instructions = """
        You are the Vision Assistant, specialized in image analysis using GPT-4 Vision.
        Your primary function is to analyze images and provide detailed feedback.
        
        When you receive an image analysis request:
        1. Carefully examine the provided image
        2. Use the analyze_image function to get detailed analysis
        3. Provide comprehensive feedback including:
           - What you see in the image
           - Quality assessment
           - Suggestions for improvement
           - Alignment with original requirements
        
        Focus on providing constructive, detailed analysis that can help improve future iterations.
        """
        
        vision_tools = [
            {
                "type": "function",
                "function": {
                    "name": "analyze_image",
                    "description": "Analyze an image using GPT-4 Vision",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "image_url": {
                                "type": "string",
                                "description": "URL of the image to analyze"
                            },
                            "analysis_prompt": {
                                "type": "string",
                                "description": "Specific aspects to analyze in the image",
                                "default": "Provide a detailed analysis of this image"
                            }
                        },
                        "required": ["image_url"]
                    }
                }
            }
        ]
        
        # Create assistants
        self.assistants['user_proxy'] = self.client.beta.assistants.create(
            name="User Proxy Assistant",
            instructions=user_proxy_instructions,
            model=self.assistant_deployment_name,
            tools=user_proxy_tools
        )
        
        self.assistants['dalle_assistant'] = self.client.beta.assistants.create(
            name="DALL-E Assistant",
            instructions=dalle_instructions,
            model=self.assistant_deployment_name,
            tools=dalle_tools
        )
        
        self.assistants['vision_assistant'] = self.client.beta.assistants.create(
            name="Vision Assistant",
            instructions=vision_instructions,
            model=self.assistant_deployment_name,
            tools=vision_tools
        )
        
        # Initialize agent threads tracking
        self.agents_threads = {
            "dalle_assistant": {"agent": self.assistants['dalle_assistant'], "thread": None},
            "vision_assistant": {"agent": self.assistants['vision_assistant'], "thread": None}
        }
        
        print("✅ All assistants initialized successfully!")
    
    def send_message_to_agent(self, agent_name: str, message: str) -> str:
        """
        Send a message to a specific agent and get their response
        
        Args:
            agent_name: Name of the target agent
            message: Message to send
            
        Returns:
            Agent's response
        """
        if agent_name not in self.agents_threads:
            return f"Error: Agent '{agent_name}' not found"
        
        recipient_info = self.agents_threads[agent_name]
        
        # Create a new thread if it doesn't exist
        if not recipient_info["thread"]:
            thread_object = self.client.beta.threads.create()
            recipient_info["thread"] = thread_object
            print(f"🔗 Created new thread between User Proxy and {agent_name}")
        
        # Send message to agent
        response = self.dispatch_message(message, recipient_info["agent"], recipient_info["thread"])
        return response
    
    def generate_image(self, prompt: str, size: str = "1024x1024") -> str:
        """
        Generate an image using DALL-E
        
        Args:
            prompt: Text description for image generation
            size: Image size
            
        Returns:
            Generated image URL
        """
        try:
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size=size,
                quality="standard",
                n=1
            )
            
            image_url = response.data[0].url
            print(f"🎨 Generated image: {image_url}")
            return f"Image generated successfully! URL: {image_url}"
            
        except Exception as e:
            error_msg = f"Error generating image: {str(e)}"
            print(f"❌ {error_msg}")
            return error_msg
    
    def analyze_image(self, image_url: str, analysis_prompt: str = "Provide a detailed analysis of this image") -> str:
        """
        Analyze an image using GPT-4 Vision
        
        Args:
            image_url: URL of the image to analyze
            analysis_prompt: Specific analysis instructions
            
        Returns:
            Image analysis results
        """
        try:
            response = self.client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": analysis_prompt},
                            {"type": "image_url", "image_url": {"url": image_url}}
                        ]
                    }
                ],
                max_tokens=500
            )
            
            analysis = response.choices[0].message.content
            print(f"👁️ Image analysis completed")
            return f"Image analysis: {analysis}"
            
        except Exception as e:
            error_msg = f"Error analyzing image: {str(e)}"
            print(f"❌ {error_msg}")
            return error_msg
    
    def dispatch_message(self, message: str, agent: Any, thread: Any) -> str:
        """
        Dispatch a message to an agent and handle the response
        
        Args:
            message: Message to send
            agent: Target agent object
            thread: Thread object for communication
            
        Returns:
            Agent's response
        """
        try:
            # Create message in thread
            self.client.beta.threads.messages.create(
                thread_id=thread.id,
                role="user",
                content=message
            )
            
            # Create and run the assistant
            run = self.client.beta.threads.runs.create(
                thread_id=thread.id,
                assistant_id=agent.id
            )
            
            # Wait for completion and handle tool calls
            while run.status in ['queued', 'in_progress', 'requires_action']:
                time.sleep(1)
                run = self.client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
                
                if run.status == "requires_action":
                    tool_calls = run.required_action.submit_tool_outputs.tool_calls
                    tool_outputs = []
                    
                    for tool_call in tool_calls:
                        if tool_call.type == "function":
                            function_name = tool_call.function.name
                            function_args = json.loads(tool_call.function.arguments)
                            
                            if function_name in self.available_functions:
                                function_to_call = self.available_functions[function_name]
                                tool_response = function_to_call(**function_args)
                                tool_outputs.append({
                                    "tool_call_id": tool_call.id,
                                    "output": tool_response
                                })
                    
                    # Submit tool outputs
                    run = self.client.beta.threads.runs.submit_tool_outputs(
                        thread_id=thread.id,
                        run_id=run.id,
                        tool_outputs=tool_outputs
                    )
            
            if run.status == 'completed':
                # Retrieve the latest message
                messages = self.client.beta.threads.messages.list(thread_id=thread.id)
                latest_message = messages.data[0]
                return latest_message.content[0].text.value
            else:
                return f"Run completed with status: {run.status}"
                
        except Exception as e:
            error_msg = f"Error dispatching message: {str(e)}"
            print(f"❌ {error_msg}")
            return error_msg
    
    def start_conversation(self) -> str:
        """
        Start the main conversation thread with the User Proxy Assistant
        
        Returns:
            Thread ID
        """
        self.main_thread = self.client.beta.threads.create()
        print(f"🚀 Main conversation thread created: {self.main_thread.id}")
        return self.main_thread.id
    
    def send_user_message(self, message: str) -> str:
        """
        Send a message from the user to the User Proxy Assistant
        
        Args:
            message: User's message
            
        Returns:
            Assistant's response
        """
        if not self.main_thread:
            self.start_conversation()
        
        print(f"👤 User: {message}")
        response = self.dispatch_message(message, self.assistants['user_proxy'], self.main_thread)
        print(f"🤖 Assistant: {response}")
        return response
    
    def cleanup(self):
        """Clean up created assistants"""
        try:
            for name, assistant in self.assistants.items():
                self.client.beta.assistants.delete(assistant.id)
                print(f"🗑️ Deleted assistant: {name}")
        except Exception as e:
            print(f"❌ Error during cleanup: {str(e)}")


# Example usage and demo
def main():
    """
    Demo of the Multi-Agent Framework
    """
    # Initialize with your Azure OpenAI credentials
    # These should be set as environment variables
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "your-endpoint-here")
    api_key = os.getenv("AZURE_OPENAI_API_KEY", "your-api-key-here")
    
    if azure_endpoint == "your-endpoint-here" or api_key == "your-api-key-here":
        print("❌ Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY environment variables")
        return
    
    # Create the multi-agent framework
    framework = MultiAgentFramework(
        azure_endpoint=azure_endpoint,
        api_key=api_key
    )
    
    try:
        # Start conversation
        framework.start_conversation()
        
        # Example interaction
        user_query = "Create a beautiful landscape image of a sunset over mountains, then analyze it for quality and suggest improvements"
        
        print("=" * 60)
        print("MULTI-AGENT FRAMEWORK DEMO")
        print("=" * 60)
        
        response = framework.send_user_message(user_query)
        
        print("\n" + "=" * 60)
        print("Demo completed!")
        print("=" * 60)
        
    except KeyboardInterrupt:
        print("\n⏹️ Demo interrupted by user")
    except Exception as e:
        print(f"❌ Error during demo: {str(e)}")
    finally:
        # Cleanup
        framework.cleanup()


if __name__ == "__main__":
    main()

