const { getLogger } = require("../src/nodejs-bouncer/lib/logger");
const {
  configure,
  renderBanWall,
  renderCaptchaWall,
} = require("../src/nodejs-bouncer");
const {
  setLogger,
  createBouncerKey,
  deleteBouncerKey,
} = require("../src/nodejs-bouncer/utils/cscliCommander");
const svgCaptcha = require("svg-captcha");

let apiKey;

(async () => {
  try {
    const logger = getLogger("debug");
    setLogger(logger);

    apiKey = await createBouncerKey();
    const baseConfiguration = {
      url: "http://localhost:8080",
      apiKey: apiKey.bouncerKey,
      userAgent: "CrowdSec NodeJS bouncer/v0.0.1",
    };
    configure(baseConfiguration);

    // Get ban wall template.

    const banWallTemplate = await renderBanWall({
      customCss: "body { background:red; }",
    });
    logger.info({ banWallTemplate });

    // Get captcha wall template.

    const captchaResolutionFormUrl = "/captcha";
    const error = true;

    const captcha = svgCaptcha.create();
    logger.info({ text: captcha.text });

    const captchaWallTemplate = await renderCaptchaWall({
      customCss: "body { background:black; }",
      captchaImageTag: captcha.data,
      captchaResolutionFormUrl,
      error,
    });
    logger.info({ captchaWallTemplate });
  } finally {
    await deleteBouncerKey(apiKey.bouncerKeyName);
  }
})();
