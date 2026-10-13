import { describe, expect, it } from 'vitest';
import { createProcessingQueue, isCurrentProcessingJob } from './processingQueue';

describe('processing queue', () => {
  it('never runs more than two tasks concurrently', async () => {
    const queue = createProcessingQueue(2);
    let active = 0;
    let peak = 0;

    const tasks = Array.from({ length: 4 }, () => queue.enqueue(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 10));
      active -= 1;
    }));

    await Promise.all(tasks);
    expect(peak).toBe(2);
  });

  it('rejects results from an obsolete settings revision', () => {
    expect(isCurrentProcessingJob({ processingRevision: 4 }, 4)).toBe(true);
    expect(isCurrentProcessingJob({ processingRevision: 5 }, 4)).toBe(false);
    expect(isCurrentProcessingJob(undefined, 4)).toBe(false);
  });
});
