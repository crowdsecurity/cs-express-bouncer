const { getLogger } = require("../nodejs-bouncer/lib/logger");
const {
  enableMocks,
  mockResponseNoDecisions,
  mockResponseBan3456,
  mockResponseBan3456range30,
  mockResponseCaptcha3456,
  mockResponseMfa3456,
  mockResponseBan3456ipv6,
} = require("../nodejs-bouncer/lib/restClient.mock");
const {
  setLogger,
  addDecision,
  deleteAllDecisions,
  createBouncerKey,
  deleteBouncerKey,
} = require("../nodejs-bouncer/utils/cscliCommander");

const { CAPTCHA_REMEDIATION } = require("../nodejs-bouncer/lib/constants");

const logger = getLogger();
setLogger(logger);

const crowdsecMiddlewareBuilder = require(".");

const USE_CROWDSEC_MOCKS =
  process.env.USE_CROWDSEC_MOCKS !== undefined
    ? !!parseInt(process.env.USE_CROWDSEC_MOCKS, 10)
    : true;

const svgCaptcha = require("svg-captcha");
jest.mock("svg-captcha");
svgCaptcha.create.mockReturnValue({
  data: "captcha-image-for-1234",
  text: "1234",
});

jest.useFakeTimers();

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
    jest.runAllTimers();
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

  it("should handle a captcha remediation for the IP 3.4.5.6", async () => {
    // Setup CrowdSec context.
    crowdsecMiddleware = await crowdsecMiddlewareBuilder(baseConfiguration);
    if (USE_CROWDSEC_MOCKS) {
      mockResponseCaptcha3456();
    } else {
      await addDecision({ ipOrRange: "3.4.5.6", type: "captcha" });
    }

    // Simulate HTTP call.
    await crowdsecMiddleware(
      mockHttpRequestFrom3456,
      mockResponse,
      nextFunction
    );

    // Expect the middleware to display the captcha wall with a mocked captcha.
    expect(nextFunction).not.toBeCalled();
    expect(mockResponse.status).toBeCalledWith(401);
    expect(mockResponse.send).toBeCalledWith(
      expect.stringContaining("captcha-image-for-1234")
    );

    // Simulate wrong captcha filled

    mockResponse = {
      json: jest.fn(),
      status: jest.fn(),
      send: jest.fn(),
    };
    nextFunction = jest.fn();
    if (USE_CROWDSEC_MOCKS) {
      mockResponseCaptcha3456();
    } else {
      await addDecision({ ipOrRange: "3.4.5.6", type: "captcha" });
    }
    const mockHttpRequestFillWrongCaptchaFrom3456 = {
      connection: { remoteAddress: "3.4.5.6" },
      body: {
        phrase: "4321",
        crowdsec_captcha: "1",
        refresh: "0",
        originalUrl: "http://previous-page",
      },
    };
    await crowdsecMiddleware(
      mockHttpRequestFillWrongCaptchaFrom3456,
      mockResponse,
      nextFunction
    );

    // Expect the middleware to display the captcha wall with a mocked captcha.
    expect(nextFunction).not.toBeCalled();
    expect(mockResponse.status).toBeCalledWith(401);
    expect(mockResponse.send).toBeCalledWith(
      expect.stringContaining("Please try again")
    );

    // Simulate correct captcha filled

    mockResponse = {
      json: jest.fn(),
      status: jest.fn(),
      send: jest.fn(),
      redirect: jest.fn(),
    };
    nextFunction = jest.fn();
    if (USE_CROWDSEC_MOCKS) {
      mockResponseCaptcha3456();
    } else {
      await addDecision({ ipOrRange: "3.4.5.6", type: "captcha" });
    }
    const mockHttpRequestFillCorrectCaptchaFrom3456 = {
      connection: { remoteAddress: "3.4.5.6" },
      body: {
        phrase: "1234",
        crowdsec_captcha: "1",
        refresh: "0",
        originalUrl: "http://previous-page",
      },
    };
    await crowdsecMiddleware(
      mockHttpRequestFillCorrectCaptchaFrom3456,
      mockResponse,
      nextFunction
    );

    // Expect the middleware to bypass the road since the correct captcha has been filled.
    expect(mockResponse.redirect).toBeCalledTimes(1);
  });

  it('should retrieve the correct remediation for the IP 3.4.5.6, when we cap the max remediation to "captcha"', async () => {
    // Setup CrowdSec context.
    crowdsecMiddleware = await crowdsecMiddlewareBuilder({
      ...baseConfiguration,
      maxRemediation: CAPTCHA_REMEDIATION,
    });
    if (USE_CROWDSEC_MOCKS) {
      mockResponseBan3456();
    } else {
      await addDecision({ ipOrRange: "3.4.5.6", type: "ban" });
    }

    // Simulate HTTP call.
    nextFunction = jest.fn();
    await crowdsecMiddleware(
      mockHttpRequestFrom3456,
      mockResponse,
      nextFunction
    );

    // Expect the middleware to display the captcha wall.
    expect(nextFunction).not.toBeCalled();
    expect(mockResponse.status).toBeCalledWith(401);
    expect(mockResponse.send).toBeCalledWith(
      expect.stringContaining("Please complete the security check")
    );
  });

  it('should retrieve the correct remediation for the IP 4.5.6.7, when "fallback remediation" is set to "captcha"', async () => {
    // Setup CrowdSec context.
    crowdsecMiddleware = await crowdsecMiddlewareBuilder({
      ...baseConfiguration,
      fallbackRemediation: CAPTCHA_REMEDIATION,
    });
    if (USE_CROWDSEC_MOCKS) {
      mockResponseMfa3456();
    } else {
      await deleteAllDecisions();
      await addDecision({ ipOrRange: "4.5.6.7", type: "mfa" });
    }

    // Simulate HTTP call.
    await crowdsecMiddleware(
      mockHttpRequestFrom4567,
      mockResponse,
      nextFunction
    );

    // Expect the middleware to display the captcha wall.
    expect(nextFunction).not.toBeCalled();
    expect(mockResponse.status).toBeCalledWith(401);
    expect(mockResponse.send).toBeCalledWith(
      expect.stringContaining("Please complete the security check")
    );
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
