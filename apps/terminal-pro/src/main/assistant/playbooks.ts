export const PLAYBOOKS = [
  {
    id: 'running-hot',
    name: 'System Running Hot',
    description: 'Diagnose and fix CPU/temperature issues',
    category: 'performance',
    signals: ['high cpu load', 'fan noise', 'overheating', 'temperature'],
    interpretationRules: [
      {
        pattern: /load average.*([5-9]\.[0-9]|1[0-9])/,
        message: 'Critical load: system is severely overloaded',
        severity: 'critical',
      },
      { pattern: /load average.*([2-4]\.[0-9])/, message: 'High load: CPU pressure detected', severity: 'warning' },
      {
        pattern: /%Cpu\(s\):.*wa.*([5-9][0-9]\.[0-9])/,
        message: 'High iowait: disk/IO bottleneck',
        severity: 'warning',
      },
      { pattern: /Processes.*blocked.*[5-9][0-9]+/, message: 'Many processes blocked on IO', severity: 'warning' },
    ],
    gatherCommands: [
      { command: 'uptime', description: 'System load average', timeout: 5000 },
      { command: 'cat /proc/loadavg', description: 'Detailed load stats', timeout: 5000 },
      { command: '__TOP_CPU_20__', description: 'Top CPU processes', timeout: 8000 },
      { command: 'free -h', description: 'Memory usage', timeout: 5000 },
      {
        command: "sensors 2>/dev/null || echo 'No sensors available'",
        description: 'Temperature sensors',
        timeout: 8000,
      },
    ],
    fixOptions: [
      {
        name: 'Identify CPU hogs',
        description: 'Find and analyze processes consuming excessive CPU',
        risk: 'read',
        commands: ['__TOP_CPU_15__'],
        verification: 'Process list shows CPU consumers',
      },
      {
        name: 'Check memory pressure',
        description: 'Investigate if memory is causing swap thrashing',
        risk: 'read',
        commands: ['free -h', "cat /proc/meminfo | grep -E '(MemAvailable|SwapTotal|SwapFree)'"],
        verification: 'Memory statistics available',
      },
      {
        name: 'Review system services',
        description: 'Check for runaway services',
        risk: 'read',
        commands: ['systemctl list-units --type=service --state=running --no-pager -o unit,active,substate | head -20'],
        verification: 'Service list available',
      },
    ],
    escalationCondition: 'If temperature sensors show critical temperatures (>90°C), advise immediate action',
  },
  {
    id: 'disk-full',
    name: 'Disk Full',
    description: 'Find and clear disk space',
    category: 'cleanup',
    signals: ['disk full', 'no space', 'disk space', 'running out of space'],
    interpretationRules: [
      { pattern: /(100%|[9][0-9]%\s)/, message: 'Disk is critically full', severity: 'critical' },
      { pattern: /([7-8][0-9]%\s)/, message: 'Disk is mostly full', severity: 'warning' },
      { pattern: /([5-6][0-9]%\s)/, message: 'Disk is getting full', severity: 'info' },
    ],
    gatherCommands: [
      { command: "df -h | grep -E '(Filesystem|/dev/)'", description: 'Disk usage by mount', timeout: 5000 },
      {
        command: 'du -sh /var/* 2>/dev/null | sort -h | tail -10',
        description: 'Largest var directories',
        timeout: 15000,
      },
      { command: 'du -sh /home/* 2>/dev/null | sort -h | tail -10', description: 'Largest home dirs', timeout: 15000 },
      { command: "du -sh ~/.cache 2>/dev/null || echo 'No cache dir'", description: 'Cache size', timeout: 10000 },
      {
        command: "docker system df 2>/dev/null || echo 'Docker not available'",
        description: 'Docker disk usage',
        timeout: 10000,
      },
    ],
    fixOptions: [
      {
        name: 'Clean apt cache',
        description: 'Clear apt package cache',
        risk: 'safe-write',
        commands: ['sudo apt autoremove -y', 'sudo apt clean'],
        verification: 'Apt cache cleaned',
      },
      {
        name: 'Clear user cache',
        description: 'Clear ~/.cache directory',
        risk: 'safe-write',
        commands: [
          "du -sh ~/.cache 2>/dev/null || echo 'No cache'",
          "rm -rf ~/.cache/* 2>/dev/null || echo 'Nothing to clear'",
        ],
        verification: 'User cache cleared',
      },
      {
        name: 'Docker cleanup',
        description: 'Clean unused Docker data',
        risk: 'high-impact',
        commands: ['docker system df', 'docker system prune -f'],
        verification: 'Docker disk space freed',
      },
      {
        name: 'Find large files',
        description: 'Locate largest files for manual review',
        risk: 'read',
        commands: ['find /home -type f -size +100M -exec ls -lh {} \\; 2>/dev/null | sort -k5 -h | tail -20'],
        verification: 'Large files listed',
      },
    ],
    escalationCondition: 'If disk is >95% full, prioritize immediate cleanup actions',
  },
  {
    id: 'docker-space',
    name: 'Docker Space',
    description: 'Clean Docker disk usage',
    category: 'cleanup',
    signals: ['docker', 'container', 'image', 'docker-compose'],
    interpretationRules: [
      { pattern: /Images.*([5-9][0-9]+)/, message: 'Many unused images', severity: 'warning' },
      { pattern: /Containers.*([5-9][0-9]+).*created/, message: 'Many stopped containers', severity: 'info' },
      { pattern: /Reclaimable.*([5-9][0-9]+%)/, message: 'Significant space can be reclaimed', severity: 'warning' },
    ],
    gatherCommands: [
      { command: 'docker system df', description: 'Docker disk usage breakdown', timeout: 10000 },
      { command: 'docker system df -v 2>/dev/null | head -30', description: 'Detailed Docker stats', timeout: 15000 },
      { command: 'docker images -f dangling=true -q | wc -l', description: 'Dangling images count', timeout: 5000 },
      { command: 'docker ps -a -f status=exited -q | wc -l', description: 'Stopped containers count', timeout: 5000 },
    ],
    fixOptions: [
      {
        name: 'Docker system prune',
        description: 'Remove all unused data (images, containers, volumes)',
        risk: 'high-impact',
        commands: ['docker system df', 'docker system prune -af'],
        verification: 'Docker system pruned',
      },
      {
        name: 'Clean dangling images',
        description: 'Remove dangling images only',
        risk: 'safe-write',
        commands: ['docker image prune -f'],
        verification: 'Dangling images removed',
      },
      {
        name: 'Remove stopped containers',
        description: 'Remove all stopped containers',
        risk: 'safe-write',
        commands: ['docker container prune -f'],
        verification: 'Stopped containers removed',
      },
    ],
    escalationCondition: 'If volumes have important data, ask user before pruning',
  },
  {
    id: 'laptop-slow',
    name: 'Laptop Slow',
    description: 'Diagnose performance issues on laptop',
    category: 'performance',
    signals: ['slow', 'lag', 'performance', 'laptop', 'freezing'],
    interpretationRules: [
      { pattern: /load average.*([3-9]\.[0-9])/, message: 'High system load', severity: 'warning' },
      { pattern: /MiB Mem :.*[0-9]+.*[0-9]+.*([0-9]+)%.*/, message: 'High memory usage', severity: 'warning' },
      { pattern: /battery/i, message: 'Check power settings', severity: 'info' },
    ],
    gatherCommands: [
      { command: 'uptime', description: 'Load average', timeout: 5000 },
      { command: 'free -h', description: 'Memory usage', timeout: 5000 },
      { command: '__TOP_CPU_15__', description: 'Top processes', timeout: 8000 },
      { command: 'cat /proc/loadavg', description: 'Detailed load', timeout: 5000 },
      { command: 'systemctl status 2>/dev/null | head -20', description: 'Systemd status', timeout: 10000 },
    ],
    fixOptions: [
      {
        name: 'Check for memory hogs',
        description: 'Find processes using most memory',
        risk: 'read',
        commands: ['__TOP_MEM_15__'],
        verification: 'Memory hogs identified',
      },
      {
        name: 'Review running services',
        description: 'Check for unnecessary services',
        risk: 'read',
        commands: [
          'systemctl list-units --type=service --state=running --no-pager | wc -l',
          'systemctl list-units --type=service --state=running --no-pager',
        ],
        verification: 'Service list available',
      },
    ],
    escalationCondition: 'If memory usage >90%, suggest closing applications or adding RAM',
  },
  {
    id: 'port-in-use',
    name: 'Port In Use',
    description: 'Diagnose and resolve port conflicts',
    category: 'diagnose',
    signals: ['port', 'address already in use', 'eaddrinuse', 'bind failed'],
    interpretationRules: [
      { pattern: /:([0-9]+)\s+.*already in use/i, message: 'Port is occupied', severity: 'warning' },
      { pattern: /EADDRINUSE/i, message: 'Address already in use', severity: 'warning' },
    ],
    gatherCommands: [
      { command: "ss -tlnp | grep -E ':[0-9]+'", description: 'Listening ports', timeout: 5000 },
      {
        command: 'lsof -i :PORT 2>/dev/null || netstat -tlnp 2>/dev/null | grep PORT',
        description: 'Process on specific port',
        timeout: 5000,
      },
      {
        command: "ps aux | grep -E 'node|python|go|java|ruby' | grep -v grep",
        description: 'Common dev processes',
        timeout: 8000,
      },
    ],
    fixOptions: [
      {
        name: 'Find process on port',
        description: "Identify what's using the port",
        risk: 'read',
        commands: ['lsof -i :PORT 2>/dev/null || ss -tlnp | grep PORT'],
        verification: 'Process identified',
      },
      {
        name: 'Kill process on port',
        description: 'Terminate process using the port (careful!)',
        risk: 'high-impact',
        commands: ["kill $(lsof -t -i:PORT) 2>/dev/null || echo 'Could not identify process'"],
        verification: 'Process terminated',
      },
    ],
    escalationCondition: 'If process belongs to critical service, advise caution',
  },
]

export function resolveMainPlaybooks(topCpu15: string, topCpu20: string, topMem15: string) {
  return PLAYBOOKS.map((playbook) => ({
    ...playbook,
    gatherCommands: (playbook.gatherCommands || []).map((step) => ({
      ...step,
      command: String(step.command)
        .replaceAll('__TOP_CPU_20__', topCpu20)
        .replaceAll('__TOP_CPU_15__', topCpu15)
        .replaceAll('__TOP_MEM_15__', topMem15),
    })),
    fixOptions: (playbook.fixOptions || []).map((option) => ({
      ...option,
      commands: (option.commands || []).map((command) =>
        String(command)
          .replaceAll('__TOP_CPU_20__', topCpu20)
          .replaceAll('__TOP_CPU_15__', topCpu15)
          .replaceAll('__TOP_MEM_15__', topMem15)
      ),
    })),
  }))
}
