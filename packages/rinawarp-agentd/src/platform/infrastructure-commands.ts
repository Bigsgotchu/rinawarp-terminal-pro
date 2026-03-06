/**
 * Infrastructure Commands
 * 
 * Problem #8: Infrastructure Commands
 * "deploy docker container to AWS" → docker build → docker push → ecs update
 * 
 * Generates deployment commands for various infrastructure targets.
 */

import { generateFixPlan } from "./llm.js";
import type { LLMConfig } from "./llm.js";

export type InfrastructureTarget = 
  | "aws-ecs"
  | "aws-lambda"
  | "aws-ec2"
  | "gcp-cloud-run"
  | "gcp-kubernetes"
  | "azure-container"
  | "azure-appservice"
  | "kubernetes"
  | "docker-compose"
  | "vercel"
  | "netlify"
  | "heroku";

export interface InfrastructureRequest {
  action: "deploy" | "scale" | "rollback" | "logs" | "status" | "stop" | "restart";
  target: InfrastructureTarget;
  serviceName?: string;
  environment?: "production" | "staging" | "development";
  context?: {
    dockerfile?: string;
    imageName?: string;
    tag?: string;
    region?: string;
    cluster?: string;
  };
}

export interface InfrastructurePlan {
  steps: string[];
  explanation: string;
  estimatedTime: string;
  risk: "low" | "medium" | "high";
}

/**
 * Common infrastructure patterns
 */
const INFRASTRUCTURE_PATTERNS: Record<InfrastructureTarget, {
  deploy: string[];
  scale: string[];
  logs: string[];
  status: string[];
}> = {
  "aws-ecs": {
    deploy: [
      "aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com",
      "docker build -t $IMAGE_NAME:$TAG .",
      "docker tag $IMAGE_NAME:$TAG $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$IMAGE_NAME:$TAG",
      "docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$IMAGE_NAME:$TAG",
      "aws ecs update-service --cluster $CLUSTER --service $SERVICE_NAME --force-new-deployment",
    ],
    scale: [
      "aws ecs update-service --cluster $CLUSTER --service $SERVICE_NAME --desired-count $COUNT",
    ],
    logs: [
      "aws logs tail /ecs/$SERVICE_NAME --follow",
    ],
    status: [
      "aws ecs describe-services --cluster $CLUSTER --services $SERVICE_NAME",
    ],
  },
  "aws-lambda": {
    deploy: [
      "zip function.zip index.js",
      "aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file fileb://function.zip",
    ],
    scale: ["Lambda auto-scales - no manual scaling needed"],
    logs: [
      "aws logs tail /aws/lambda/$FUNCTION_NAME --follow",
    ],
    status: [
      "aws lambda get-function --function-name $FUNCTION_NAME",
    ],
  },
  "kubernetes": {
    deploy: [
      "kubectl apply -f deployment.yaml",
      "kubectl rollout status deployment/$SERVICE_NAME",
    ],
    scale: [
      "kubectl scale deployment/$SERVICE_NAME --replicas=$COUNT",
    ],
    logs: [
      "kubectl logs -f deployment/$SERVICE_NAME",
    ],
    status: [
      "kubectl get pods,svc,deployments",
    ],
  },
  "docker-compose": {
    deploy: [
      "docker-compose up -d --build",
    ],
    scale: [
      "docker-compose up -d --scale $SERVICE_NAME=$COUNT",
    ],
    logs: [
      "docker-compose logs -f $SERVICE_NAME",
    ],
    status: [
      "docker-compose ps",
    ],
  },
  "gcp-cloud-run": {
    deploy: [
      "gcloud auth configure-docker",
      "gcloud builds submit --tag gcr.io/$PROJECT/$SERVICE_NAME",
      "gcloud run deploy $SERVICE_NAME --image gcr.io/$PROJECT/$SERVICE_NAME --platform managed",
    ],
    scale: ["Cloud Run auto-scales - no manual scaling needed"],
    logs: [
      "gcloud logging read 'resource.type=cloud_run_revision' --limit 50",
    ],
    status: [
      "gcloud run services describe $SERVICE_NAME",
    ],
  },
  "vercel": {
    deploy: [
      "vercel --prod",
    ],
    scale: ["Vercel auto-scales - no manual scaling needed"],
    logs: [
      "vercel logs $SERVICE_NAME",
    ],
    status: [
      "vercel inspect $SERVICE_NAME",
    ],
  },
  "heroku": {
    deploy: [
      "git push heroku main",
    ],
    scale: [
      "heroku ps:scale web=$COUNT",
    ],
    logs: [
      "heroku logs --tail",
    ],
    status: [
      "heroku ps",
    ],
  },
  // Placeholder for other targets
  "aws-ec2": { deploy: ["# EC2 requires manual setup"], scale: ["# Auto-scale group"], logs: ["# CloudWatch logs"], status: ["# AWS CLI"] },
  "gcp-kubernetes": { deploy: ["# GKE deploy"], scale: ["# kubectl scale"], logs: ["# kubectl logs"], status: ["# kubectl status"] },
  "azure-container": { deploy: ["# Azure Container Instances"], scale: ["# ACI"], logs: ["# az container logs"], status: ["# az container show"] },
  "azure-appservice": { deploy: ["# Azure App Service"], scale: ["# az webapp up"], logs: ["# az webapp log tail"], status: ["# az webapp show"] },
  "netlify": { deploy: ["netlify deploy --prod"], scale: ["# Netlify auto-scales"], logs: ["netlify logs"], status: ["netlify status"] },
};

/**
 * Generate infrastructure commands
 */
export async function generateInfrastructurePlan(
  config: LLMConfig,
  request: InfrastructureRequest
): Promise<InfrastructurePlan> {
  const pattern = INFRASTRUCTURE_PATTERNS[request.target];
  
  if (!pattern) {
    return {
      steps: [],
      explanation: `Unknown infrastructure target: ${request.target}`,
      estimatedTime: "N/A",
      risk: "high",
    };
  }

  // Get base steps from pattern
  let steps: string[] = [];
  
  switch (request.action) {
    case "deploy":
      steps = pattern.deploy;
      break;
    case "scale":
      steps = pattern.scale;
      break;
    case "logs":
      steps = pattern.logs;
      break;
    case "status":
      steps = pattern.status;
      break;
    default:
      // Use LLM for other actions
      const llmResult = await generateLLMInfraPlan(config, request);
      return llmResult;
  }

  // Replace placeholders with actual values
  steps = replacePlaceholders(steps, request);

  // For complex deployments, enhance with LLM
  if (request.target === "aws-ecs" || request.target === "kubernetes") {
    const llmEnhancement = await enhanceWithLLM(config, request, steps);
    if (llmEnhancement.steps.length > 0) {
      steps = llmEnhancement.steps;
    }
  }

  return {
    steps,
    explanation: `${request.action} ${request.target} in ${request.environment || "default"} environment`,
    estimatedTime: estimateTime(request.action, steps.length),
    risk: determineRisk(request.action, request.target),
  };
}

/**
 * Generate custom infrastructure plan using LLM
 */
async function generateLLMInfraPlan(
  config: LLMConfig,
  request: InfrastructureRequest
): Promise<InfrastructurePlan> {
  const prompt = `Generate infrastructure commands for:

Action: ${request.action}
Target: ${request.target}
Service: ${request.serviceName || "app"}
Environment: ${request.environment || "production"}

Context:
${JSON.stringify(request.context || {}, null, 2)}

Generate the shell commands needed.

Respond with ONLY valid JSON:
{
  "steps": ["command1", "command2"],
  "explanation": "what this does",
  "estimatedTime": "e.g., 2-5 minutes",
  "risk": "low|medium|high"
}`;

  try {
    const result = await generateFixPlan(config, {
      userPrompt: `${request.action} ${request.target}`,
      systemContext: {
        os: "linux",
        kernel: "",
        hostname: "",
        uptime: "",
        cpu: "",
        memory: "",
        disk: "",
        processes: "",
        services: "",
      },
    }, {
      systemPrompt: prompt,
      maxRetries: 1,
    });

    return {
      steps: result.commands,
      explanation: result.analysis,
      estimatedTime: "2-5 minutes",
      risk: result.risk,
    };
  } catch {
    return {
      steps: [],
      explanation: "Failed to generate plan",
      estimatedTime: "N/A",
      risk: "high",
    };
  }
}

/**
 * Enhance base plan with LLM
 */
async function enhanceWithLLM(
  config: LLMConfig,
  request: InfrastructureRequest,
  baseSteps: string[]
): Promise<InfrastructurePlan> {
  const prompt = `Enhance these infrastructure deployment steps:

Current steps:
${baseSteps.join("\n")}

Target: ${request.target}
Service: ${request.serviceName || "app"}
Environment: ${request.environment || "production"}

Add any missing steps like:
- Health checks
- Rollback commands
- Verification steps

Respond with ONLY valid JSON array of commands.`;

  try {
    const result = await generateFixPlan(config, {
      userPrompt: "Enhance deployment",
      systemContext: {
        os: "linux",
        kernel: "",
        hostname: "",
        uptime: "",
        cpu: "",
        memory: "",
        disk: "",
        processes: "",
        services: "",
      },
    }, {
      systemPrompt: prompt,
      maxRetries: 1,
    });

    return {
      steps: result.commands.length > 0 ? result.commands : baseSteps,
      explanation: result.analysis,
      estimatedTime: estimateTime(request.action, baseSteps.length),
      risk: determineRisk(request.action, request.target),
    };
  } catch {
    return {
      steps: baseSteps,
      explanation: `${request.action} ${request.target}`,
      estimatedTime: estimateTime(request.action, baseSteps.length),
      risk: determineRisk(request.action, request.target),
    };
  }
}

/**
 * Replace placeholder variables in commands
 */
function replacePlaceholders(steps: string[], request: InfrastructureRequest): string[] {
  const vars = {
    $SERVICE_NAME: request.serviceName || "app",
    $IMAGE_NAME: request.context?.imageName || "myapp",
    $TAG: request.context?.tag || "latest",
    $REGION: request.context?.region || "us-east-1",
    $ACCOUNT: process.env.AWS_ACCOUNT_ID || "123456789",
    $CLUSTER: request.context?.cluster || "default",
    $COUNT: "2",
    $FUNCTION_NAME: request.serviceName || "my-function",
    $PROJECT: process.env.GCP_PROJECT || "my-project",
  };

  return steps.map(step => {
    let result = step;
    for (const [placeholder, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(placeholder, "g"), value);
    }
    return result;
  });
}

/**
 * Estimate time for action
 */
function estimateTime(action: string, stepCount: number): string {
  const baseTime = stepCount * 30; // seconds
  
  if (action === "deploy") {
    return baseTime > 120 ? `${Math.round(baseTime / 60)}-${Math.round(baseTime / 60) + 2} minutes` : "1-2 minutes";
  }
  if (action === "scale") {
    return "10-30 seconds";
  }
  return `${Math.round(baseTime / 60)} minutes`;
}

/**
 * Determine risk level
 */
function determineRisk(action: string, target: InfrastructureTarget): "low" | "medium" | "high" {
  if (action === "stop" || action === "restart") {
    return "high";
  }
  if (action === "deploy") {
    return "medium";
  }
  return "low";
}

/**
 * List supported infrastructure targets
 */
export function listSupportedTargets(): InfrastructureTarget[] {
  return Object.keys(INFRASTRUCTURE_PATTERNS) as InfrastructureTarget[];
}
