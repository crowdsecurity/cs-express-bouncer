const { getLogger } = require("../src/nodejs-bouncer/lib/logger");
const {
  configure,
  testConnectionToCrowdSec,
  getDecisionsMatchingIp,
} = require("../src/nodejs-bouncer/lib/restClient");
const {
  setLogger,
  addDecision,
  deleteAllDecisions,
  createBouncerKey,
  deleteBouncerKey,
} = require("../src/nodejs-bouncer/utils/cscliCommander");

let apiKey;

(async () => {
  try {
    const logger = getLogger("debug");
    setLogger(logger);

    // Set CrowdSec context.

    await deleteAllDecisions();
    await addDecision({ ipOrRange: "3.4.5.6", type: "ban" });

    // Setup our client.

    apiKey = await createBouncerKey();
    configure({
      url: "http://localhost:8080",
      apiKey: apiKey.bouncerKey,
      userAgent: "CrowdSec NodeJS bouncer/v0.0.1",
    });

    // Test connection
    const connectionTest = await testConnectionToCrowdSec();
    if (!connectionTest["success"]) {
      throw new Error(JSON.stringify(connectionTest));
    }

    // Retrieve decisions matching IP 3.4.5.6
    const decisionsMatching3456 = await getDecisionsMatchingIp("3.4.5.6");
    logger.info({ decisionsMatching3456 });
  } finally {
    await deleteBouncerKey(apiKey.bouncerKeyName);
  }
})();
