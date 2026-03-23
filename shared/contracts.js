"use strict";
// Type-safe IPC contracts between main and renderer
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
// IPC Channel definitions
exports.IPC_CHANNELS = {
    // Run management
    RUN_CREATE: 'run:create',
    RUN_GET: 'run:get',
    RUN_LIST: 'run:list',
    RUN_CANCEL: 'run:cancel',
    RUN_RECOVER: 'run:recover',
    RUN_UPDATE: 'run:update',
    // Agent operations
    AGENT_STATUS: 'agent:status',
    AGENT_EXECUTE: 'agent:execute',
    AGENT_DIAGNOSTIC: 'agent:diagnostic',
    // Receipt/proof
    RECEIPT_GET: 'receipt:get',
    RECEIPT_VERIFY: 'receipt:verify',
    // Build/Test/Deploy
    BUILD_START: 'build:start',
    TEST_START: 'test:start',
    DEPLOY_START: 'deploy:start',
    // Updates
    UPDATE_CHECK: 'update:check',
    UPDATE_DOWNLOAD: 'update:download',
    UPDATE_INSTALL: 'update:install',
};
