const { getLogger } = require("./lib/logger");
const {
  enableMocks,
  mockSuccessResponse,
  mockResponseBan3456,
  mockResponseBan3456ipv6,
  mockResponseBan3456range30,
  mockResponseMfa3456,
} = require("./lib/restClient.mock");
const {
  setLogger,
  addDecision,
  deleteAllDecisions,
  createBouncerKey,
  deleteBouncerKey,
} = require("./utils/cscliCommander");

const { CAPTCHA_REMEDIATION, BAN_REMEDIATION } = require("./lib/constants");

const {
  configure,
  testConnectionToCrowdSec,
  getRemediationForIp,
} = require(".");

const logger = getLogger();
setLogger(logger);

let baseConfiguration = {
  url: "http://localhost:8080",
  userAgent: "CrowdSec NodeJS bouncer/v0.0.1",
};

const USE_CROWDSEC_MOCKS =
  process.env.USE_CROWDSEC_MOCKS !== undefined
    ? !!parseInt(process.env.USE_CROWDSEC_MOCKS, 10)
    : true;

describe("NodeJS library", () => {
  let apiKey;
  if (USE_CROWDSEC_MOCKS) {
    enableMocks();
  } else {
    beforeAll(async () => {
      apiKey = await createBouncerKey();
      baseConfiguration.apiKey = apiKey.bouncerKey;
    });
    afterAll(async () => {
      await deleteBouncerKey(apiKey.bouncerKeyName);
    });
  }

  beforeEach(async () => {
    if (!USE_CROWDSEC_MOCKS) {
      await deleteAllDecisions();
    }
  });

  it("should be configured", async () => {
    configure(baseConfiguration);
  });

  it("should test connection to LAPI", async () => {
    if (USE_CROWDSEC_MOCKS) {
      mockSuccessResponse();
    }
    expect(async () => {
      const connectionTest = await testConnectionToCrowdSec();
      expect(connectionTest["success"]).toBeTruthy();
    }).not.toThrow();
  });

  it("should compute the correct remediation for the IP 3.4.5.6", async () => {
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456();
    } else {
      await addDecision({ ipOrRange: "3.4.5.6", type: "ban" });
    }
    const remediation = await getRemediationForIp("3.4.5.6");
    expect(remediation).toBe("ban");
  });

  it("should compute the correct remediation for the IPv6 ::ffff:3.4.5.6", async () => {
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456ipv6();
    } else {
      await addDecision({ ipOrRange: "::ffff:3.4.5.6", type: "ban" });
    }
    const remediation = await getRemediationForIp("::ffff:3.4.5.6");
    expect(remediation).toBe("ban");
  });

  it("should compute the correct remediation for the range 3.4.5.6/30", async () => {
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456range30();
    } else {
      await addDecision({ ipOrRange: "3.4.5.6/30", type: "ban" });
    }
    const remediation = await getRemediationForIp("3.4.5.5");
    expect(remediation).toBe("ban");
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456range30();
    }
    const remediation2 = await getRemediationForIp("3.4.5.6");
    expect(remediation2).toBe("ban");
  });

  it('should retrieve the correct remediation for the IP 3.4.5.6, when "fallback remediation" is set to "ban"', async () => {
    if (USE_CROWDSEC_MOCKS) {
      mockResponseMfa3456();
    } else {
      await deleteAllDecisions();
      await addDecision({ ipOrRange: "3.4.5.6", type: "mfa" });
    }

    configure({
      ...baseConfiguration,
      fallbackRemediation: BAN_REMEDIATION,
    });
    const fallbackRemediation = await getRemediationForIp("3.4.5.6");
    expect(fallbackRemediation).toBe("ban");
  });
});
