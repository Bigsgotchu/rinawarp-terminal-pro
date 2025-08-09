document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const moodSelector = document.getElementById('moodSelector');
    
    // Set initial mood
    document.body.setAttribute('data-mood', moodSelector.value);
    
    // Handle mood changes
    moodSelector.addEventListener('change', (e) => {
        document.body.setAttribute('data-mood', e.target.value);
    });

    // Update module status panel
    function updateModuleStatus(data) {
        const container = document.getElementById('moduleStatus');
        container.innerHTML = '';

        // Add loaded modules
        data.loaded.forEach(module => {
            const div = document.createElement('div');
            div.className = 'module-item loaded';
            div.textContent = module;
            container.appendChild(div);
        });

        // Add loading modules
        data.loading.forEach(module => {
            const div = document.createElement('div');
            div.className = 'module-item loading';
            div.textContent = `${module} (loading...)`;
            container.appendChild(div);
        });

        // Add failed modules
        data.failed.forEach(module => {
            const div = document.createElement('div');
            div.className = 'module-item failed';
            div.textContent = `${module} (failed)`;
            container.appendChild(div);
        });
    }

    // Update performance metrics panel
    function updatePerformance(data) {
        const container = document.getElementById('performance');
        container.innerHTML = '';

        // CPU Usage
        const cpuDiv = document.createElement('div');
        cpuDiv.className = 'metric-item';
        cpuDiv.innerHTML = `
            <span>CPU Usage</span>
            <span>${Math.round(data.cpu.user / 1000)}%</span>
        `;
        container.appendChild(cpuDiv);

        // Memory Usage
        const memoryDiv = document.createElement('div');
        memoryDiv.className = 'metric-item';
        const memoryUsed = Math.round(data.memory.heapUsed / 1024 / 1024);
        const memoryTotal = Math.round(data.memory.heapTotal / 1024 / 1024);
        memoryDiv.innerHTML = `
            <span>Memory Usage</span>
            <span>${memoryUsed}MB / ${memoryTotal}MB</span>
        `;
        container.appendChild(memoryDiv);

        // Uptime
        const uptimeDiv = document.createElement('div');
        uptimeDiv.className = 'metric-item';
        uptimeDiv.innerHTML = `
            <span>Uptime</span>
            <span>${Math.round(data.uptime / 60)} minutes</span>
        `;
        container.appendChild(uptimeDiv);
    }

    // Update error log panel
    function updateErrorLog(data) {
        const container = document.getElementById('errorLog');
        container.innerHTML = '';

        data.forEach(error => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-item';
            errorDiv.innerHTML = `
                <div><strong>${error.timestamp}</strong></div>
                <div>${error.message}</div>
            `;
            container.appendChild(errorDiv);
        });
    }

    // Update configuration panel
    function updateConfiguration(data) {
        const container = document.getElementById('configuration');
        container.innerHTML = '';

        function renderConfigObject(obj, prefix = '') {
            Object.entries(obj).forEach(([key, value]) => {
                const configDiv = document.createElement('div');
                configDiv.className = 'config-item';
                
                if (typeof value === 'object' && value !== null) {
                    configDiv.innerHTML = `<span class="config-key">${prefix}${key}</span>`;
                    container.appendChild(configDiv);
                    renderConfigObject(value, `${prefix}${key}.`);
                } else {
                    configDiv.innerHTML = `
                        <span class="config-key">${prefix}${key}</span>
                        <span>${value}</span>
                    `;
                    container.appendChild(configDiv);
                }
            });
        }

        renderConfigObject(data);
    }

    // Socket event handlers
    socket.on('metrics', (data) => {
        updateModuleStatus(data.moduleStatus);
        updatePerformance(data.performance);
        updateErrorLogs(data.errors);
        updateConfiguration(data.config);
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        // Add visual feedback for connection error
        document.body.classList.add('connection-error');
    });

    socket.on('connect', () => {
        document.body.classList.remove('connection-error');
    });
});
