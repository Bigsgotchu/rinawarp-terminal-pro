# Multimodal Multi-Agent Framework with Azure OpenAI Assistant API

A sophisticated collaborative AI system that demonstrates the power of multi-agent architectures using Azure OpenAI's Assistant API. This framework creates specialized AI agents that work together to accomplish complex multimodal tasks involving image generation, analysis, and iterative improvement.

## 🌟 Features

- **Multi-Agent Architecture**: Three specialized agents working in harmony
  - **User Proxy Assistant**: Main orchestrator and communication hub
  - **DALL-E Assistant**: Expert in image generation using DALL-E 3
  - **Vision Assistant**: Specialist in image analysis using GPT-4 Vision

- **Persistent Threading**: Agents maintain conversation context across interactions
- **Function Calling**: Agents can invoke specialized functions and tools
- **Inter-Agent Communication**: Seamless message passing between agents
- **Error Handling**: Robust error management and debugging capabilities
- **Resource Management**: Automatic cleanup of Azure resources

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Proxy    │◄──►│  DALL-E Assistant │    │ Vision Assistant│
│   Assistant     │    │                  │    │                 │
│ (Orchestrator)  │    │ (Image Generator)│    │ (Image Analyzer)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                        ┌─────────────────┐
                        │ Persistent      │
                        │ Threaded        │
                        │ Conversations   │
                        └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Azure OpenAI Service access with:
  - GPT-4 deployment (for assistants)
  - DALL-E 3 deployment (for image generation)
  - GPT-4 Vision deployment (for image analysis)

### Installation

1. **Clone or download this project**:
   ```bash
   git clone <repository-url>
   cd multimodal-agents
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```bash
   cp .env.template .env
   # Edit .env with your Azure OpenAI credentials
   ```

4. **Run the demo**:
   ```bash
   python demo.py
   ```

### Environment Configuration

Create a `.env` file with your Azure OpenAI credentials:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
```

## 📖 Usage Examples

### Basic Usage

```python
from multiagent_framework import MultiAgentFramework

# Initialize the framework
framework = MultiAgentFramework(
    azure_endpoint="your-endpoint",
    api_key="your-api-key"
)

# Start a conversation
framework.start_conversation()

# Send a request that requires multiple agents
response = framework.send_user_message(
    "Create a landscape image, analyze its quality, and suggest improvements"
)

# Cleanup when done
framework.cleanup()
```

### Interactive Conversation

```python
# Interactive loop
while True:
    user_input = input("You: ")
    if user_input.lower() == 'quit':
        break
    
    response = framework.send_user_message(user_input)
    print(f"Assistant: {response}")
```

### Direct Agent Communication

```python
# Send message directly to a specific agent
dalle_response = framework.send_message_to_agent(
    "dalle_assistant",
    "Create an abstract art piece with vibrant colors"
)

# Analyze an existing image
vision_response = framework.send_message_to_agent(
    "vision_assistant", 
    "Analyze this image: https://example.com/image.jpg"
)
```

## 🎯 Example Workflows

### 1. Simple Image Generation
```
User → "Generate a futuristic city skyline"
User Proxy → DALL-E Assistant → Image Generated → User
```

### 2. Image Generation with Analysis
```
User → "Create and analyze a landscape image"
User Proxy → DALL-E Assistant → Image Generated
User Proxy → Vision Assistant → Analysis Complete → User
```

### 3. Iterative Improvement
```
User → "Create an image, analyze it, and improve it"
User Proxy → DALL-E Assistant → Initial Image
User Proxy → Vision Assistant → Analysis & Feedback
User Proxy → DALL-E Assistant → Improved Image → User
```

## 📁 Project Structure

```
multimodal-agents/
├── multiagent_framework.py    # Main framework implementation
├── multiagent_framework.ipynb # Jupyter notebook with examples
├── demo.py                   # Simple demo script
├── requirements.txt          # Python dependencies
├── .env.template            # Environment configuration template
└── README.md               # This file
```

## 🔧 Advanced Configuration

### Custom Agent Instructions

You can customize agent behavior by modifying their instructions:

```python
# Example: Custom DALL-E assistant with specific style
dalle_instructions = """
You are a specialized DALL-E assistant focused on creating 
minimalist, modern art pieces. Always emphasize clean lines,
limited color palettes, and geometric shapes.
"""
```

### Adding New Agents

Extend the framework by adding new specialized agents:

```python
# Example: Code generation agent
code_assistant = client.beta.assistants.create(
    name="Code Assistant",
    instructions="You are an expert code generator...",
    model=assistant_deployment_name,
    tools=[code_generation_tools]
)
```

### Custom Function Calling

Add your own functions for agents to use:

```python
def custom_function(param1, param2):
    # Your custom logic here
    return result

# Add to available functions
framework.available_functions['custom_function'] = custom_function
```

## 🛠️ Jupyter Notebook

The included Jupyter notebook (`multiagent_framework.ipynb`) provides:

- Step-by-step tutorial
- Interactive examples
- Performance monitoring
- Error handling demonstrations
- Advanced customization examples

To use the notebook:

```bash
jupyter lab multiagent_framework.ipynb
```

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Verify your Azure OpenAI endpoint and API key
   - Ensure your resource has the required model deployments

2. **Model Not Found**:
   - Check that your deployment names match the configuration
   - Verify that models are deployed and available

3. **Rate Limiting**:
   - Implement retry logic for production use
   - Monitor your API usage in Azure portal

4. **Thread Management**:
   - Always call `cleanup()` to remove created assistants
   - Monitor thread creation to avoid resource leaks

### Debugging

Enable detailed logging by adding debug prints:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🚀 Deployment Considerations

### Production Deployment

- **Environment Variables**: Use Azure Key Vault for sensitive data
- **Error Handling**: Implement comprehensive error handling and retries
- **Monitoring**: Add application insights and logging
- **Scaling**: Consider using Azure Container Instances or App Service
- **Cost Management**: Monitor API usage and implement usage limits

### Security Best Practices

- Never hardcode API keys in source code
- Use managed identities when possible
- Implement proper authentication and authorization
- Regularly rotate API keys
- Monitor for unusual usage patterns

## 📊 Performance Optimization

### Tips for Better Performance

1. **Batch Operations**: Group similar requests when possible
2. **Caching**: Cache frequently used responses
3. **Parallel Processing**: Use async/await for concurrent operations
4. **Resource Pooling**: Reuse thread objects when appropriate

### Monitoring and Metrics

Track important metrics:
- Response times
- API call frequency
- Error rates
- Resource usage
- Cost per interaction

## 🤝 Contributing

We welcome contributions! Please consider:

1. **Bug Reports**: Use GitHub issues for bug reports
2. **Feature Requests**: Propose new features through issues
3. **Pull Requests**: Follow the existing code style
4. **Documentation**: Help improve documentation and examples

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🙏 Acknowledgments

- Built on Azure OpenAI Service
- Inspired by multi-agent system research
- Uses OpenAI's Assistant API capabilities
- Community feedback and contributions

## 🔗 Related Resources

- [Azure OpenAI Service Documentation](https://docs.microsoft.com/azure/cognitive-services/openai/)
- [OpenAI Assistant API Guide](https://platform.openai.com/docs/assistants/overview)
- [Multi-Agent Systems Research](https://en.wikipedia.org/wiki/Multi-agent_system)

---

**Happy coding! 🎉**

For questions or support, please open an issue or contact the maintainers.

