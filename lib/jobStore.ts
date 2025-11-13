/**
 * In-memory job store for tracking async scraping jobs
 *
 * In production, this could be replaced with Redis or a database
 */

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number; // 0-100
  currentBatch?: number;
  totalBatches?: number;
  message?: string;
  chatConfig?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// Use globalThis to persist across hot reloads in development
const globalForJobs = globalThis as unknown as {
  jobs: Map<string, JobStatus> | undefined;
};

// In-memory store (will be cleared on server restart, but persists across hot reloads)
const jobs = globalForJobs.jobs ?? new Map<string, JobStatus>();
globalForJobs.jobs = jobs;

// Cleanup old jobs after 1 hour
const JOB_RETENTION_TIME = 60 * 60 * 1000; // 1 hour

export function createJob(jobId: string): JobStatus {
  const job: JobStatus = {
    jobId,
    status: 'pending',
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  jobs.set(jobId, job);
  return job;
}

export function updateJob(jobId: string, updates: Partial<JobStatus>): JobStatus | null {
  const job = jobs.get(jobId);
  if (!job) return null;

  const updatedJob = {
    ...job,
    ...updates,
    updatedAt: Date.now(),
  };

  jobs.set(jobId, updatedJob);
  return updatedJob;
}

export function getJob(jobId: string): JobStatus | null {
  return jobs.get(jobId) || null;
}

export function deleteJob(jobId: string): boolean {
  return jobs.delete(jobId);
}

// Cleanup old jobs periodically (only start once)
if (!globalForJobs.jobs) {
  setInterval(() => {
    const now = Date.now();
    for (const [jobId, job] of jobs.entries()) {
      if (now - job.updatedAt > JOB_RETENTION_TIME) {
        jobs.delete(jobId);
        console.log(`Cleaned up old job: ${jobId}`);
      }
    }
  }, 5 * 60 * 1000); // Run every 5 minutes
}
