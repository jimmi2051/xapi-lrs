const _ = require("lodash");
const uuid = require("uuid");
const { validateAllowedFields } = require("./helpers");
const { validateAgent } = require("./validateAgent");
const { validateLanguage } = require("./validateLanguage");
const { validateStatementRef } = require("./validateStatementRef");
const { validateIRI } = require("./validateIfi");
const { validateActivity } = require("./validateActivity");
const contextAllowedFields = [
  "registration",
  "instructor",
  "team",
  "contextActivities",
  "revision",
  "platform",
  "language",
  "statement",
  "extensions",
];

const validateContext = (context, stmt_object) => {
  if (!_.isObject(context)) {
    return {
      status: false,
      message: "Context is not a properly formatted dictionary",
    };
  }
  if (!validateAllowedFields(contextAllowedFields, context)) {
    return {
      status: false,
      message: "Context | Some field is incorrect. ",
    };
  }
  if ("registration" in context) {
    if (!uuid.validate(context.registration)) {
      return {
        status: false,
        message: context.registration + " is not a valid UUID",
      };
    }
  }
  if ("instructor" in context) {
    const isValidateAgent = validateAgent(
      context.instructor,
      "Context instructor"
    );
    if (isValidateAgent.status === false) {
      return isValidateAgent;
    }
  }
  if ("team" in context) {
    const isValidateAgent = validateAgent(context.team, "Context Team");
    if (isValidateAgent.status === false) {
      return isValidateAgent;
    }
    if (!context.team.objectType || context.team.objectType == "Agent") {
      return {
        status: false,
        message: "Team in context must be a group",
      };
    }
  }
  const objectType = stmt_object.objectType;
  if ("revision" in context) {
    if (!_.isString(context.revision)) {
      return {
        status: false,
        message: "Context revision must be a string",
      };
    }
    if (objectType !== "Activity") {
      return {
        status: false,
        message:
          "Revision is not allowed in context if statement object is not an Activity",
      };
    }
  }
  if ("platform" in context) {
    if (!_.isString(context.platform)) {
      return {
        status: false,
        message: "Context platform must be a string",
      };
    }
    if (objectType !== "Activity") {
      return {
        status: false,
        message:
          "Platform is not allowed in context if statement object is not an Activity",
      };
    }
  }
  if ("language" in context) {
    if (!_.isString(context.language)) {
      return {
        status: false,
        message: "Context language must be a string",
      };
    }
    const isValidated = validateLanguage(context.language);
    if (isValidated.status === false) {
      return isValidated;
    }
  }
  if ("statement" in context) {
    const isValidateStatement = validateStatementRef(context.statement);

    if (isValidateStatement.status === false) {
      return isValidateStatement;
    }
  }
  if ("extensions" in context) {
    if (!_.isObject(context.extensions)) {
      return {
        status: false,
        message: "Context extensions must be a dictionary",
      };
    }
    for (let key in context.extensions) {
      const isValidate = validateIRI(key);
      if (isValidate.status === false) {
        return isValidate;
      }
    }
  }
  if (context.contextActivities) {
    if (!_.isObject(context.contextActivities)) {
      return {
        status: false,
        message: "contextActivities must be a dictionary",
      };
    }
    const contextActivityTypes = ["parent", "grouping", "category", "other"];
    for (let key in context.contextActivities) {
      if (!contextActivityTypes.includes(key)) {
        return {
          status: false,
          message: "Context activity type is not invalid",
        };
      }
      const value = context.contextActivities[key];
      if (_.isArray(value)) {
        for (let act of value) {
          const isValidate = validateActivity(act);
          if (isValidate.status === false) {
            return isValidate;
          }
        }
      } else if (_.isObject(value)) {
        const isValidate = validateActivity(value);
        if (isValidate.status === false) {
          return isValidate;
        }
      } else {
        return {
          status: false,
          message: "contextActivities is not formatted correctly",
        };
      }
    }
  }
  return { status: true };
};
module.exports = { validateContext };
