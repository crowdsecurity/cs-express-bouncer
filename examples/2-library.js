const { getLogger } = require("../src/nodejs-bouncer/lib/logger");
const {
  configure,
  testConnectionToCrowdSec,
  getRemediationForIp,
} = require("../src/nodejs-bouncer");
const {
  BAN_REMEDIATION,
  CAPTCHA_REMEDIATION,
} = require("../src/nodejs-bouncer/lib/constants");
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

    // Setup our library.

    apiKey = await createBouncerKey();
    const baseConfiguration = {
      url: "http://localhost:8080",
      apiKey: apiKey.bouncerKey,
      userAgent: "CrowdSec NodeJS bouncer/v0.0.1",
    };
    configure(baseConfiguration);

    // Test connection.

    const connectionTest = await testConnectionToCrowdSec();
    if (!connectionTest["success"]) {
      throw new Error(JSON.stringify(connectionTest));
    }

    // Compute remediation matching IP 3.4.5.6.

    const remediation = await getRemediationForIp("3.4.5.6");
    logger.info({ remediation });

    // Retrieve remediation matching IP 3.4.5.6 with max remediation set to captcha.

    configure({
      ...baseConfiguration,
      maxRemediation: CAPTCHA_REMEDIATION,
    });

    const maxRemediation = await getRemediationForIp("3.4.5.6");
    logger.info({ maxRemediation });

    // Retrieve remediation matching IP 3.4.5.6 with fallback remediation set to ban.

    await deleteAllDecisions();
    await addDecision({ ipOrRange: "3.4.5.6", type: "mfa" });

    configure({
      ...baseConfiguration,
      fallbackRemediation: BAN_REMEDIATION,
    });

    const fallbackRemediation = await getRemediationForIp("3.4.5.6");
    logger.info({ fallbackRemediation });
  } finally {
    await deleteBouncerKey(apiKey.bouncerKeyName);
  }
})();
