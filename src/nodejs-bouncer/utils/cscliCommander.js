const exec = require("child_process").exec;

const getCscliCommandPath = () => {
  const cscliPath = process.env.CSCLI_PATH;
  if (!cscliPath) {
    console.error(`
CSCLI_PATH was not found.
Before running this script, please set this environnement variable.
You can use "which cscli" to find it.

Example on linux:
export CSCLI_PATH=/usr/local/bin/cscli

or on MacOS:
export CSCLI_PATH="docker exec crowdsec cscli"
`);
    process.exit(1);
  }
  return cscliPath;
};

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
const execCscliCommand = (cmd, logger) => {
  logger.debug(cmd);
  const cscliPath = getCscliCommandPath();
  cmd = `${cscliPath} ${cmd}`;
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        logger.warn(error);
        reject(error);
      }
      const output = stdout ? stdout : stderr;
      logger.debug(output);
      resolve(output);
    });
  });
};

let logger;

const setLogger = async (loggerToSet) => {
  logger = loggerToSet;
};

const deleteAllDecisions = async () => {
  const deleteAllDecisions = await execCscliCommand(
    `decisions delete --all`,
    logger
  );
  logger.debug({ deleteAllDecisions });
};

const addDecision = ({ ipOrRange, duration = "4h", type }) => {
  const isIp = ipOrRange.indexOf("/") === -1;
  return execCscliCommand(
    `decisions add --${
      isIp ? "ip" : "range"
    } ${ipOrRange} --duration ${duration} --type ${type}`,
    logger
  );
};

const createBouncerKey = async (name = null) => {
  const keyName = name ? name : `test_${Math.random().toString(36).substr(2)}`;
  result = await execCscliCommand(
    `bouncers add ${keyName} --output json`,
    logger
  );
  return { bouncerKeyName: keyName, bouncerKey: JSON.parse(result) };
};
const deleteBouncerKey = (name) => {
  return execCscliCommand(`bouncers delete ${name}`, logger);
};

module.exports = {
  setLogger,
  deleteAllDecisions,
  addDecision,
  createBouncerKey,
  deleteBouncerKey,
};
