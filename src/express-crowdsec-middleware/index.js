const { getLogger } = require("../nodejs-bouncer/lib/logger");
const {
  configure,
  renderBanWall,
  testConnectionToCrowdSec,
  getRemediationForIp,
} = require("../nodejs-bouncer");

const {
  BYPASS_REMEDIATION,
  BAN_REMEDIATION,
} = require("../nodejs-bouncer/lib/constants");
let logger;

const applyBan = async (req, res) => {
  const banWallTemplate = await renderBanWall();
  res.status(403);
  res.send(banWallTemplate);
};

const applyRemediation = async (remediation, req, res, next) => {
  req.crowdSecRemediation = remediation;
  switch (remediation) {
    case BYPASS_REMEDIATION:
      next();
      break;
    case BAN_REMEDIATION:
      await applyBan(req, res);
      break;
    default:
      logger.error(`Unhandled remediation: ${remediation}`);
      break;
  }
};

module.exports = async ({
  url,
  apiKey,
  userAgent = "CrowdSec Express-NodeJS bouncer/v0.0.1",
  timeout = 2000,
  fallbackRemediation = BAN_REMEDIATION,
  maxRemediation = BAN_REMEDIATION,
  banTexts = {},
  colors = {},
  hideCrowdsecMentions = false,
  customCss = "",
  bypass = false,
  customLogger = null,
  bypassConnectionTest = false,
}) => {
  logger = customLogger ? customLogger : getLogger();
  configure({
    url,
    apiKey,
    userAgent,
    timeout,
    fallbackRemediation,
    maxRemediation,
    banTexts,
    colors,
    hideCrowdsecMentions,
    customCss,
  });

  if (!bypassConnectionTest) {
    const connectionTest = await testConnectionToCrowdSec();
    if (connectionTest["success"]) {
      logger.info(`CrowdSec API is reachable.`);
    } else {
      throw new Error(JSON.stringify(connectionTest));
    }
  }

  const crowdsecMiddleware = async (req, res, next) => {
    try {
      const ip = req.connection.remoteAddress;
      if (bypass) {
        logger.debug({ type: "BYPASSING_IP_VERIFICATION", ip });
        next();
        return;
      }
      const remediation = await getRemediationForIp(ip);
      logger.debug({ type: "VERIFY_IP", ip, remediation });

      await applyRemediation(remediation, req, res, next);
    } catch (err) {
      console.error(err);
      logger.warn({
        type: "CATCHED_ERROR",
        error: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      });
      next();
    }
  };
  return crowdsecMiddleware;
};
