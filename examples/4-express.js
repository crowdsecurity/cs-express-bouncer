const { getLogger } = require("../src/nodejs-bouncer/lib/logger");
const express = require("express");
const bodyParser = require("body-parser");
const crowdsecMiddleware = require("../src/express-crowdsec-middleware");
const {
  setLogger,
  addDecision,
  deleteAllDecisions,
  createBouncerKey,
  deleteBouncerKey,
} = require("../src/nodejs-bouncer/utils/cscliCommander");

let apiKey;

// Delete bouncer key when leaving
process.stdin.resume(); //so the program will not close instantly
const exitHandler = async (options, exitCode) => {
  if (options.cleanup) {
    await deleteBouncerKey(apiKey.bouncerKeyName);
  }
  if (exitCode || exitCode === 0) console.log(exitCode);
  if (options.exit) process.exit();
};
process.on("exit", exitHandler.bind(null, { cleanup: true }));
process.on("SIGINT", exitHandler.bind(null, { exit: true })); //catches ctrl+c event
// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));
//catches uncaught exceptions
process.on("uncaughtException", exitHandler.bind(null, { exit: true }));

(async () => {
  const logger = getLogger("debug");
  setLogger(logger);

  // Prepare CrowdSec context.

  await deleteAllDecisions();
  await addDecision({ ipOrRange: "::ffff:127.0.0.1", type: "ban" });
  //await addDecision({ ipOrRange: '::ffff:127.0.0.1', type: 'captcha' });

  // Configure CrowdSec Middleware.

  apiKey = await createBouncerKey();
  const url = "http://localhost:8080";

  // Configure Express server.

  const app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(
    await crowdsecMiddleware({
      url,
      apiKey: apiKey.bouncerKey,
      customCss: "body { background:#EEE; }", // CSS code to customize walls
      //bypass: true, // To enable or disable the bouncing
      //fallbackRemediation = BAN_REMEDIATION, // The remediation to use when the received one is unknown
      //userAgent = 'CrowdSec Express-NodeJS bouncer/v0.0.1', // To use a custom bouncer user agent when requesting LAPI
      //timeout = 2000, // The timeout when requesting LAPI
      //fallbackRemediation = BAN_REMEDIATION, // The remediation to use when the received one is unknown
      //maxRemediation = BAN_REMEDIATION, // The maximum remediation to use (flex mode)
      //banTexts = {}, // To change the text displayed on the BAN wall
      //colors = {}, // To change the colors of the BAN and CAPTCHA walls
      //captchaTexts = {}, // To change the text displayed on the CAPTCHA wall
      //captchaGenerationCacheDuration = 60 * 1000, // The minimum time between two CAPTCHA generations for a same IP
      //captchaResolutionCacheDuration = 30 * 60 * 1000, // The time a resolved captcha should be resolved one more time if the "captcha" decision is still active
      //hideCrowdsecMentions = false, // To display or hide CrowdSec mention on the walls
      //customLogger = null // You can use a custom Winston logger
      //trustedRangesForIpForwarding = [] // The list of IPs to trust as proxies
      //bypassConnectionTest = [] // To bypass the connection test at middleware initialization
    })
  );

  // Create a route.

  app.all("/", function (req, res) {
    res.status(200).send(`
    <style>* {font-family:sans-serif;}</style>
    <h1>Hello world from ${req.method}</h1>
    <p>You just ran a ${req.method} request on this Express server with the <strong>CrowdSec middleware</strong> enabled.</p>
    <form action="/" method="post"><button>Test a POST request</button></form>
    <form action="/" method="get"><button>Test a GET request</button></form>
            `);
  });

  // Start server.

  app.listen(3000);
  console.log(`
    Express server configured with Crowdsec middleware available here:
    
    http://127.0.0.1:3000
    
    `);
})();
