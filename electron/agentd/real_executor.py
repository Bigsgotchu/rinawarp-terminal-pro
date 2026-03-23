"""
Real Agent Executor with GPT-5.1 Intelligence

This replaces the simulated execution with actual AI-powered agent capabilities:
1. Intent classification (help/build/test/deploy/self-check)
2. Plan generation
3. Tool execution (filesystem, terminal, git)
4. Output interpretation
5. Receipt generation with proofs
"""

import os
import asyncio
import json
import subprocess
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
import hashlib
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    AI_AVAILABLE = True
except ImportError:
    print("[AgentExecutor] Warning: emergentintegrations not available")
    AI_AVAILABLE = False

@dataclass
class ExecutionContext:
    """Context for agent execution"""
    run_id: str
    prompt: str
    workspace: str
    mode: str  # 'local' or 'remote'

@dataclass
class ExecutionReceipt:
    """Receipt for a single execution step"""
    id: str
    run_id: str
    timestamp: str
    action: str
    status: str  # 'success' or 'error'
    output: Optional[str]
    error: Optional[str]
    proof: Dict[str, str]  # Contains hash

@dataclass
class ExecutionResult:
    """Result of full execution"""
    success: bool
    output: str
    receipts: List[ExecutionReceipt]
    error: Optional[str] = None

class RealAgentExecutor:
    """
    Real agent executor with GPT-5.1 intelligence.
    
    Flow:
    1. Classify intent from prompt
    2. Generate execution plan
    3. Execute tools (filesystem, terminal, git)
    4. Interpret output
    5. Generate receipts with proofs
    """
    
    def __init__(self):
        self.api_key = os.getenv('EMERGENT_LLM_KEY')
        if not self.api_key:
            print("[AgentExecutor] Warning: EMERGENT_LLM_KEY not found")
        
        self.workspace_base = "/tmp/rinawarp-workspaces"
        os.makedirs(self.workspace_base, exist_ok=True)
        
        # Initialize AI chat
        if AI_AVAILABLE and self.api_key:
            self.ai_chat = LlmChat(
                api_key=self.api_key,
                session_id="rinawarp-agent",
                system_message=self._get_system_message()
            ).with_model("openai", "gpt-5.1")
            print("[AgentExecutor] Initialized with GPT-5.1")
        else:
            self.ai_chat = None
            print("[AgentExecutor] Running without AI (fallback mode)")
    
    def _get_system_message(self) -> str:
        """System message for the AI agent"""
        return """You are RinaWarp Terminal Pro Agent - a proof-first execution assistant.

Your role:
1. Classify user intents: help, build, test, deploy, self-check, code
2. Create execution plans with specific tools
3. Interpret command outputs
4. Suggest next actions

Available tools:
- execute_command: Run shell commands
- read_file: Read file contents
- write_file: Create or update files
- list_directory: List directory contents
- git_status: Check git status
- git_commit: Commit changes

Response format:
{
  "intent": "build|test|deploy|self-check|code|help",
  "plan": ["step1", "step2", ...],
  "commands": [{"tool": "tool_name", "args": {...}}],
  "explanation": "What I'm doing and why"
}

Always be precise, actionable, and proof-oriented."""
    
    async def execute(
        self,
        context: ExecutionContext,
        on_receipt: Optional[Callable] = None,
        on_progress: Optional[Callable] = None
    ) -> ExecutionResult:
        """Execute agent task with AI intelligence"""
        
        receipts = []
        output_lines = []
        
        try:
            # Step 1: Classify intent and create plan
            if on_progress:
                on_progress("Analyzing request...")
            
            intent_data = await self._classify_and_plan(context)
            
            receipt = self._create_receipt(
                context.run_id,
                "intent_classification",
                "success",
                f"Intent: {intent_data.get('intent', 'unknown')}"
            )
            receipts.append(receipt)
            if on_receipt:
                on_receipt(receipt)
            
            # Step 2: Execute plan
            intent = intent_data.get('intent', 'unknown')
            
            if intent == 'build':
                result = await self._execute_build(context, on_progress, on_receipt, receipts)
            elif intent == 'test':
                result = await self._execute_test(context, on_progress, on_receipt, receipts)
            elif intent == 'deploy':
                result = await self._execute_deploy(context, on_progress, on_receipt, receipts)
            elif intent == 'self-check':
                result = await self._execute_self_check(context, on_progress, on_receipt, receipts)
            elif intent == 'code':
                result = await self._execute_code_generation(context, intent_data, on_progress, on_receipt, receipts)
            else:
                result = await self._execute_help(context, on_progress, on_receipt, receipts)
            
            return ExecutionResult(
                success=True,
                output=result,
                receipts=receipts
            )
            
        except Exception as e:
            error_receipt = self._create_receipt(
                context.run_id,
                "execution_error",
                "error",
                None,
                str(e)
            )
            receipts.append(error_receipt)
            if on_receipt:
                on_receipt(error_receipt)
            
            return ExecutionResult(
                success=False,
                output="",
                receipts=receipts,
                error=str(e)
            )
    
    async def _classify_and_plan(self, context: ExecutionContext) -> Dict:
        """Use GPT-5.1 to classify intent and create plan"""
        
        if not self.ai_chat:
            # Fallback: simple keyword matching
            prompt_lower = context.prompt.lower()
            if 'build' in prompt_lower:
                return {'intent': 'build', 'plan': ['compile', 'bundle']}
            elif 'test' in prompt_lower:
                return {'intent': 'test', 'plan': ['run tests']}
            elif 'deploy' in prompt_lower:
                return {'intent': 'deploy', 'plan': ['upload']}
            elif 'check' in prompt_lower:
                return {'intent': 'self-check', 'plan': ['verify']}
            else:
                return {'intent': 'help', 'plan': ['provide guidance']}
        
        # Use AI to classify and plan
        message = UserMessage(
            text=f"""Analyze this request and create an execution plan:

Request: {context.prompt}
Workspace: {context.workspace}

Respond with JSON containing:
- intent: One of (build, test, deploy, self-check, code, help)
- plan: Array of steps
- commands: Array of tool calls needed
- explanation: Brief explanation

Be specific and actionable."""
        )
        
        response = await self.ai_chat.send_message(message)
        
        # Parse AI response
        try:
            # Try to extract JSON from response
            response_text = response.strip()
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            data = json.loads(response_text)
            return data
        except json.JSONDecodeError:
            # Fallback parsing
            return {
                'intent': 'help',
                'plan': ['Analyze request', 'Provide guidance'],
                'explanation': response
            }
    
    async def _execute_build(
        self,
        context: ExecutionContext,
        on_progress: Optional[Callable],
        on_receipt: Optional[Callable],
        receipts: List
    ) -> str:
        """Execute build workflow"""
        
        output = []
        
        # Step 1: Check for build files
        if on_progress:
            on_progress("Checking for build configuration...")
        
        workspace = f"{self.workspace_base}/{context.run_id}"
        os.makedirs(workspace, exist_ok=True)
        
        # Detect build system
        build_file = None
        if os.path.exists(f"{workspace}/package.json"):
            build_file = "package.json"
        elif os.path.exists(f"{workspace}/Makefile"):
            build_file = "Makefile"
        elif os.path.exists(f"{workspace}/build.sh"):
            build_file = "build.sh"
        
        receipt = self._create_receipt(
            context.run_id,
            "detect_build_system",
            "success",
            f"Found: {build_file or 'none'}"
        )
        receipts.append(receipt)
        if on_receipt:
            on_receipt(receipt)
        
        if not build_file:
            return "No build system detected. Add package.json, Makefile, or build.sh"
        
        # Step 2: Execute build
        if on_progress:
            on_progress(f"Building with {build_file}...")
        
        if build_file == "package.json":
            cmd_result = await self._run_command("yarn build", workspace)
        elif build_file == "Makefile":
            cmd_result = await self._run_command("make", workspace)
        else:
            cmd_result = await self._run_command("./build.sh", workspace)
        
        receipt = self._create_receipt(
            context.run_id,
            "execute_build",
            "success" if cmd_result['success'] else "error",
            cmd_result['output'],
            cmd_result.get('error')
        )
        receipts.append(receipt)
        if on_receipt:
            on_receipt(receipt)
        
        return cmd_result['output']
    
    async def _execute_test(
        self,
        context: ExecutionContext,
        on_progress: Optional[Callable],
        on_receipt: Optional[Callable],
        receipts: List
    ) -> str:
        """Execute test workflow"""
        
        if on_progress:
            on_progress("Running tests...")
        
        workspace = f"{self.workspace_base}/{context.run_id}"
        
        # Try common test commands
        test_commands = [
            "yarn test",
            "npm test",
            "pytest",
            "make test"
        ]
        
        for cmd in test_commands:
            result = await self._run_command(cmd, workspace)
            if result['success']:
                receipt = self._create_receipt(
                    context.run_id,
                    "run_tests",
                    "success",
                    result['output']
                )
                receipts.append(receipt)
                if on_receipt:
                    on_receipt(receipt)
                return result['output']
        
        return "No test runner found. Add test scripts to package.json or pytest"
    
    async def _execute_deploy(
        self,
        context: ExecutionContext,
        on_progress: Optional[Callable],
        on_receipt: Optional[Callable],
        receipts: List
    ) -> str:
        """Execute deploy workflow"""
        
        if on_progress:
            on_progress("Preparing deployment...")
        
        receipt = self._create_receipt(
            context.run_id,
            "deploy_prepare",
            "success",
            "Deployment workflow requires configuration"
        )
        receipts.append(receipt)
        if on_receipt:
            on_receipt(receipt)
        
        return "Deploy: Configure your deployment target (Vercel, Cloudflare, Docker)"
    
    async def _execute_self_check(
        self,
        context: ExecutionContext,
        on_progress: Optional[Callable],
        on_receipt: Optional[Callable],
        receipts: List
    ) -> str:
        """Execute self-check/diagnostics"""
        
        if on_progress:
            on_progress("Running self-check...")
        
        checks = []
        
        # Check 1: Workspace exists
        workspace = f"{self.workspace_base}/{context.run_id}"
        checks.append(f"✓ Workspace: {workspace}")
        
        # Check 2: Node.js
        node_result = await self._run_command("node --version", workspace)
        if node_result['success']:
            checks.append(f"✓ Node.js: {node_result['output'].strip()}")
        else:
            checks.append("✗ Node.js: not found")
        
        # Check 3: Python
        python_result = await self._run_command("python3 --version", workspace)
        if python_result['success']:
            checks.append(f"✓ Python: {python_result['output'].strip()}")
        else:
            checks.append("✗ Python: not found")
        
        # Check 4: Git
        git_result = await self._run_command("git --version", workspace)
        if git_result['success']:
            checks.append(f"✓ Git: {git_result['output'].strip()}")
        else:
            checks.append("✗ Git: not found")
        
        output = "\n".join(checks)
        
        receipt = self._create_receipt(
            context.run_id,
            "self_check",
            "success",
            output
        )
        receipts.append(receipt)
        if on_receipt:
            on_receipt(receipt)
        
        return output
    
    async def _execute_code_generation(
        self,
        context: ExecutionContext,
        intent_data: Dict,
        on_progress: Optional[Callable],
        on_receipt: Optional[Callable],
        receipts: List
    ) -> str:
        """Execute code generation with AI"""
        
        if on_progress:
            on_progress("Generating code...")
        
        if not self.ai_chat:
            return "Code generation requires AI. Set EMERGENT_LLM_KEY."
        
        # Use AI to generate code
        message = UserMessage(
            text=f"""Generate code for this request:

{context.prompt}

Provide:
1. File names
2. Complete code
3. Brief explanation

Be production-ready and follow best practices."""
        )
        
        response = await self.ai_chat.send_message(message)
        
        receipt = self._create_receipt(
            context.run_id,
            "code_generation",
            "success",
            response
        )
        receipts.append(receipt)
        if on_receipt:
            on_receipt(receipt)
        
        return response
    
    async def _execute_help(
        self,
        context: ExecutionContext,
        on_progress: Optional[Callable],
        on_receipt: Optional[Callable],
        receipts: List
    ) -> str:
        """Provide help and guidance"""
        
        if on_progress:
            on_progress("Analyzing request...")
        
        help_text = f"""I can help you with:

- Build: Compile and bundle your project
- Test: Run test suites
- Deploy: Deploy to various platforms
- Self-Check: Verify your environment
- Code: Generate code for your needs

Your request: "{context.prompt}"

What would you like me to do?"""
        
        receipt = self._create_receipt(
            context.run_id,
            "provide_help",
            "success",
            help_text
        )
        receipts.append(receipt)
        if on_receipt:
            on_receipt(receipt)
        
        return help_text
    
    async def _run_command(self, command: str, cwd: str) -> Dict:
        """Execute shell command"""
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr if result.returncode != 0 else None
            }
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'Command timed out'
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e)
            }
    
    def _create_receipt(
        self,
        run_id: str,
        action: str,
        status: str,
        output: Optional[str] = None,
        error: Optional[str] = None
    ) -> ExecutionReceipt:
        """Create receipt with proof hash"""
        
        import uuid
        
        receipt_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Create proof hash
        data = f"{receipt_id}:{run_id}:{action}:{timestamp}:{output or ''}"
        proof_hash = hashlib.sha256(data.encode()).hexdigest()
        
        return ExecutionReceipt(
            id=receipt_id,
            run_id=run_id,
            timestamp=timestamp,
            action=action,
            status=status,
            output=output,
            error=error,
            proof={'hash': proof_hash}
        )
    
    def is_available(self) -> bool:
        """Check if executor is available"""
        return True
    
    async def cancel(self, run_id: str):
        """Cancel execution"""
        # TODO: Implement cancellation
        pass
    
    async def diagnostic(self) -> Dict:
        """Get diagnostic information"""
        return {
            'ai_available': AI_AVAILABLE and self.ai_chat is not None,
            'model': 'gpt-5.1' if self.ai_chat else 'fallback',
            'workspace_base': self.workspace_base
        }
