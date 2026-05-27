import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MetricsStore } from '../dist-electron/main/metrics/metrics-store.js'
import { metricsRecorder } from '../dist-electron/main/metrics/metrics-recorder.js'
import {
  computeRollup,
  getMetricCount,
  getMetricSum,
  getMetricAverage,
  getMetricMinMax,
  getTaskCount,
  getTaskDurationAverage,
  getVerificationDurationAverage,
  getPatchApplyDurationAverage,
  getBuildDurationAverage,
  getRepoUnderstandingUsedCount,
  getSafePatchUsedCount,
  getDiskRecoveryUsedCount,
  getPortRecoveryUsedCount
} from '../dist-electron/main/metrics/metrics-rollups.js'

// Clear the store before and after each test to avoid interference
beforeEach(() => {
  MetricsStore.getInstance().clear()
})

afterEach(() => {
  MetricsStore.getInstance().clear()
})

describe('MetricsStore', () => {
  it('should record an increment event', () => {
    metricsRecorder.recordTaskStarted()
    const events = MetricsStore.getInstance().getEvents('task_started')
    assert.strictEqual(events.length, 1)
    assert.strictEqual(events[0].value, 1)
    assert.strictEqual(events[0].type, 'task_started')
  })

  it('should record a value event', () => {
    metricsRecorder.recordTaskDurationMs(150)
    const events = MetricsStore.getInstance().getEvents('task_duration_ms')
    assert.strictEqual(events.length, 1)
    assert.strictEqual(events[0].value, 150)
    assert.strictEqual(events[0].type, 'task_duration_ms')
  })

  it('should record multiple events', () => {
    metricsRecorder.recordTaskStarted()
    metricsRecorder.recordTaskStarted()
    metricsRecorder.recordTaskCompleted()
    const startedEvents = MetricsStore.getInstance().getEvents('task_started')
    const completedEvents = MetricsStore.getInstance().getEvents('task_completed')
    assert.strictEqual(startedEvents.length, 2)
    assert.strictEqual(completedEvents.length, 1)
  })

  it('should clear the store', () => {
    metricsRecorder.recordTaskStarted()
    assert.strictEqual(MetricsStore.getInstance().getEvents().length, 1)
    MetricsStore.getInstance().clear()
    assert.strictEqual(MetricsStore.getInstance().getEvents().length, 0)
  })
})

describe('MetricsRollups', () => {
  it('should compute rollup for a single event', () => {
    metricsRecorder.recordTaskDurationMs(100)
    const rollup = computeRollup('task_duration_ms')
    assert.strictEqual(rollup.count, 1)
    assert.strictEqual(rollup.sum, 100)
    assert.strictEqual(rollup.min, 100)
    assert.strictEqual(rollup.max, 100)
    assert.strictEqual(rollup.average, 100)
  })

  it('should compute rollup for multiple events', () => {
    metricsRecorder.recordTaskDurationMs(100)
    metricsRecorder.recordTaskDurationMs(200)
    metricsRecorder.recordTaskDurationMs(300)
    const rollup = computeRollup('task_duration_ms')
    assert.strictEqual(rollup.count, 3)
    assert.strictEqual(rollup.sum, 600)
    assert.strictEqual(rollup.min, 100)
    assert.strictEqual(rollup.max, 300)
    assert.strictEqual(rollup.average, 200)
  })

  it('should return zero rollup for no events', () => {
    const rollup = computeRollup('task_duration_ms')
    assert.strictEqual(rollup.count, 0)
    assert.strictEqual(rollup.sum, 0)
    assert.strictEqual(rollup.min, 0)
    assert.strictEqual(rollup.max, 0)
    assert.strictEqual(rollup.average, 0)
  })

  it('should get metric count', () => {
    metricsRecorder.recordTaskStarted()
    metricsRecorder.recordTaskStarted()
    assert.strictEqual(getMetricCount('task_started'), 2)
  })

  it('should get metric sum', () => {
    metricsRecorder.recordTaskDurationMs(100)
    metricsRecorder.recordTaskDurationMs(200)
    assert.strictEqual(getMetricSum('task_duration_ms'), 300)
  })

  it('should get metric average', () => {
    metricsRecorder.recordTaskDurationMs(100)
    metricsRecorder.recordTaskDurationMs(200)
    assert.strictEqual(getMetricAverage('task_duration_ms'), 150)
  })

  it('should get metric min and max', () => {
    metricsRecorder.recordTaskDurationMs(100)
    metricsRecorder.recordTaskDurationMs(200)
    const minMax = getMetricMinMax('task_duration_ms')
    assert.strictEqual(minMax.min, 100)
    assert.strictEqual(minMax.max, 200)
  })

  // Specific helper functions
  it('getTaskCount should count completed tasks', () => {
    metricsRecorder.recordTaskCompleted()
    metricsRecorder.recordTaskCompleted()
    assert.strictEqual(getTaskCount(), 2)
  })

  it('getTaskDurationAverage should average task durations', () => {
    metricsRecorder.recordTaskDurationMs(100)
    metricsRecorder.recordTaskDurationMs(300)
    assert.strictEqual(getTaskDurationAverage(), 200)
  })

  it('getVerificationDurationAverage should average verification durations', () => {
    metricsRecorder.recordVerificationDurationMs(50)
    metricsRecorder.recordVerificationDurationMs(150)
    assert.strictEqual(getVerificationDurationAverage(), 100)
  })

  it('getPatchApplyDurationAverage should average patch apply durations', () => {
    metricsRecorder.recordPatchApplyDurationMs(20)
    metricsRecorder.recordPatchApplyDurationMs(80)
    assert.strictEqual(getPatchApplyDurationAverage(), 50)
  })

  it('getBuildDurationAverage should average build durations', () => {
    metricsRecorder.recordBuildDurationMs(1000)
    metricsRecorder.recordBuildDurationMs(2000)
    assert.strictEqual(getBuildDurationAverage(), 1500)
  })

  it('getRepoUnderstandingUsedCount should count repo understanding usage', () => {
    metricsRecorder.recordRepoUnderstandingUsed()
    metricsRecorder.recordRepoUnderstandingUsed()
    assert.strictEqual(getRepoUnderstandingUsedCount(), 2)
  })

  it('getSafePatchUsedCount should count safe patch usage', () => {
    metricsRecorder.recordSafePatchUsed()
    metricsRecorder.recordSafePatchUsed()
    assert.strictEqual(getSafePatchUsedCount(), 2)
  })

  it('getDiskRecoveryUsedCount should count disk recovery usage', () => {
    metricsRecorder.recordDiskRecoveryUsed()
    metricsRecorder.recordDiskRecoveryUsed()
    assert.strictEqual(getDiskRecoveryUsedCount(), 2)
  })

  it('getPortRecoveryUsedCount should count port recovery usage', () => {
    metricsRecorder.recordPortRecoveryUsed()
    metricsRecorder.recordPortRecoveryUsed()
    assert.strictEqual(getPortRecoveryUsedCount(), 2)
  })
})

describe('Time filtering', () => {
  const past = 1000
  const now = 2000
  const future = 3000

  it('should filter events by start time', () => {
    const store = MetricsStore.getInstance()
    store.clear()
    store.record({ type: 'task_started', value: 1, timestamp: past })
    store.record({ type: 'task_started', value: 1, timestamp: now })
    store.record({ type: 'task_started', value: 1, timestamp: future })

    const events = store.getEvents('task_started', now)
    assert.strictEqual(events.length, 2)
  })

  it('should filter events by end time', () => {
    const store = MetricsStore.getInstance()
    store.clear()
    store.record({ type: 'task_started', value: 1, timestamp: past })
    store.record({ type: 'task_started', value: 1, timestamp: now })
    store.record({ type: 'task_started', value: 1, timestamp: future })

    const events = store.getEvents('task_started', undefined, now)
    assert.strictEqual(events.length, 2)
  })

  it('should filter events by both start and end time', () => {
    const store = MetricsStore.getInstance()
    store.clear()
    store.record({ type: 'task_started', value: 1, timestamp: past })
    store.record({ type: 'task_started', value: 1, timestamp: now })
    store.record({ type: 'task_started', value: 1, timestamp: future })

    const events = store.getEvents('task_started', past, now)
    assert.strictEqual(events.length, 2)
  })
})
