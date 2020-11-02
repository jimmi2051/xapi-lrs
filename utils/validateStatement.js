const _ = require("lodash");
const uuid = require("uuid");
const { validateAllowedFields, validateRequiredFields } = require("./helpers");
const { validateAgent, validateAuthorityGroup } = require("./validateAgent");
const { validateVerb } = require("./validateVerb");
const { validateObject } = require("./validateObject");
const { validateResult } = require("./validateResult");
const { validateContext } = require("./validateContext");

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
const validateStatements = (statements) => {
  if (_.isObject(statements)) {
    return validateStatement(statements);
  } else if (_.isArray(statements)) {
    for (let statement of statements) {
      let isValidateStatement = validateStatement(statement);
      if (isValidateStatement.status === false) {
        return isValidateStatement;
      }
    }
  } else {
    return { status: false, message: "There are no statements to validate" };
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
  if ("version" in statement) {
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
  if ("id" in statement) {
    if (_.isString(statement.id)) {
      if (!uuid.validate(statement.id)) {
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
  if ("timestamp" in statement) {
    const parse = Date.parse(statement.timestamp);
    if (isNaN(parse)) {
      return {
        status: false,
        message: "Timestamp error - There was an error while parsing the date",
      };
    }
  }
  if ("stored" in statement) {
    const parse = Date.parse(statement.stored);
    if (isNaN(parse)) {
      return {
        status: false,
        message: "Stored error - There was an error while parsing the date",
      };
    }
  }

  if ("authority" in statement) {
    let isValidateAuthority = validateAgent(statement.authority, "authority");
    if (isValidateAuthority.status === false) {
      return isValidateAuthority;
    }
    if (
      statement.authority.objectType &&
      statement.authority.objectType === "Group"
    ) {
      const isValidate = validateAuthorityGroup(statement.authority);
      if (isValidate.status === false) {
        return isValidate;
      }
    }
  }

  let isValidateAgent = validateAgent(statement.actor, "actor");
  if (isValidateAgent.status === false) {
    return isValidateAgent;
  }
  let isValidateVerb = validateVerb(statement.verb, statement.object);
  if (isValidateVerb.status === false) {
    return isValidateVerb;
  }

  const stmt_object = statement.object;
  let isValidateObject = validateObject(stmt_object);
  if (isValidateObject.status === false) {
    return isValidateObject;
  }
  if ("result" in statement) {
    let isValidateResult = validateResult(statement.result);
    if (isValidateResult.status === false) {
      return isValidateResult;
    }
  }
  if ("context" in statement) {
    let isValidateContext = validateContext(
      statement.context,
      statement.object
    );
    if (isValidateContext.status === false) {
      return isValidateContext;
    }
  }
  return result;
};

module.exports = { validateStatements, validateStatement };
