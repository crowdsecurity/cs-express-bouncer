const jestFetchMock = require("jest-fetch-mock");
const enableMocks = () => jestFetchMock.enableMocks();
const mockResponseOnce = (data, status = 200) =>
  fetch.mockResponseOnce(JSON.stringify(data), { status });

const mockSuccessResponse = () => mockResponseOnce({});

const mockResponseNoDecisions = () => mockResponseOnce([]);

const mockResponseBan3456 = () =>
  mockResponseOnce([
    {
      duration: "3h59m59.474184s",
      id: 1,
      origin: "cscli",
      scenario:
        "manual 'ban' from 'f5a39cbb91d64374ba3a2eb07b9f3d3dPHj68N8dlsNXpPiw'",
      scope: "Ip",
      type: "ban",
      value: "3.4.5.6",
    },
  ]);

const mockResponseBan3456ipv6 = () =>
  mockResponseOnce([
    {
      duration: "3h59m59.474184s",
      id: 1,
      origin: "cscli",
      scenario:
        "manual 'ban' from 'f5a39cbb91d64374ba3a2eb07b9f3d3dPHj68N8dlsNXpPiw'",
      scope: "Ip",
      type: "ban",
      value: "::ffff:3.4.5.6",
    },
  ]);

const mockResponseBan3456range30 = () =>
  mockResponseOnce([
    {
      duration: "3h59m59.474184s",
      id: 1,
      origin: "cscli",
      scenario:
        "manual 'ban' from 'f5a39cbb91d64374ba3a2eb07b9f3d3dPHj68N8dlsNXpPiw'",
      scope: "Ip",
      type: "ban",
      value: "3.4.5.6/30",
    },
  ]);

const mockResponseCaptcha3456 = () =>
  mockResponseOnce([
    {
      duration: "3h59m59.474184s",
      id: 1,
      origin: "cscli",
      scenario:
        "manual 'captcha' from 'f5a39cbb91d64374ba3a2eb07b9f3d3dPHj68N8dlsNXpPiw'",
      scope: "Ip",
      type: "captcha",
      value: "3.4.5.6",
    },
  ]);
const mockResponseMfa3456 = () =>
  mockResponseOnce([
    {
      duration: "3h59m59.2641115s",
      id: 45,
      origin: "cscli",
      scenario:
        "manual 'mfa' from 'bd02658d191c484da87420dc3b6db58d2sNCadaBRhDndIM8'",
      scope: "Ip",
      type: "mfa",
      value: "3.4.5.6",
    },
  ]);

module.exports = {
  enableMocks,
  mockSuccessResponse,
  mockResponseNoDecisions,
  mockResponseBan3456,
  mockResponseBan3456ipv6,
  mockResponseBan3456range30,
  mockResponseCaptcha3456,
  mockResponseMfa3456,
};
