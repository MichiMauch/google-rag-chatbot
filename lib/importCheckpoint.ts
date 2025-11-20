import { db } from "./db";
import { importJobs, type ImportJob, type NewImportJob } from "./schema";
import { eq, and } from "drizzle-orm";

export interface FailedUrl {
  url: string;
  error: string;
  timestamp: number;
  retryCount?: number;
}

export interface CheckpointData {
  fileSearchStoreName: string;
  uploadedFiles: any[];
  sitemapUrls: string[];
  urlsToScrape: string[];
  currentBatchUrls: string[];
  themeId: string;
  systemInstruction?: string;
  allowedDomains?: string[];
}

/**
 * Creates a new import job in the database
 */
export async function createImportJob(data: {
  chatName: string;
  displayName: string;
  totalUrls: number;
  totalBatches: number;
}): Promise<string> {
  const now = Date.now();
  const jobId = `import_${now}_${Math.random().toString(36).substring(7)}`;

  await db.insert(importJobs).values({
    id: jobId,
    chatName: data.chatName,
    displayName: data.displayName,
    status: "running",
    currentBatch: 0,
    totalBatches: data.totalBatches,
    totalUrls: data.totalUrls,
    processedUrls: 0,
    successfulUrls: 0,
    failedUrls: 0,
    processedUrlsList: JSON.stringify([]),
    failedUrlsList: JSON.stringify([]),
    lastCheckpoint: null,
    startedAt: now,
    completedAt: null,
    lastActivityAt: now,
    error: null,
    createdAt: now,
    updatedAt: now,
  });

  return jobId;
}

/**
 * Updates the checkpoint for an import job
 */
export async function updateCheckpoint(
  jobId: string,
  data: {
    currentBatch: number;
    processedUrls: number;
    successfulUrls: number;
    failedUrls: number;
    processedUrlsList: string[];
    failedUrlsList: FailedUrl[];
    checkpointData: CheckpointData;
  }
): Promise<void> {
  const now = Date.now();

  await db
    .update(importJobs)
    .set({
      currentBatch: data.currentBatch,
      processedUrls: data.processedUrls,
      successfulUrls: data.successfulUrls,
      failedUrls: data.failedUrls,
      processedUrlsList: JSON.stringify(data.processedUrlsList),
      failedUrlsList: JSON.stringify(data.failedUrlsList),
      lastCheckpoint: JSON.stringify(data.checkpointData),
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(importJobs.id, jobId));
}

/**
 * Adds a failed URL to the import job
 */
export async function addFailedUrl(
  jobId: string,
  failedUrl: FailedUrl
): Promise<void> {
  const job = await getImportJob(jobId);
  if (!job) {
    throw new Error(`Import job ${jobId} not found`);
  }

  const failedUrlsList: FailedUrl[] = job.failedUrlsList
    ? JSON.parse(job.failedUrlsList)
    : [];
  failedUrlsList.push(failedUrl);

  await db
    .update(importJobs)
    .set({
      failedUrls: failedUrlsList.length,
      failedUrlsList: JSON.stringify(failedUrlsList),
      updatedAt: Date.now(),
    })
    .where(eq(importJobs.id, jobId));
}

/**
 * Marks an import job as completed
 */
export async function completeImportJob(jobId: string): Promise<void> {
  const now = Date.now();
  const job = await getImportJob(jobId);
  if (!job) {
    throw new Error(`Import job ${jobId} not found`);
  }

  const durationMs = job.startedAt ? now - job.startedAt : 0;

  await db
    .update(importJobs)
    .set({
      status: "completed",
      completedAt: now,
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(importJobs.id, jobId));
}

/**
 * Marks an import job as failed
 */
export async function failImportJob(
  jobId: string,
  error: string
): Promise<void> {
  const now = Date.now();

  await db
    .update(importJobs)
    .set({
      status: "failed",
      error,
      completedAt: now,
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(importJobs.id, jobId));
}

/**
 * Marks an import job as paused (for resume later)
 */
export async function pauseImportJob(jobId: string): Promise<void> {
  await db
    .update(importJobs)
    .set({
      status: "paused",
      lastActivityAt: Date.now(),
      updatedAt: Date.now(),
    })
    .where(eq(importJobs.id, jobId));
}

/**
 * Gets an import job by ID
 */
export async function getImportJob(jobId: string): Promise<ImportJob | null> {
  const results = await db
    .select()
    .from(importJobs)
    .where(eq(importJobs.id, jobId))
    .limit(1);

  return results[0] || null;
}

/**
 * Gets all import jobs for a chat
 */
export async function getImportJobsForChat(
  chatName: string
): Promise<ImportJob[]> {
  return await db
    .select()
    .from(importJobs)
    .where(eq(importJobs.chatName, chatName))
    .orderBy(importJobs.createdAt);
}

/**
 * Gets all paused/incomplete import jobs
 */
export async function getIncompleteImportJobs(): Promise<ImportJob[]> {
  return await db
    .select()
    .from(importJobs)
    .where(eq(importJobs.status, "paused"))
    .orderBy(importJobs.updatedAt);
}

/**
 * Deletes an import job
 */
export async function deleteImportJob(jobId: string): Promise<void> {
  await db.delete(importJobs).where(eq(importJobs.id, jobId));
}

/**
 * Gets the latest import job for a chat (useful for resume)
 */
export async function getLatestImportJobForChat(
  chatName: string
): Promise<ImportJob | null> {
  const results = await db
    .select()
    .from(importJobs)
    .where(eq(importJobs.chatName, chatName))
    .orderBy(importJobs.createdAt)
    .limit(1);

  return results[0] || null;
}

/**
 * Sends a heartbeat to keep the job alive
 */
export async function sendHeartbeat(jobId: string): Promise<void> {
  await db
    .update(importJobs)
    .set({
      lastActivityAt: Date.now(),
    })
    .where(eq(importJobs.id, jobId));
}
