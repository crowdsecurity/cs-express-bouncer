const parseExpiration = (duration) => {
  const re = /(-?)(?:(?:(\d+)h)?(\d+)m)?(\d+).\d+(m?)s/m;
  const matches = duration.match(re);
  if (!matches.length) {
    throw new Error(`Unable to parse the following duration: ${duration}.`);
  }
  let seconds = 0;
  if (matches[2] !== undefined) {
    seconds += parseInt(matches[2]) * 3600; // hours
  }
  if (matches[3] !== undefined) {
    seconds += parseInt(matches[3]) * 60; // minutes
  }
  if (matches[4] !== undefined) {
    seconds += parseInt(matches[4]); // seconds
  }
  if ("m" === parseInt(matches[5])) {
    // units in milliseconds
    seconds *= 0.001;
  }
  if ("-" === parseInt(matches[1])) {
    // negative
    seconds *= -1;
  }
  seconds = parseInt(Math.round(seconds));
  const expiration = new Date();
  expiration.setSeconds(expiration.getSeconds() + seconds);
  return expiration;
};

module.exports = { parseExpiration };
