const { Address4, Address6 } = require("ip-address");
const { getLogger } = require("./lib/logger");
const {
  configure: configureClient,
  testConnectionToCrowdSec,
  getDecisionsMatchingIp,
} = require("./lib/restClient");
const { sortBy, map, last } = require("lodash");
const {
  ORDERED_REMEDIATIONS,
  BYPASS_REMEDIATION,
  BAN_REMEDIATION,
} = require("./lib/constants");

let fallbackRemediationValue;
let maxRemediationValue;
let captchaTextsValue;
let banTextsValue;
let colorsValue;
let hideCrowdsecMentionsValue;
let customCssValue;
let logger;

const configure = ({
  url,
  apiKey,
  userAgent,
  timeout = 2000,
  fallbackRemediation = BAN_REMEDIATION,
  maxRemediation = BAN_REMEDIATION,
}) => {
  logger = getLogger();
  configureClient({ url, apiKey, userAgent, timeout });
  fallbackRemediationValue = fallbackRemediation;
  maxRemediationValue = maxRemediation;
};

const getHigherRemediation = (decisions) => {
  if (!decisions.length) {
    logger.debug("No decision found.");
    return BYPASS_REMEDIATION;
  }

  const decisionTypes = map(decisions, (decision) => {
    if (ORDERED_REMEDIATIONS.indexOf(decision.type) === -1) {
      return fallbackRemediationValue;
    }
    return decision.type;
  });
  const orderedDecisionTypes = sortBy(decisionTypes, [
    (d) => ORDERED_REMEDIATIONS.indexOf(d),
  ]);
  const higherPriorityRemediation = last(orderedDecisionTypes);
  const maxRemediationIndex = ORDERED_REMEDIATIONS.indexOf(maxRemediationValue);

  if (
    ORDERED_REMEDIATIONS.indexOf(higherPriorityRemediation) >
    maxRemediationIndex
  ) {
    logger.debug("Max remediation reached.");
    return maxRemediationValue;
  }

  logger.debug("High priority found.");
  return higherPriorityRemediation;
};

const parseIpOrRange = (ip) => {
  try {
    return new Address4(ip);
  } catch (e4) {
    try {
      return new Address6(ip);
    } catch (e6) {
      throw new Error(`Input IP format: ${ip} is invalid`);
    }
  }
};

const getRemediationForIp = async (ip) => {
  const validatedIp = parseIpOrRange(ip);
  const decisions = await getDecisionsMatchingIp(
    validatedIp.startAddress().address
  );
  const remediation = getHigherRemediation(decisions);
  return remediation;
};
module.exports = {
  configure,
  testConnectionToCrowdSec,
  getRemediationForIp,
  parseIpOrRange,
};
