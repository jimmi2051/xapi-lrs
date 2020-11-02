const _ = require("lodash");
const { validateAgent } = require("./validateAgent");
const { validateActivity } = require("./validateActivity");
// const { validateSubstatement } = require("./validateSubstatement");
const { validateStatementRef } = require("./validateStatementRef");
const { validateAllowedFields, validateRequiredFields } = require("./helpers");
const { validateVerb } = require("./validateVerb");
const { validateContext } = require("./validateContext");
const { validateResult } = require("./validateResult");
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
const validateObject = (stmt_object) => {
  if (!_.isObject(stmt_object)) {
    return {
      status: false,
      message: "Object is not a properly formatted dictionary",
    };
  }
  if (!stmt_object.objectType || stmt_object.objectType === "Activity") {
    let isValidateActivity = validateActivity(stmt_object);
    if (isValidateActivity.status === false) {
      return isValidateActivity;
    }
  } else if (
    stmt_object.objectType === "Agent" ||
    stmt_object.objectType === "Group"
  ) {
    let isValidateAgent = validateAgent(stmt_object, "object");
    if (isValidateAgent.status === false) {
      return isValidateAgent;
    }
  } else if (stmt_object.objectType === "SubStatement") {
    const isValidate = validateSubstatement(stmt_object);
    if (isValidate.status === false) {
      return isValidate;
    }
  } else if (stmt_object.objectType === "StatementRef") {
    const isValidateStatement = validateStatementRef(stmt_object);

    if (isValidateStatement.status === false) {
      return isValidateStatement;
    }
  } else {
    return { status: false, message: "Object | Object Type is invalid!" };
  }

  return {
    status: true,
  };
};

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
module.exports = { validateObject, validateSubstatement };
