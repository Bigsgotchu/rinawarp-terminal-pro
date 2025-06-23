# 🚀 Quick Start Guide

Get up and running with the Multimodal Multi-Agent Framework in minutes!

## ⚡ 30-Second Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Setup environment
python setup.py

# 3. Configure credentials
# Edit .env file with your Azure OpenAI credentials

# 4. Test your setup
python test_setup.py

# 5. Run the demo
python demo.py
```

## 📋 Prerequisites Checklist

- [ ] Python 3.8+ installed
- [ ] Azure OpenAI Service access
- [ ] GPT-4 deployment available
- [ ] DALL-E 3 deployment available
- [ ] GPT-4 Vision deployment available

## 🔑 Configuration

1. **Copy the environment template**:
   ```bash
   copy .env.template .env    # Windows
   cp .env.template .env      # Mac/Linux
   ```

2. **Edit `.env` with your credentials**:
   ```env
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-api-key-here
   ```

## 🎯 First Run

**Option 1: Command Line Demo**
```bash
python demo.py
```

**Option 2: Jupyter Notebook**
```bash
jupyter lab multiagent_framework.ipynb
```

**Option 3: Python Script**
```python
from multiagent_framework import MultiAgentFramework

framework = MultiAgentFramework(
    azure_endpoint="your-endpoint",
    api_key="your-key"
)

framework.start_conversation()
response = framework.send_user_message("Generate a sunset image and analyze it")
framework.cleanup()
```

## 🧪 Verify Everything Works

```bash
python test_setup.py
```

This will check:
- ✅ All dependencies installed
- ✅ Framework imports correctly
- ✅ Environment configured
- ✅ Ready to make API calls

## 🎉 Example Workflows

### Simple Image Generation
```
"Generate a futuristic cityscape"
→ DALL-E creates image
→ Returns image URL
```

### Multi-Agent Collaboration
```
"Create a logo and analyze its design quality"
→ DALL-E generates logo
→ Vision Assistant analyzes it
→ Provides feedback and suggestions
```

### Iterative Improvement
```
"Create an image, analyze it, and improve it"
→ DALL-E creates initial image
→ Vision analyzes quality
→ DALL-E creates improved version
→ Final result delivered
```

## 🛟 Troubleshooting

**Import Errors?**
```bash
pip install -r requirements.txt
```

**Authentication Issues?**
- Check your .env file
- Verify Azure OpenAI endpoint and key
- Ensure deployments exist

**Framework Not Working?**
```bash
python test_setup.py
```

## 🔗 Next Steps

- Read the full [README.md](README.md)
- Explore the [Jupyter notebook](multiagent_framework.ipynb)
- Customize agent instructions
- Add your own specialized agents
- Deploy to production

## 📞 Getting Help

1. Check the error messages - they're designed to be helpful!
2. Run `python test_setup.py` for diagnostics
3. Review the README.md for detailed documentation
4. Check Azure OpenAI Service status

---

**🎊 You're ready to build amazing multi-agent AI applications!**

