const svgCaptcha = require("svg-captcha");
const { renderCaptchaWall } = require("../../nodejs-bouncer");

const currentCaptchaIpList = {};
let logger;

const generateCaptcha = (ip, captchaGenerationCacheDuration) => {
  const captcha = svgCaptcha.create();
  currentCaptchaIpList[ip] = {
    data: captcha.data,
    text: captcha.text,
    resolved: false,
  };
  setTimeout(() => {
    if (currentCaptchaIpList[ip]) {
      delete currentCaptchaIpList[ip];
    }
  }, captchaGenerationCacheDuration);
  logger.debug({ type: "GENERATE_CAPTCHA", ip });
};

module.exports = async (
  ip,
  req,
  res,
  next,
  captchaGenerationCacheDuration,
  captchaResolutionCacheDuration,
  loggerInstance
) => {
  logger = loggerInstance;
  let error = false;

  if (currentCaptchaIpList[ip] === undefined) {
    generateCaptcha(ip, captchaGenerationCacheDuration);
  } else {
    if (currentCaptchaIpList[ip] && currentCaptchaIpList[ip].resolved) {
      logger.debug({ type: "CAPTCHA_ALREADY_SOLVED", ip });
      next();
      return;
    } else {
      if (req.body && req.body.crowdsec_captcha) {
        if (req.body.refresh === "1") {
          generateCaptcha(ip, captchaGenerationCacheDuration);
        }
        if (req.body.phrase !== "") {
          if (currentCaptchaIpList[ip].text === req.body.phrase) {
            currentCaptchaIpList[ip].resolved = true;
            setTimeout(() => {
              if (currentCaptchaIpList[ip]) {
                delete currentCaptchaIpList[ip];
              }
            }, captchaResolutionCacheDuration);
            res.redirect(req.originalUrl);
            logger.info({ type: "CAPTCHA_RESOLUTION", ip, result: true });
            return;
          } else {
            logger.info({ type: "CAPTCHA_RESOLUTION", ip, result: false });
            error = true;
          }
        }
      }
    }
  }

  const captchaWallTemplate = await renderCaptchaWall({
    captchaImageTag: currentCaptchaIpList[ip].data,
    captchaResolutionFormUrl: "",
    error,
  });
  res.status(401);
  res.send(captchaWallTemplate);
};
