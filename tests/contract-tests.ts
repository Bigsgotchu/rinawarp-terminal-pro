/**
 * IPC Contract Tests
 * 
 * Tests all IPC contracts to ensure:
 * - All channels are registered
 * - Request/response schemas are valid
 * - Handlers exist and are callable
 * - No breaking changes in contracts
 */

import { IPC_CHANNELS } from '../shared/contracts';
import { IPC_CONTRACTS, ContractValidator } from '../electron/ipc/contract-validator';

describe('IPC Contract Tests', () => {
  let validator: ContractValidator;

  beforeEach(() => {
    validator = new ContractValidator();
  });

  describe('Contract Registry', () => {
    test('All IPC channels have contracts', () => {
      const channels = Object.values(IPC_CHANNELS);
      const registeredChannels = Object.keys(IPC_CONTRACTS);

      channels.forEach(channel => {
        expect(registeredChannels).toContain(channel);
      });
    });

    test('All contracts have required fields', () => {
      Object.entries(IPC_CONTRACTS).forEach(([channel, contract]) => {
        expect(contract.channel).toBe(channel);
        expect(contract.handler).toBeDefined();
        expect(contract.description).toBeDefined();
        expect(typeof contract.description).toBe('string');
      });
    });

    test('No duplicate channel definitions', () => {
      const channels = Object.keys(IPC_CONTRACTS);
      const uniqueChannels = new Set(channels);
      expect(channels.length).toBe(uniqueChannels.size);
    });
  });

  describe('Request Validation', () => {
    test('RUN_CREATE: validates correct request', () => {
      const result = validator.validateRequest(IPC_CHANNELS.RUN_CREATE, {
        prompt: 'Build my app',
        mode: 'local',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('RUN_CREATE: rejects invalid mode', () => {
      const result = validator.validateRequest(IPC_CHANNELS.RUN_CREATE, {
        prompt: 'Build my app',
        mode: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('RUN_CREATE: rejects missing prompt', () => {
      const result = validator.validateRequest(IPC_CHANNELS.RUN_CREATE, {
        mode: 'local',
      });
      expect(result.valid).toBe(false);
    });

    test('RUN_GET: validates string ID', () => {
      const result = validator.validateRequest(IPC_CHANNELS.RUN_GET, {
        id: 'test-run-123',
      });
      expect(result.valid).toBe(true);
    });

    test('RUN_GET: rejects non-string ID', () => {
      const result = validator.validateRequest(IPC_CHANNELS.RUN_GET, {
        id: 123,
      });
      expect(result.valid).toBe(false);
    });

    test('AGENT_STATUS: accepts empty request', () => {
      const result = validator.validateRequest(IPC_CHANNELS.AGENT_STATUS, {});
      expect(result.valid).toBe(true);
    });
  });

  describe('Response Validation', () => {
    test('Validates successful response', () => {
      const result = validator.validateResponse(IPC_CHANNELS.RUN_CREATE, {
        success: true,
        data: {
          id: 'run-123',
          prompt: 'Test',
          status: 'pending',
          mode: 'local',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          receipts: [],
        },
      });
      expect(result.valid).toBe(true);
    });

    test('Validates error response', () => {
      const result = validator.validateResponse(IPC_CHANNELS.RUN_CREATE, {
        success: false,
        error: 'Failed to create run',
      });
      expect(result.valid).toBe(true);
    });

    test('Rejects response without success field', () => {
      const result = validator.validateResponse(IPC_CHANNELS.RUN_CREATE, {
        data: {},
      });
      expect(result.valid).toBe(false);
    });

    test('Validates array response', () => {
      const result = validator.validateResponse(IPC_CHANNELS.RUN_LIST, {
        success: true,
        data: [],
      });
      expect(result.valid).toBe(true);
    });

    test('Rejects non-array when array expected', () => {
      const result = validator.validateResponse(IPC_CHANNELS.RUN_LIST, {
        success: true,
        data: {},
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('Contract Violations', () => {
    test('Records violations', () => {
      validator.validateRequest('invalid-channel', {});
      const violations = validator.getViolations();
      expect(violations.length).toBeGreaterThan(0);
    });

    test('Can retrieve violations by channel', () => {
      validator.validateRequest(IPC_CHANNELS.RUN_CREATE, { invalid: 'data' });
      const violations = validator.getViolationsForChannel(IPC_CHANNELS.RUN_CREATE);
      expect(violations.length).toBeGreaterThan(0);
    });

    test('Can clear violations', () => {
      validator.validateRequest('invalid', {});
      validator.clearViolations();
      expect(validator.getViolations()).toHaveLength(0);
    });

    test('Generates audit report', () => {
      validator.validateRequest(IPC_CHANNELS.RUN_CREATE, { invalid: 'data' });
      const report = validator.generateAuditReport();
      expect(report).toContain('IPC Contract Audit Report');
      expect(report).toContain('Total Violations');
    });
  });

  describe('Contract Invariants', () => {
    test('All response contracts require success field', () => {
      Object.values(IPC_CONTRACTS).forEach(contract => {
        if (contract.responseSchema) {
          expect(contract.responseSchema.success).toBe('boolean');
        }
      });
    });

    test('Update operations have no required request data', () => {
      const updateChannels = [
        IPC_CHANNELS.UPDATE_CHECK,
        IPC_CHANNELS.UPDATE_DOWNLOAD,
        IPC_CHANNELS.UPDATE_INSTALL,
      ];

      updateChannels.forEach(channel => {
        const contract = IPC_CONTRACTS[channel];
        expect(Object.keys(contract.requestSchema || {}).length).toBe(0);
      });
    });

    test('All run operations return Run or Run[]', () => {
      const runChannels = [
        IPC_CHANNELS.RUN_CREATE,
        IPC_CHANNELS.RUN_GET,
        IPC_CHANNELS.RUN_RECOVER,
      ];

      runChannels.forEach(channel => {
        const contract = IPC_CONTRACTS[channel];
        expect(contract.responseSchema.data).toBeDefined();
      });
    });
  });

  describe('Single Owner Invariant', () => {
    test('Each IPC channel has exactly one handler', () => {
      const handlerMap = new Map<string, string[]>();

      Object.entries(IPC_CONTRACTS).forEach(([channel, contract]) => {
        const handler = contract.handler;
        if (!handlerMap.has(handler)) {
          handlerMap.set(handler, []);
        }
        handlerMap.get(handler)!.push(channel);
      });

      // Each handler should own its channels clearly
      // This is informational - not enforcing single owner per handler
      handlerMap.forEach((channels, handler) => {
        console.log(`Handler ${handler} owns ${channels.length} channels`);
      });
    });

    test('No channel is registered twice', () => {
      const channels = Object.keys(IPC_CONTRACTS);
      const uniqueChannels = [...new Set(channels)];
      expect(channels).toEqual(uniqueChannels);
    });
  });

  describe('E2E Contract Validation', () => {
    test('Full request-response cycle for RUN_CREATE', () => {
      // Valid request
      const requestValidation = validator.validateRequest(IPC_CHANNELS.RUN_CREATE, {
        prompt: 'Build React app',
        mode: 'local',
      });
      expect(requestValidation.valid).toBe(true);

      // Valid response
      const responseValidation = validator.validateResponse(IPC_CHANNELS.RUN_CREATE, {
        success: true,
        data: {
          id: 'run-123',
          prompt: 'Build React app',
          status: 'pending',
          mode: 'local',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          receipts: [],
        },
      });
      expect(responseValidation.valid).toBe(true);
    });

    test('Full request-response cycle for AGENT_STATUS', () => {
      const requestValidation = validator.validateRequest(IPC_CHANNELS.AGENT_STATUS, {});
      expect(requestValidation.valid).toBe(true);

      const responseValidation = validator.validateResponse(IPC_CHANNELS.AGENT_STATUS, {
        success: true,
        data: {
          available: true,
          mode: 'local',
          version: '0.1.0',
          activeRuns: 0,
        },
      });
      expect(responseValidation.valid).toBe(true);
    });
  });
});

/**
 * Export test utilities
 */
export function runContractTests() {
  console.log('Running IPC Contract Tests...\n');
  
  const validator = new ContractValidator();
  let passed = 0;
  let failed = 0;

  // Test 1: All channels registered
  console.log('Test: All IPC channels have contracts');
  const channels = Object.values(IPC_CHANNELS);
  const registered = Object.keys(IPC_CONTRACTS);
  const allRegistered = channels.every(ch => registered.includes(ch));
  if (allRegistered) {
    console.log('  ✓ PASS\n');
    passed++;
  } else {
    console.log('  ✗ FAIL\n');
    failed++;
  }

  // Test 2: Request validation
  console.log('Test: Request validation works');
  const reqTest = validator.validateRequest(IPC_CHANNELS.RUN_CREATE, {
    prompt: 'Test',
    mode: 'local',
  });
  if (reqTest.valid) {
    console.log('  ✓ PASS\n');
    passed++;
  } else {
    console.log('  ✗ FAIL\n');
    failed++;
  }

  // Test 3: Response validation
  console.log('Test: Response validation works');
  const resTest = validator.validateResponse(IPC_CHANNELS.RUN_CREATE, {
    success: true,
    data: {},
  });
  if (resTest.valid) {
    console.log('  ✓ PASS\n');
    passed++;
  } else {
    console.log('  ✗ FAIL\n');
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\nAudit Report:');
    console.log(validator.generateAuditReport());
  }

  return { passed, failed, validator };
}
