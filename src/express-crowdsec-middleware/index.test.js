const { getLogger } = require("../nodejs-bouncer/lib/logger");
const {
  enableMocks,
  mockResponseNoDecisions,
  mockResponseBan3456,
  mockResponseBan3456range30,
  mockResponseBan3456ipv6,
} = require("../nodejs-bouncer/lib/restClient.mock");
const {
  setLogger,
  addDecision,
  deleteAllDecisions,
  createBouncerKey,
  deleteBouncerKey,
} = require("../nodejs-bouncer/utils/cscliCommander");

const logger = getLogger();
setLogger(logger);

const crowdsecMiddlewareBuilder = require(".");

const USE_CROWDSEC_MOCKS =
  process.env.USE_CROWDSEC_MOCKS !== undefined
    ? !!parseInt(process.env.USE_CROWDSEC_MOCKS, 10)
    : true;

describe("Express CrowdSec Middleware", () => {
  let crowdsecMiddleware;

  const mockHttpRequestFrom3455 = { connection: { remoteAddress: "3.4.5.5" } };
  const mockHttpRequestFrom3456 = { connection: { remoteAddress: "3.4.5.6" } };
  const mockHttpRequestFrom3456ipv6 = {
    connection: { remoteAddress: "::ffff:3.4.5.6" },
  };
  const mockHttpRequestFrom4567 = { connection: { remoteAddress: "4.5.6.7" } };
  let mockResponse;

  let baseConfiguration = {
    url: "http://localhost:8080",
    userAgent: "CrowdSec NodeJS bouncer/v0.0.1",
  };

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
    mockResponse = {
      json: jest.fn(),
      status: jest.fn(),
      send: jest.fn(),
    };
    nextFunction = jest.fn();
    if (!USE_CROWDSEC_MOCKS) {
      await deleteAllDecisions();
    }
  });

  it("should bypass as there is no decision", async () => {
    // Setup CrowdSec context.
    crowdsecMiddleware = await crowdsecMiddlewareBuilder(baseConfiguration);
    if (USE_CROWDSEC_MOCKS) {
      mockResponseNoDecisions();
    }

    // Simulate HTTP call.
    await crowdsecMiddleware(
      mockHttpRequestFrom3456,
      mockResponse,
      nextFunction
    );

    // Expect the middleware to bypass.
    expect(mockResponse.json).not.toBeCalled();
    expect(nextFunction).toBeCalledTimes(1);
  });

  it("should compute a ban remediation for the IP 3.4.5.6", async () => {
    // Setup CrowdSec context.
    crowdsecMiddleware = await crowdsecMiddlewareBuilder(baseConfiguration);
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456();
    } else {
      await addDecision({ ipOrRange: "3.4.5.6", type: "ban" });
    }

    // Simulate HTTP call.
    await crowdsecMiddleware(
      mockHttpRequestFrom3456,
      mockResponse,
      nextFunction
    );

    // Expect the middleware to display the ban wall.
    expect(nextFunction).not.toBeCalled();
    expect(mockResponse.status).toBeCalledWith(403);
    expect(mockResponse.send).toBeCalledWith(
      expect.stringContaining("your IP has been banned")
    );
  });

  it('should bypass the ban remediation for the IP 3.4.5.6 as the "bypass" mode is enabled', async () => {
    // Setup CrowdSec context.
    crowdsecMiddleware = await crowdsecMiddlewareBuilder({
      ...baseConfiguration,
      bypass: true,
    });
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456();
    } else {
      await addDecision({ ipOrRange: "3.4.5.6", type: "ban" });
    }

    // Simulate HTTP call.
    await crowdsecMiddleware(
      mockHttpRequestFrom3456,
      mockResponse,
      nextFunction
    );

    // Expect the middleware to bypass.
    expect(mockResponse.json).not.toBeCalled();
    expect(nextFunction).toBeCalledTimes(1);
  });

  it("should compute a ban remediation for the IPv6 ::ffff:3.4.5.6", async () => {
    // Setup CrowdSec context.
    crowdsecMiddleware = await crowdsecMiddlewareBuilder(baseConfiguration);
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456ipv6();
    } else {
      await addDecision({ ipOrRange: "::ffff:3.4.5.6", type: "ban" });
    }

    // Simulate HTTP call.
    await crowdsecMiddleware(
      mockHttpRequestFrom3456ipv6,
      mockResponse,
      nextFunction
    );

    // Expect the middleware to display the ban wall.
    expect(nextFunction).not.toBeCalled();
    expect(mockResponse.status).toBeCalledWith(403);
    expect(mockResponse.send).toBeCalledWith(
      expect.stringContaining("your IP has been banned")
    );
  });

  it("should compute a ban remediation for the range 3.4.5.6/30", async () => {
    // Setup CrowdSec context.
    crowdsecMiddleware = await crowdsecMiddlewareBuilder(baseConfiguration);
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456range30();
    } else {
      await addDecision({ ipOrRange: "3.4.5.6/30", type: "ban" });
    }

    // Simulate HTTP call.
    await crowdsecMiddleware(
      mockHttpRequestFrom3455,
      mockResponse,
      nextFunction
    );

    // Expect the middleware to display the ban wall.
    expect(nextFunction).not.toBeCalled();
    expect(mockResponse.status).toBeCalledWith(403);
    expect(mockResponse.send).toBeCalledWith(
      expect.stringContaining("your IP has been banned")
    );

    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456range30();
      // Simulate HTTP call.
      await crowdsecMiddleware(
        mockHttpRequestFrom3456,
        mockResponse,
        nextFunction
      );

      // Expect the middleware to display the ban wall.
      expect(nextFunction).not.toBeCalled();
      expect(mockResponse.status).toBeCalledWith(403);
      expect(mockResponse.send).toBeCalledWith(
        expect.stringContaining("your IP has been banned")
      );
    }
  });

  it("should display customized ban wall", async () => {
    // Setup CrowdSec context.
    crowdsecMiddleware = await crowdsecMiddlewareBuilder({
      ...baseConfiguration,
      customCss: "body { background:black; }",
    });
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456();
    } else {
      await deleteAllDecisions();
      await addDecision({ ipOrRange: "4.5.6.7", type: "ban" });
    }

    // Simulate HTTP call.
    await crowdsecMiddleware(
      mockHttpRequestFrom4567,
      mockResponse,
      nextFunction
    );

    // Expect the middleware to display the ban wall
    expect(nextFunction).not.toBeCalled();
    expect(mockResponse.status).toBeCalledWith(403);
    expect(mockResponse.send).toBeCalledWith(
      expect.stringContaining("body { background:black; }")
    );
  });
});
