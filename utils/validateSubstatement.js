const _ = require("lodash");
const { validateAllowedFields, validateRequiredFields } = require("./helpers");
const { validateAgent } = require("./validateAgent");
const { validateVerb } = require("./validateVerb");
const { validateObject } = require("./validateObject");
const { validateResult } = require("./validateResult");
const { validateContext } = require("./validateContext");
const subAllowedFields = [
  "actor",
  "verb",
  "object",
  "result",
  "context",
  "timestamp",
  "objectType",
];
const subRequiredFields = ["actor", "verb", "object"];
const validateSubstatement = (subStatement) => {
  if (!_.isObject(subStatement)) {
    return {
      status: false,
      message,
    };
  }
  if (!validateAllowedFields(subAllowedFields, subStatement)) {
    return {
      status: false,
      message: "Substatement | Some field is incorrect. ",
    };
  }
  if (!validateRequiredFields(subRequiredFields, subStatement)) {
    return {
      status: false,
      message: "Substatement | Some field is incorrect. ",
    };
  }
  if ("timestamp" in subStatement) {
    const parse = Date.parse(subStatement.timestamp);
    if (isNaN(parse)) {
      return {
        status: false,
        message: "Timestamp error - There was an error while parsing the date",
      };
    }
  }
  if ("stored" in subStatement) {
    const parse = Date.parse(subStatement.stored);
    if (isNaN(parse)) {
      return {
        status: false,
        message: "Stored error - There was an error while parsing the date",
      };
    }
  }
  if (
    subStatement.object.objectType &&
    subStatement.object.objectType === "SubStatement"
  ) {
    return {
      status: false,
      message: "Cannot nest a SubStatement inside of another SubStatement",
    };
  } else {
    subStatement.object.objectType = "Activity";
  }
  let isValidateAgent = validateAgent(subStatement.actor, "actor");
  if (isValidateAgent.status === false) {
    return isValidateAgent;
  }
  let isValidateVerb = validateVerb(subStatement.verb, subStatement.object);
  if (isValidateVerb.status === false) {
    return isValidateVerb;
  }

  const stmt_object = subStatement.object;
  let isValidateObject = validateObject(stmt_object);
  if (isValidateObject.status === false) {
    return isValidateObject;
  }
  if ("result" in subStatement) {
    let isValidateResult = validateResult(subStatement.result);
    if (isValidateResult.status === false) {
      return isValidateResult;
    }
  }
  if ("context" in subStatement) {
    let isValidateContext = validateContext(
      subStatement.context,
      subStatement.object
    );
    if (isValidateContext.status === false) {
      return isValidateContext;
    }
  }
  return { status: true };
};
module.exports = { validateSubstatement };
