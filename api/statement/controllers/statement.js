"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const { v4: uuidv4 } = require("uuid");
const _ = require("lodash");
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const convertRestQueryParams = require("strapi-utils/lib/convert-rest-query-params");
const moment = require("moment"); // require
const IF_MATCH = "http_if_match";
const IF_NONE_MATCH = "http_if_none_match";

const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

const parseRequest = (request, moreId = null) => {
  const rObj = {};
  rObj.body = { ...request.body };
  rObj.headers = getHeaders(request.headers);

  rObj.params = {};
  if (request.method === "POST" && request.query.method) {
    // parse CORS
    parseCorsRequest(request, rObj);
  } else {
    // Parse normal
    parseNormalRequest(request, rObj);
  }
  rObj.domain = request.headers.host;
  rObj.scheme = request.secure ? "https" : "http";
  rObj.auth = { ...request.auth };

  return rObj;
};

const parseCorsRequest = (request, rObj) => {
  try {
    rObj.method = request.query.method.toLowerCase();
  } catch {
    return "Could not find method parameter for CORS request";
  }
  if (Object.keys(request.query).length > 1) {
    return "CORS must only include method in query string parameters";
  }
  rObj.body = request.body;
  rObj.params = request.body;
};

const parseNormalRequest = (request, rObj) => {
  if (request.method === "POST" || request.method === "PUT") {
    if (rObj.headers.contentType) {
      if (rObj.headers.contentType.includes("multipart/mixed")) {
        // process parse attactment
      } else {
        rObj.rawBody = JSON.stringify(request.body);
      }
    }
  } else if (request.method === "DELETE") {
    if (request.body !== "") {
      rObj.params = request.body;
    }
  }
  rObj.params = request.query;
  rObj.method = request.method;
};

const getHeaders = (headers) => {
  let headerObj = {};
  if (headers.http_updated) {
    try {
      headerObj.updated = moment(popObject(headers, "http_updated")).format(
        "DD-MM-YYYY"
      );
    } catch {}
  } else if (headers.updated) {
    try {
      headerObj.updated = moment(popObject(headers, "updated")).format(
        "DD-MM-YYYY"
      );
    } catch {}
  }
  headerObj.contentType = popObject(headers, "content_type");
  if (
    (!headerObj.contentType || headerObj.contentType === "") &&
    headers["content-type"]
  ) {
    headerObj.contentType = popObject(headers, "content-type");
  }
  if (headerObj.contentType && headerObj.contentType !== "") {
    if (
      headerObj.contentType.includes(";") &&
      !headerObj.contentType.includes("boundary")
    ) {
      headerObj.contentType = headerObj.contentType.split(";")[0];
    }
  }
  headerObj.etag = getEtagInfo(headers);

  if ("http_authorization" in headers) {
    headerObj.authorization = headers["http_authorization"];
  } else if ("authorization" in headers) {
    headerObj.authorization = headers["authorization"];
  }

  if ("accept_language" in headers) {
    headerObj.language = popObject(headers, "accept_language");
  } else if ("accept-language" in headers) {
    headerObj.language = popObject(headers, "accept-language");
  } else if ("http_accept_language" in headers) {
    headerObj.language = popObject(headers, "http_accept_language");
  }
  if (headers["x-experience-api-version"]) {
    headerObj["x-experience-api-version"] = popObject(
      headers,
      "x-experience-api-version"
    );
  }
  return headerObj;
};

const getEtagInfo = (headers) => {
  const etag = {};
  etag[IF_MATCH] = headers[IF_MATCH];
  if (_.isNull(etag[IF_MATCH])) {
    etag[IF_MATCH] = headers["if_match"];
  }
  if (_.isNull(etag[IF_MATCH])) {
    etag[IF_MATCH] = headers["if-match"];
  }
  etag[IF_NONE_MATCH] = headers[IF_NONE_MATCH];
  if (_.isNull(etag[IF_NONE_MATCH])) {
    etag[IF_NONE_MATCH] = headers["if_none_match"];
  }
  if (_.isNull(etag[IF_NONE_MATCH])) {
    etag[IF_NONE_MATCH] = headers["if-none-match"];
  }
  etag[IF_MATCH] = etag[IF_MATCH] ? etag[IF_MATCH] : null;
  etag[IF_NONE_MATCH] = etag[IF_NONE_MATCH] ? etag[IF_NONE_MATCH] : null;
  return etag;
};

const popObject = (obj, attr) => {
  if (attr in obj) {
    const result = obj[attr];
    if (!delete obj[result]) {
      throw new Error();
    }
    return result;
  } else {
    return "";
  }
};

const validateStatements = (statements) => {
  let result = {
    status: true,
    message: "",
  };
  if (_.isObject(statements)) {
  } else if (_.isArray(statements)) {
  } else {
    result.status = false;
    result.message = "There are no statements to validate";
  }
};

const validateStatement = (statement) => {
  let result = {
    status: true,
    message: "",
  };
  if (!_.isObject(statement)) {
    return {
      status: false,
      message: "Statement is not a properly formatted dictionary",
    };
  }
  if (!validateAllowedFields(statementAllowedFields, statement)) {
    return {
      status: false,
      message: "Some field is incorrect. ",
    };
  }
  if (!validateRequiredFields(statementRequiredFields, statement)) {
    return {
      status: false,
      message: "Statement missing field. Required: object, verb, actor ",
    };
  }
  if (statement.version) {
    if (_.isString(statement.version)) {
      const re = /^1\.0(\.\d+)?$/;
      if (!re.test(statement.version)) {
        return {
          status: false,
          message: statement.version + " is a not supported version",
        };
      }
    } else {
      return {
        status: false,
        message: "Version must be a string.",
      };
    }
  }
  if (statement.id) {
    if (_.isString(statement.id)) {
      if (!uuidv4.uuidValidate(statement.id)) {
        return {
          status: false,
          message: statement.id + " is not a valid UUID",
        };
      }
    } else {
      return {
        status: false,
        message: "id must be a string.",
      };
    }
  }
  if (statement.timestamp) {
    const parse = Date.parse(statement.timestamp);
    if (isNaN(parse)) {
      return {
        status: false,
        message: "Timestamp error - There was an error while parsing the date",
      };
    }
  }
  if (statement.stored) {
    const parse = Date.parse(statement.stored);
    if (isNaN(parse)) {
      return {
        status: false,
        message: "Stored error - There was an error while parsing the date",
      };
    }
  }
  return result;
};

const validateAgent = (agent, placement) => {
  if (!_.isObject(agent)) {
    return {
      status: false,
      message: "Agent is not a properly formatted dictionary",
    };
  }
  if (!validateAllowedFields(agentAllowedFields, agent)) {
    return {
      status: false,
      message: "Agent/Group | Some field is incorrect. ",
    };
  }
  if (placement === "object" && !agent.objectType) {
    return {
      status: false,
      message:
        "objectType must be set when using an Agent as the object of a statement",
    };
  } else if (placement !== "object" && agent.objectType) {
    if (agent.objectType !== "Agent" && agent.objectType !== "Group") {
      return {
        status: false,
        message: "An agent's objectType must be either Agent or Group if given",
      };
    }
  } else if (placement !== "object" && !agent.objectType) {
    agent.objectType = "Agent";
    let ifis = 0;
    for (let ifis of agent_ifis_can_only_be_one) {
      if (agent[ifis]) {
        ifis++;
      }
    }
    if (agent.objectType === "Agent" && ifis !== 1) {
      return {
        status: false,
        message:
          "One and only one of agent lists may be supplied with an Agent",
      };
    }
    if (agent.objectType === "Group" && ifis > 1) {
      return {
        status: false,
        message:
          "None or one and only one of agent lists may be supplied with a Group",
      };
    }
    if (agent.objectType == "Agent") {
      if (agent.name && !_.isString(agent.name)) {
        return {
          status: false,
          message: "If name is given in Agent, it must be a string",
        };
      }
    }
  }
};
const agent_ifis_can_only_be_one = [
  "mbox",
  "mbox_sha1sum",
  "openid",
  "account",
];
const agentAllowedFields = [
  "objectType",
  "name",
  "member",
  "mbox",
  "mbox_sha1sum",
  "openid",
  "account",
];
const statementAllowedFields = [
  "id",
  "actor",
  "verb",
  "object",
  "result",
  "stored",
  "context",
  "timestamp",
  "authority",
  "version",
  "attachments",
];
const statementRequiredFields = ["actor", "verb", "object"];
const validateAllowedFields = (allowed, object) => {
  for (let key in object) {
    if (!object.hasOwnProperty(key)) continue;
    if (allowed.findIndex((allow) => allow === key) === -1) {
      return false;
    }
  }
  return true;
};

const validateRequiredFields = (required, object) => {
  for (let index in required) {
    const require = required[index];
    if (!object[require]) {
      return false;
    }
  }
  return true;
};

module.exports = {
  async create(ctx) {
    const request = parseRequest(ctx.request);
    console.log("request ==>", request);
    const statement = request.body;
    const validate = validateStatement(statement);

    // let entity;
    // if (ctx.is("multipart")) {
    //   const { data, files } = parseMultipartData(ctx);
    //   entity = await strapi.services.statement.create(data, { files });
    // } else {
    //   entity = await strapi.services.statement.create(ctx.request.body);
    // }
    // console.log("emntity ==>", entity);
    // if (entity.status === false) {
    //   return ctx.badRequest(
    //     null,
    //     formatError({
    //       id: "Statement.error",
    //       message: entity.message,
    //     })
    //   );
    // }
    ctx.status = 200;
    ctx.body = validate;
    return ctx;
    // return sanitizeEntity(entity, { model: strapi.models.statement });
  },
};
