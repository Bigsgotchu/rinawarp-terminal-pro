/**
 * RinaWarp AI Assistant - Interactive Task Manager
 * Development-focused task management with AI-powered breakdown and tracking
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

export class TaskManager {
  constructor() {
    this.tasks = new Map();
    this.taskHistory = [];
    this.templates = new Map();
    this.dependencies = new Map();

    // Load existing tasks on startup
    this.loadTasks();
    this.loadTemplates();
  }

  /**
   * Create a new development task with AI breakdown
   */
  async createTask(params) {
    const {
      description,
      analysis,
      breakdown,
      estimate,
      priority = 'medium',
      labels = [],
      projectPath,
    } = params;

    const task = {
      id: uuidv4(),
      title: this.extractTitle(description),
      description,
      status: 'pending',
      priority,
      labels,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      project_path: projectPath,

      // AI-generated content
      analysis: analysis || null,
      breakdown: breakdown || null,
      estimate: estimate || null,

      // Progress tracking
      progress: {
        completed_steps: 0,
        total_steps: breakdown ? breakdown.steps.length : 0,
        completion_percentage: 0,
      },

      // Dependencies
      depends_on: [],
      blocks: [],

      // Files and changes
      affected_files: [],
      git_branches: [],
      commits: [],

      // Time tracking
      time_spent: 0,
      time_sessions: [],
    };

    this.tasks.set(task.id, task);
    await this.saveTasks();

    logger.info(`📋 Task created: ${task.id} - ${task.title}`);

    return task;
  }

  /**
   * Break down a task into actionable steps using AI
   */
  async breakdownTask(params) {
    const { description, analysis, complexity } = params;

    logger.info(`🔄 Breaking down task: ${description.substring(0, 50)}...`);

    // This would use AI to generate smart breakdown
    const breakdown = await this.generateTaskBreakdown(description, analysis, complexity);

    return breakdown;
  }

  /**
   * Update task progress
   */
  async updateProgress(taskId, stepIndex, completed = true) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!task.breakdown || !task.breakdown.steps[stepIndex]) {
      throw new Error(`Invalid step index: ${stepIndex}`);
    }

    task.breakdown.steps[stepIndex].completed = completed;
    task.breakdown.steps[stepIndex].completed_at = completed ? new Date().toISOString() : null;

    // Update progress metrics
    task.progress.completed_steps = task.breakdown.steps.filter(step => step.completed).length;
    task.progress.completion_percentage = Math.round(
      (task.progress.completed_steps / task.progress.total_steps) * 100
    );

    // Update task status if fully completed
    if (task.progress.completion_percentage === 100) {
      task.status = 'completed';
      task.completed = new Date().toISOString();
    }

    task.updated = new Date().toISOString();

    await this.saveTasks();

    logger.info(`✅ Task progress updated: ${taskId} (${task.progress.completion_percentage}%)`);

    return task;
  }

  /**
   * Add dependency between tasks
   */
  async addDependency(taskId, dependsOnTaskId) {
    const task = this.tasks.get(taskId);
    const dependentTask = this.tasks.get(dependsOnTaskId);

    if (!task || !dependentTask) {
      throw new Error('One or both tasks not found');
    }

    // Add dependency
    if (!task.depends_on.includes(dependsOnTaskId)) {
      task.depends_on.push(dependsOnTaskId);
    }

    if (!dependentTask.blocks.includes(taskId)) {
      dependentTask.blocks.push(taskId);
    }

    task.updated = new Date().toISOString();
    dependentTask.updated = new Date().toISOString();

    await this.saveTasks();

    logger.info(`🔗 Dependency added: ${taskId} depends on ${dependsOnTaskId}`);

    return { task, dependentTask };
  }

  /**
   * Get tasks that are ready to work on (no blocking dependencies)
   */
  getReadyTasks() {
    const readyTasks = [];

    for (const task of this.tasks.values()) {
      if (task.status === 'pending' && this.areDependenciesCompleted(task)) {
        readyTasks.push(task);
      }
    }

    // Sort by priority and creation date
    return readyTasks.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];

      if (priorityDiff !== 0) return priorityDiff;

      return new Date(a.created) - new Date(b.created);
    });
  }

  /**
   * Get task statistics and insights
   */
  getTaskInsights() {
    const allTasks = Array.from(this.tasks.values());

    const insights = {
      total_tasks: allTasks.length,
      by_status: {},
      by_priority: {},
      completion_rate: 0,
      average_completion_time: 0,
      blocked_tasks: 0,
      ready_tasks: 0,
      overdue_tasks: 0,
      patterns: {
        common_task_types: {},
        frequent_labels: {},
        productivity_trends: [],
      },
    };

    // Calculate basic metrics
    for (const task of allTasks) {
      insights.by_status[task.status] = (insights.by_status[task.status] || 0) + 1;
      insights.by_priority[task.priority] = (insights.by_priority[task.priority] || 0) + 1;

      if (task.depends_on.length > 0 && !this.areDependenciesCompleted(task)) {
        insights.blocked_tasks++;
      }

      // Count labels for patterns
      for (const label of task.labels) {
        insights.patterns.frequent_labels[label] =
          (insights.patterns.frequent_labels[label] || 0) + 1;
      }
    }

    insights.ready_tasks = this.getReadyTasks().length;
    insights.completion_rate =
      allTasks.length > 0
        ? Math.round(((insights.by_status.completed || 0) / allTasks.length) * 100)
        : 0;

    return insights;
  }

  /**
   * Start a time tracking session for a task
   */
  async startTimeSession(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const session = {
      id: uuidv4(),
      task_id: taskId,
      start_time: new Date().toISOString(),
      end_time: null,
      duration: 0,
      description: null,
    };

    task.time_sessions.push(session);
    task.updated = new Date().toISOString();

    await this.saveTasks();

    logger.info(`⏱️  Time session started for task: ${taskId}`);

    return session;
  }

  /**
   * End a time tracking session
   */
  async endTimeSession(taskId, sessionId, description = null) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const session = task.time_sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.end_time = new Date().toISOString();
    session.duration = new Date(session.end_time) - new Date(session.start_time);
    session.description = description;

    // Update total time spent
    task.time_spent += session.duration;
    task.updated = new Date().toISOString();

    await this.saveTasks();

    const durationMinutes = Math.round(session.duration / 60000);
    logger.info(`⏱️  Time session ended: ${durationMinutes} minutes`);

    return session;
  }

  /**
   * Search tasks with filters
   */
  searchTasks(query = '', filters = {}) {
    const { status, priority, labels, project_path, _date_range } = filters;

    let results = Array.from(this.tasks.values());

    // Text search
    if (query) {
      const searchTerms = query.toLowerCase().split(' ');
      results = results.filter(task => {
        const searchText = `${task.title} ${task.description}`.toLowerCase();
        return searchTerms.every(term => searchText.includes(term));
      });
    }

    // Status filter
    if (status) {
      results = results.filter(task => task.status === status);
    }

    // Priority filter
    if (priority) {
      results = results.filter(task => task.priority === priority);
    }

    // Labels filter
    if (labels && labels.length > 0) {
      results = results.filter(task => labels.some(label => task.labels.includes(label)));
    }

    // Project path filter
    if (project_path) {
      results = results.filter(task => task.project_path === project_path);
    }

    return results.sort((a, b) => new Date(b.updated) - new Date(a.updated));
  }

  /**
   * Generate smart task suggestions based on patterns
   */
  async generateTaskSuggestions(context) {
    const { _projectPath, recentActivity, codeAnalysis } = context;

    const suggestions = [];

    // Analyze recent commits for potential tasks
    if (recentActivity && recentActivity.commits) {
      for (const commit of recentActivity.commits) {
        if (commit.message.includes('TODO') || commit.message.includes('FIXME')) {
          suggestions.push({
            type: 'code_todo',
            title: 'Address TODO/FIXME items',
            description: `Found TODO/FIXME in commit: ${commit.message}`,
            priority: 'medium',
            estimated_time: '30-60 minutes',
          });
        }
      }
    }

    // Suggest refactoring based on code analysis
    if (
      codeAnalysis &&
      codeAnalysis.complexity &&
      codeAnalysis.complexity.high_complexity_files.length > 0
    ) {
      suggestions.push({
        type: 'refactoring',
        title: 'Refactor high complexity files',
        description: `${codeAnalysis.complexity.high_complexity_files.length} files have high complexity`,
        priority: 'medium',
        estimated_time: '2-4 hours',
      });
    }

    // Suggest testing improvements
    if (codeAnalysis && codeAnalysis.test_coverage && codeAnalysis.test_coverage.estimated < 70) {
      suggestions.push({
        type: 'testing',
        title: 'Improve test coverage',
        description: `Current coverage: ${Math.round(codeAnalysis.test_coverage.estimated)}%`,
        priority: 'high',
        estimated_time: '1-3 hours',
      });
    }

    return suggestions;
  }

  /**
   * Private helper methods
   */

  async generateTaskBreakdown(description, analysis, complexity) {
    // This would use AI to generate intelligent breakdown
    // For now, return a structured template

    const steps = [
      {
        id: uuidv4(),
        title: 'Plan and design',
        description: 'Research requirements and plan implementation approach',
        estimated_time: '30-60 minutes',
        completed: false,
        dependencies: [],
      },
      {
        id: uuidv4(),
        title: 'Implement core functionality',
        description: 'Write main implementation code',
        estimated_time: '1-2 hours',
        completed: false,
        dependencies: [],
      },
      {
        id: uuidv4(),
        title: 'Add tests',
        description: 'Write comprehensive tests',
        estimated_time: '30-45 minutes',
        completed: false,
        dependencies: [],
      },
      {
        id: uuidv4(),
        title: 'Review and refine',
        description: 'Code review and refinements',
        estimated_time: '15-30 minutes',
        completed: false,
        dependencies: [],
      },
    ];

    return {
      type: 'ai_generated',
      confidence: 0.8,
      steps,
      total_estimated_time: '2.5-4 hours',
      complexity_level: complexity || 'medium',
      generated_at: new Date().toISOString(),
    };
  }

  areDependenciesCompleted(task) {
    if (task.depends_on.length === 0) return true;

    for (const depId of task.depends_on) {
      const depTask = this.tasks.get(depId);
      if (!depTask || depTask.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  extractTitle(description) {
    // Extract a concise title from the description
    const firstSentence = description.split('.')[0];
    return firstSentence.length > 60 ? firstSentence.substring(0, 57) + '...' : firstSentence;
  }

  async loadTasks() {
    try {
      const tasksFile = path.join(process.cwd(), '.rinawarp', 'tasks.json');
      const data = await fs.readFile(tasksFile, 'utf-8');
      const tasksArray = JSON.parse(data);

      this.tasks = new Map(tasksArray.map(task => [task.id, task]));
      logger.info(`📚 Loaded ${this.tasks.size} tasks`);
    } catch (error) {
      // File doesn't exist yet, start with empty tasks
      logger.info('📚 Starting with empty task list');
    }
  }

  async saveTasks() {
    try {
      const rinawarpDir = path.join(process.cwd(), '.rinawarp');
      await fs.mkdir(rinawarpDir, { recursive: true });

      const tasksFile = path.join(rinawarpDir, 'tasks.json');
      const tasksArray = Array.from(this.tasks.values());

      await fs.writeFile(tasksFile, JSON.stringify(tasksArray, null, 2));
    } catch (error) {
      logger.error('❌ Failed to save tasks:', error);
    }
  }

  async loadTemplates() {
    // Load common task templates for quick creation
    this.templates.set('feature', {
      name: 'New Feature',
      steps: [
        'Research and plan',
        'Design API/interface',
        'Implement core logic',
        'Add tests',
        'Documentation',
        'Review and polish',
      ],
    });

    this.templates.set('bugfix', {
      name: 'Bug Fix',
      steps: [
        'Reproduce bug',
        'Identify root cause',
        'Fix implementation',
        'Add regression test',
        'Verify fix',
      ],
    });

    this.templates.set('refactor', {
      name: 'Code Refactoring',
      steps: [
        'Analyze current code',
        'Plan refactoring approach',
        'Implement changes',
        'Update tests',
        'Performance validation',
      ],
    });
  }

  // Export methods for integration
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  deleteTask(taskId) {
    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      this.saveTasks();
    }
    return deleted;
  }
}

export default TaskManager;
