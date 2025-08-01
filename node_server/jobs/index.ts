import { runStepSyncJob } from './stepSyncJob.js';
import { runEndCompetitionJob } from './endCompetitionJob.js';


export function runAllJobs() {
    console.log('Starting all jobs...');
    // stepSyncJob: Run step sync job every minute
    runStepSyncJob();
    setInterval(runStepSyncJob, 60 * 1000);

    // endCompetitionJob: Run end competition job every minute
    runEndCompetitionJob();
    setInterval(runEndCompetitionJob, 60 * 1000);
}