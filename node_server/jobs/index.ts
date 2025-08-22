import cron from "node-cron";
import { runStepSyncJob } from './stepSyncJob.js';
import { runEndCompetitionJob } from './endCompetitionJob.js';
import { runSyncStepScheduler } from './syncStepScheduler.js';


export function runAllJobs() {
    console.log('Starting all jobs...');
    // stepSyncJob: Run step sync job every minute
    runStepSyncJob();
    cron.schedule("* * * * *", runStepSyncJob);

    // endCompetitionJob: Run end competition job every minute
    runEndCompetitionJob();
    cron.schedule("* * * * *", runEndCompetitionJob);

    // syncStepScheduler: Moving from firebase, run every minute
    // also runs 1v1 end handling job
    runSyncStepScheduler();
    cron.schedule("* * * * *", runSyncStepScheduler);
}