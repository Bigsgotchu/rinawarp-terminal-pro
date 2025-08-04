// Core rule evaluation and dispatcher
class RuleEngine {
  constructor() {
    this.rules = [];
  }

  addRule(rule) {
    this.rules.push(rule);
  }

  evaluate(context) {
    this.rules.forEach(rule => {
      if (rule.condition(context)) {
        rule.action(context);
      }
    });
  }
}

export default RuleEngine;
