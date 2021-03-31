const { parseIpOrRange } = require("../../nodejs-bouncer");

const onlyUnique = (value, index, self) => self.indexOf(value) === index;

const parseXffHeaderToGetTheIpToTrust = (headerValue) => {
  const strValues = headerValue.split(",");
  const uniqueStrValues = strValues.filter(onlyUnique);
  const ipList = uniqueStrValues.map((str) => str.trim());
  const ip = ipList[ipList.length - 1];
  parseIpOrRange(ip);
  return ip;
};

const isWithlistedProxy = (ip, trustedRangesForIpForwarding) => {
  const rangesIncludingThisIp = trustedRangesForIpForwarding.filter((range) =>
    parseIpOrRange(ip).isInSubnet(parseIpOrRange(range))
  );
  return rangesIncludingThisIp.length > 0;
};

const getRealIp = (req, trustedRangesForIpForwarding, logger) => {
  const remoteIp = req.connection.remoteAddress;
  try {
    if (!req.headers) {
      return remoteIp;
    }
    const xffHeader = req.headers["x-forwarded-for"];
    if (!xffHeader) {
      return remoteIp;
    }
    if (!isWithlistedProxy(remoteIp, trustedRangesForIpForwarding)) {
      logger.warn({
        type: "FAKE_FORWARDED_FOR_USED",
        remoteIp,
        xffHeader,
      });
      return remoteIp;
    }
    const forwardedIp = parseXffHeaderToGetTheIpToTrust(xffHeader);

    logger.debug({
      type: "IP_BEHIND_WHITELISTED_PROXY",
      forwardedIp,
      remoteIp,
    });
    return forwardedIp;
  } catch (err) {
    console.error(err);
    logger.warn({
      type: "CATCHED_ERROR_WHILE_FORWARDING_IP",
      error: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
    return remoteIp;
  }
};

module.exports = { getRealIp };
