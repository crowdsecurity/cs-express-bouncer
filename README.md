# CrowdSec Express JS Bouncer

![CrowdSec Express Bouncer](https://github.com/crowdsecurity/cs-express-bouncer/raw/main/docs/assets/banner.png "CrowdSec Express Bouncer")

CrowdSec is composed of a behavior detection engine, able to block classical attacks like credential bruteforce, port scans, web scans, etc.

Based on the type and number of blocked attacks, and after curation of those signals to avoid false positives and poisoning, a global IP reputation DB is maintained and shared with all network members.

Get more info on the [CrowdSec official website](https://crowdsec.net/).

This Express middleware is a “bouncer”, which purpose is to block detected attacks with two remediation systems: ban or challenge detected attackers with a Captcha.

# Included features

Here is the exhaustive list of bouncer features.

- [x] **Block access or offer to fill in a captcha** Our bouncer is able to block access or present a captcha (a.k.a. _ban wall_ and _captcha wall_).
- [x] **Customizable wall pages** This bouncer allows you to customize the visual aspect of the ban page and the captcha form (these two pages are called "wall"). You can therefore customize the colors of these pages, modify the texts and translations and even add your own CSS stylesheet if necessary.
- [x] **Flex mode** : For certain specific uses such as online commerce, it is preferable to never block the user and, in the worst case, you should offer to fill out a captcha. We call this feature "flex mode".
- [x] **Support IPv4 and IPv6** : Our bouncer supports both IPv4 and IPv6
- [x] **Remedy IPs or IP ranges** : Decisions from CrowdSec may concern single IPs or ranges of IPs
- [x] **Support for unknown remediations** Designed to be extensible, CrowdSec allows you to create as many types of remedies as necessary. Our bouncer can handle all these types of remedies, even those that the bouncer does not yet know.
- [x] **CDN Whitelisting** : When using CDN, the user's IP is hidden behind the CDN. Fortunately the CDN still transmits the IP through a specific header. To avoid IP spoofing through this header, the bouncer can believe this header only if the CDN IP is included in a list filtered by the bouncer user.
- [x] **Bypass mode** : Allow the user to temporarily disable bouncing to meet specific needs.
- [x] **Events logger** : To be _Production ready_, we have implemented a log system. This will also allow you to consult the bouncer usage metrics later. We use the popular library [Winston](https://github.com/winstonjs/winston#readme)

## How to use this Express middleware

> Note: You must first have CrowdSec installed on your server. The [installation is very simple](https://doc.crowdsec.net/Crowdsec/v1/getting_started/installation/#installation).



First, install the **Crowdsec Bouncer** express middleware:

```bash
npm install @crowdsec/express-bouncer
```

or

```bash
yarn add @crowdsec/express-bouncer
```

Then init the Express middleware. Here is a quick usage example.

```javascript
const express = require("express");
const bodyParser = require("body-parser");
const expressCrowdsecBouncer = require("@crowdsec/express-bouncer");

(async () => {
  // Configure CrowdSec Middleware.
  const crowdsecMiddleware = await expressCrowdsecBouncer({
    url: "http://localhost:8080",
    apiKey: "INSERT_YOUR_BOUNCER_API_KEY",
  });

  // Configure Express server.
  const app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(crowdsecMiddleware);

  // Create an example route.
  app.all("/", function (req, res) {
    res.status(200).send(`The way is clear!`);
  });

  // Start server.
  app.listen(3000);
  console.log(
    `Express server configured with Crowdsec middleware available here: http://127.0.0.1:3000`
  );
})();
```
> Note: To get a _bouncer API key_, just type `cscli bouncers add express-js-bouncer` (you can replace the name `express-js-bouncer` by anything you prefer).

## Configuration

Here is the full list of parameters than can be passed to `expressCrowdsecBouncer`.

| Name                             | Description                                                                          | Type           | Default                                    |
| -------------------------------- | ------------------------------------------------------------------------------------ | -------------- | ------------------------------------------ |
| `url` (required)                 | The URL of your LAPI instance. Ex: "http://localhost:8080"                           | string         | -                                          |
| `apiKey` (required)              | The bouncer key (generated via cscli)                                                | string         | -                                          |
| `fallbackRemediation`            | The remediation to use when the received one is unknown                              | Constant \*    | `BAN_REMEDIATION`                          |
| `maxRemediation`                 | The maximum remediation to use (flex mode)                                           | Constant \*    | `BAN_REMEDIATION`                          |
| `bypass`                         | To enable or disable the bouncing                                                    | boolean        | `false`                                    |
| `captchaTexts`                   | To change the text displayed on the CAPTCHA wall                                     | object         | view below \*\*                            |
| `banTexts`                       | To change the text displayed on the BAN wall                                         | object         | view below \*\*\*                          |
| `colors`                         | To change the colors of the BAN and CAPTCHA walls                                    | object         | view below \*\*\*\*                        |
| `customCss`                      | CSS code to customize ban and captcha walls                                          | string         | `""`                                       |
| `userAgent`                      | To use a custom bouncer user agent when requesting LAPI                              | string         | `"CrowdSec Express-NodeJS bouncer/vx.x.x"` |
| `timeout`                        | The timeout when requesting LAPI                                                     | number         | `2000`                                     |
| `captchaGenerationCacheDuration` | The minimum time between two CAPTCHA generations for a same IP                       | number         | `60 * 1000`                                |
| `captchaResolutionCacheDuration` | The time we can consider a captcha as resolved (during an active "captcha" decision) | number         | `30 * 60 * 1000`                           |
| `hideCrowdsecMentions`           | To display or hide CrowdSec mention on the BAN and CAPTCHA walls                     | boolean        | `false`                                    |
| `customLogger`                   | You can use a custom Winston logger                                                  | Winston logger | default logger                             |
| `bypassConnectionTest`           | To bypass the connection test at middleware initialization                           | boolean        | false                                      |
| `trustedRangesForIpForwarding`   | The list of IPs to trust as proxies                                                  | array<string>  | []                                         |

> \*: All remediation type are constants and they can be found: [`express-crowdsec-bouncer/src/nodejs-bouncer/lib/constants.js`](src/nodejs-bouncer/lib/constants.js).

> \*\*: `captchaTexts` default value:

```json
{
  "tabTitle": "Oops..",
  "title": "Hmm, sorry but...",
  "subtitle": "Please complete the security check.",
  "refresh_image_link": "refresh image",
  "captcha_placeholder": "Type here...",
  "send_button": "CONTINUE",
  "error_message": "Please try again.",
  "footer": ""
}
```

> \*\*\*: `banTexts` default value:

```json
{
  "tabTitle": "Oops..",
  "title": "🤭 Oh!",
  "subtitle": "This page is protected against cyber attacks and your IP has been banned by our system.",
  "footer": ""
}
```

> \*\*\*\*: `colors` default value:

```json
{
  "text": {
    "primary": "black",
    "secondary": "#AAA",
    "button": "white",
    "error_message": "#b90000"
  },
  "background": {
    "page": "#eee",
    "container": "white",
    "button": "#626365",
    "button_hover": "#333"
  }
}
```

## FAQ

### What do I need to make CrowdSec work?

- You have to install a CrowdSec instance on this server.
- You have to generate a bouncer key on the server on which CrowdSec is running.

## MIT Licence

[MIT Licence](./LICENCE)
