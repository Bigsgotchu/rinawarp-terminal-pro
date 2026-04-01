// @ts-nocheck

function createDoctorPlanStep(stepId, command, cwd) {
  return {
    stepId,
    tool: 'terminal.write',
    input: { command, cwd },
  }
}

export async function doctorPlanForIpc(args) {
  const cwd = args.projectRoot
  const steps = [
    createDoctorPlanStep('uptime', 'uptime', cwd),
    createDoctorPlanStep('cpu_top', 'ps -Ao pid,ppid,%cpu,%mem,etime,comm --sort=-%cpu | head -n 15', cwd),
    createDoctorPlanStep('mem_top', 'ps -Ao pid,ppid,%cpu,%mem,etime,comm --sort=-%mem | head -n 15', cwd),
    createDoctorPlanStep('disk_df', 'df -h', cwd),
    createDoctorPlanStep('disk_big', 'du -h -d 1 . 2>/dev/null | sort -h | tail -n 12', cwd),
    createDoctorPlanStep('sensors', 'sensors 2>/dev/null || echo "sensors not available"', cwd),
  ]

  return {
    id: `doctor_${Date.now()}`,
    intent: args.symptom,
    reasoning: "I'll collect read-only evidence first (CPU, memory, disk, sensors). No changes yet.",
    steps,
    playbookId: 'doctor.running_hot.v1',
  }
}
