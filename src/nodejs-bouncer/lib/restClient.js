require("isomorphic-fetch");
const { parseExpiration } = require("./parseExpiration");

let query = null;

const configure = ({ url: baseUrl, apiKey, userAgent, timeout = 2000 }) => {
  query = async (endpoint, method = "GET") => {
    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method,
      mode: "no-cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "User-Agent": userAgent,
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      credentials: "include",
    });
    const result = { status: response.status };
    if (method !== "HEAD") {
      result.data = await response.json();
      //console.dir({ url, data: JSON.stringify(result.data) }, { depth: null });
    }
    return result;
  };
};

const parseDecision = (d) => ({
  ...d,
  expiration: parseExpiration(d.duration),
});

const getDecisionsMatchingIp = async (ip) => {
  const response = await query(`/v1/decisions?ip=${ip}`);
  if (response.data === null) {
    return {};
  }
  return response.data.map(parseDecision);
};

const testConnectionToCrowdSec = async () => {
  try {
    const result = await query(`/v1/decisions`, "HEAD");
    switch (result.status) {
      case 200:
        return { success: true };
      case 403:
        return { success: false, error: "UNEXPECTED_KEY" };
      default:
        return {
          success: false,
          error: "UNEXPECTED_STATUS_CODE",
          statusCode: result.statusCode,
        };
    }
  } catch (e) {
    console.error(e);
    return { success: false, error: "HOST_NOT_REACHABLE" };
  }
};

module.exports = {
  configure,
  testConnectionToCrowdSec,
  getDecisionsMatchingIp,
};
