export interface ProcessingQueue {
  enqueue<T>(task: () => Promise<T>): Promise<T>;
}

export const createProcessingQueue = (concurrency = 2): ProcessingQueue => {
  let active = 0;
  const waiting: Array<() => void> = [];

  const release = () => {
    active -= 1;
    waiting.shift()?.();
  };

  const acquire = (): Promise<void> => {
    if (active < concurrency) {
      active += 1;
      return Promise.resolve();
    }

    return new Promise(resolve => {
      waiting.push(() => {
        active += 1;
        resolve();
      });
    });
  };

  return {
    async enqueue<T>(task: () => Promise<T>): Promise<T> {
      await acquire();
      try {
        return await task();
      } finally {
        release();
      }
    },
  };
};

export const isCurrentProcessingJob = (
  file: Pick<ProcessedFileLike, 'processingRevision'> | undefined,
  revision: number
): boolean => Boolean(file && file.processingRevision === revision);

interface ProcessedFileLike {
  processingRevision: number;
}
