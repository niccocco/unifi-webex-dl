const config = require('./helpers/config');
const { loginMoodle, getWebexLaunchOptions } = require('./helpers/moodle');
const { launchWebex, getWebexRecordings, getWebexRecording } = require('./helpers/webex');
const logger = require('./helpers/logging')('app');
const { join } = require('path');
const { existsSync } = require('fs');
const { exit } = require('process');

(async () => {
    try {
        // get moodle credentials and courses ids
        logger.info('Loading configs');
        let configs = await config.load('./config.json');

        // login to moodle
        logger.info('Logging into Moodle');
        const moodleSession = await loginMoodle(configs.credentials.username, configs.credentials.password);

        for (const id of configs.courses_ids) {
            logger.info(`Working on course: ${id}`);

            // Launch webex
            let launchParameters = await getWebexLaunchOptions(moodleSession, id);
            if (launchParameters === null) {
                logger.warn('└─ Webex id not found... Skipping');
            }
            let webexObject = await launchWebex(launchParameters);

            // Get recordings
            let recordings = await getWebexRecordings(webexObject);
            logger.info(`└─ Found ${recordings.length} recordings`);

            // Get all not alredy downloaded recordings
            //TODO: implement multiple downloads at once
            for (let idx = 0; idx < recordings.length; idx++) {
                const recording = recordings[idx];
                let downloadPath = join(configs.base_path, recording.name);
                let divider = idx == recordings.length-1 ? '└' : '├';

                if (!existsSync(downloadPath)) {
                    logger.info(`   ${divider}─ Downloading: ${recording.name}`);
                    await getWebexRecording(recording.file_url, recording.password, downloadPath);
                    exit(0);
                } else {
                    logger.info(`   ${divider}─ Skipping: ${recording.name}`);
                }
            }

            logger.info('Done');
        }
    } catch (err) {
        logger.error(err);
    }
})();
