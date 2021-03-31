const {
  configure,
  testConnectionToCrowdSec,
  getDecisionsMatchingIp,
} = require("./restClient");
const {
  enableMocks,
  mockSuccessResponse,
  mockResponseBan3456,
  mockResponseBan3456ipv6,
  mockResponseBan3456range30,
} = require("./restClient.mock");

const { getLogger } = require("./logger");
const {
  setLogger,
  addDecision,
  deleteAllDecisions,
  createBouncerKey,
  deleteBouncerKey,
} = require("../utils/cscliCommander");
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

describe("Rest Client", () => {
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

  it("should configure", async () => {
    configure(baseConfiguration);
  });

  it("should test connection", async () => {
    if (USE_CROWDSEC_MOCKS) {
      mockSuccessResponse();
    }

    expect(async () => {
      const connectionTest = await testConnectionToCrowdSec();
      expect(connectionTest["success"]).toBeTruthy();
    }).not.toThrow();
  });

  it("should retrieve ban decisions matching IP 3.4.5.6", async () => {
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456();
    } else {
      await addDecision({ ipOrRange: "3.4.5.6", type: "ban" });
    }

    const decisionsMatching3456 = await getDecisionsMatchingIp("3.4.5.6");
    expect(decisionsMatching3456).toHaveLength(1);
    expect(decisionsMatching3456[0]["type"]).toBe("ban");
    expect(decisionsMatching3456[0]["value"]).toBe("3.4.5.6");
  });
  it("should retrieve ban decisions matching IPv6 ::ffff:3.4.5.6", async () => {
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456ipv6();
    } else {
      await addDecision({ ipOrRange: "::ffff:3.4.5.6", type: "ban" });
    }

    const decisionsMatching3456ipv6 = await getDecisionsMatchingIp(
      "::ffff:3.4.5.6"
    );
    expect(decisionsMatching3456ipv6.length).toBeGreaterThanOrEqual(1);
    expect(decisionsMatching3456ipv6[0]["type"]).toBe("ban");
  });

  it("should retrieve decisions matching range 3.4.5.6/30", async () => {
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456range30();
    } else {
      await addDecision({ ipOrRange: "3.4.5.6/30", type: "ban" });
    }

    const decisionsMatching3455 = await getDecisionsMatchingIp("3.4.5.5");
    expect(decisionsMatching3455.length).toBeGreaterThanOrEqual(1);
    expect(decisionsMatching3455[0]["type"]).toBe("ban");
    expect(decisionsMatching3455[0]["value"]).toBe("3.4.5.6/30");

    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456range30();
    }

    const decisionsMatching3456 = await getDecisionsMatchingIp("3.4.5.6");
    expect(decisionsMatching3456.length).toBeGreaterThanOrEqual(1);
    expect(decisionsMatching3456[0]["type"]).toBe("ban");
  });
});
