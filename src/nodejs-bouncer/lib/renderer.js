const { template, assignIn } = require("lodash");
const fs = require("fs");
const util = require("util");

const readRawFile = util.promisify(fs.readFile);

const generateTemplate = async (
  templateName,
  contentOptions,
  templateOptions = {}
) => {
  const templatePath = `${__dirname}/templates/${templateName}.ejs`;
  const content = await readRawFile(templatePath, "utf8");
  const compiled = template(content, templateOptions);
  return compiled(contentOptions);
};

const defaultColors = {
  text: {
    primary: "black",
    secondary: "#AAA",
    button: "white",
    error_message: "#b90000",
  },
  background: {
    page: "#eee",
    container: "white",
    button: "#626365",
    button_hover: "#333",
  },
};

const renderBanWall = async ({
  texts,
  colors,
  hideCrowdsecMentions,
  customCss,
}) => {
  const defaultTexts = {
    tabTitle: "Oops..",
    title: "🤭 Oh!",
    subtitle:
      "This page is protected against cyber attacks and your IP has been banned by our system.",
    footer: "",
  };
  texts = assignIn(defaultTexts, texts);
  colors = assignIn(defaultColors, colors);
  const content = await generateTemplate("ban", { texts, colors });
  return generateTemplate("base", {
    texts,
    colors,
    customCss,
    hideCrowdsecMentions,
    content,
    style: "",
  });
};
const renderCaptchaWall = async ({
  texts,
  colors,
  captchaImageTag,
  captchaResolutionFormUrl,
  error,
  hideCrowdsecMentions,
  customCss,
}) => {
  const defaultTexts = {
    tabTitle: "Oops..",
    title: "Hmm, sorry but...",
    subtitle: "Please complete the security check.",
    refresh_image_link: "refresh image",
    captcha_placeholder: "Type here...",
    send_button: "CONTINUE",
    error_message: "Please try again.",
    footer: "",
  };

  texts = assignIn(defaultTexts, texts);
  colors = assignIn(defaultColors, colors);
  const content = await generateTemplate("captcha", {
    texts,
    colors,
    captchaImageTag,
    captchaResolutionFormUrl,
    error,
  });
  const style = await generateTemplate("captcha-css", { colors });

  return generateTemplate("base", {
    texts,
    colors,
    customCss,
    hideCrowdsecMentions,
    content,
    style,
  });
};

module.exports = { renderBanWall, renderCaptchaWall };
