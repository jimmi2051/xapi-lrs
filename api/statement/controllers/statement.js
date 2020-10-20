"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
// import { validate as uuidValidate } from "uuid";
const uuid = require("uuid");
const _ = require("lodash");
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const URI = require("uri-js");
const { parseRequest } = require("../../../utils/parseRequest");

const refFields = ["id", "objectType"];

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

const scoreAllowedFields = ["scaled", "raw", "min", "max"];
const resultAllowedFields = [
  "score",
  "success",
  "completion",
  "response",
  "duration",
  "extensions",
];

const actDefAllowedFields = [
  "name",
  "description",
  "type",
  "moreInfo",
  "extensions",
  "interactionType",
  "correctResponsesPattern",
  "choices",
  "scale",
  "source",
  "target",
  "steps",
];

const activityAllowedFields = ["objectType", "id", "definition"];
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
const accountFields = ["homePage", "name"];
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
const verbAllowedFields = ["id", "display"];
const statementRequiredFields = ["actor", "verb", "object"];

const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

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

const validateAuthorityGroup = (authority) => {
  if (authority.member.length !== 2) {
    return {
      status: false,
      message: "Groups representing authorities must only contain 2 members",
    };
  }
  let check = 0;
  for (let key in authority) {
    if (key in agent_ifis_can_only_be_one) {
      check++;
    }
  }
  if (check > 2) {
    return {
      status: false,
      message:
        "Groups representing authorities must not contain an inverse functional identifier",
    };
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
    subStatement.objectType = "Activity";
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
  return { status: true };
};

const validateLanguage = (lang) => {
  if (!_.isString(lang)) {
    return {
      status: false,
      message: "Context language must be a string",
    };
  }
  const langPart = lang.split("-");
  const re = /^[A-Za-z0-9]*$/;
  for (let iLang of langPart) {
    if (re.test(iLang)) {
      if (iLang.length > 8) {
        return {
          status: false,
          message: "Language isn't valid. ",
        };
      }
    } else {
      return {
        status: false,
        message: "Language isn't valid. ",
      };
    }
  }
  return { status: true };
};

const validateLanguageMap = (langMap) => {
  for (let lang of langMap) {
    const isValidate = validateLanguage(lang);
    if (isValidate.status === false) {
      return isValidate;
    }
  }
  return { status: true };
};

const validateStatementRef = (ref) => {
  if (!_.isObject(ref)) {
    return {
      status: false,
      message: "StatementRef is not a properly formatted dictionary",
    };
  }
  if (ref.objectType !== "StatementRef") {
    return {
      status: false,
      message: "StatementRef objectType must be set to 'StatementRef'",
    };
  }
  if (!validateAllowedFields(refFields, ref)) {
    return {
      status: false,
      message: "StatementRef | Some field is incorrect. ",
    };
  }
  if (!validateRequiredFields(refFields, ref)) {
    return {
      status: false,
      message: "StatementRef | Some field is incorrect. ",
    };
  }
  if (!uuid.validate(ref.id)) {
    return {
      status: false,
      message: ref.id + " is not a valid UUID",
    };
  }
  return {
    status: true,
  };
};

const validateResult = (result) => {
  if (!_.isObject(result)) {
    return {
      status: false,
      message: "Result is not a properly formatted dictionary",
    };
  }
  if (!validateAllowedFields(resultAllowedFields, result)) {
    return {
      status: false,
      message: "Result | Some field is incorrect. ",
    };
  }
  const re = /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
  if (result.duration) {
    if (!re.test(result.duration)) {
      return {
        status: false,
        message: "Error with result duration",
      };
    }
  }
  if (result.success && !_.isBoolean(result.success)) {
    return {
      status: false,
      message: "Result success must be a boolean value",
    };
  }
  if ("completion" in result && !_.isBoolean(result.completion)) {
    return {
      status: false,
      message: "Result completion must be a boolean value",
    };
  }
  if ("response" in result && !_.isString(result.response)) {
    return {
      status: false,
      message: "Result response must be a string",
    };
  }
  if (result.score) {
    if (!_.isObject(result.score)) {
      return {
        status: false,
        message: "Score is not a properly formatted dictionary",
      };
    }
    if (!validateAllowedFields(scoreAllowedFields, result.score)) {
      return {
        status: false,
        message: "Score | Some field is incorrect. ",
      };
    }
    const { score } = result;
    if (score.raw && !_.isNumber(score.raw)) {
      return {
        status: false,
        message: "Score raw is not a number",
      };
    }
    if (score.min && !_.isNumber(score.min)) {
      return {
        status: false,
        message: "Score min is not a number",
      };
    }
    if (score.max && !_.isNumber(score.max)) {
      return {
        status: false,
        message: "Score max is not a number",
      };
    }
    if (score.min > score.max) {
      return {
        status: false,
        message:
          "Score minimum in statement result must be less than the maximum",
      };
    }
    if (score.raw && (score.raw < score.min || score.raw > score.max)) {
      return {
        status: false,
        message:
          "Score raw value in statement result must be between minimum and maximum",
      };
    }
    if (score.scaled && !_.isNumber(score.scaled)) {
      return {
        status: false,
        message: "Score scaled is not a number",
      };
    }
    if (score.scaled < -1 || score.scaled > 1) {
      return {
        status: false,
        message:
          "Score scaled value in statement result must be between -1 and 1",
      };
    }
  }
  return {
    status: true,
  };
};

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

const validateActivity = (activity) => {
  if (!_.isObject(activity)) {
    return {
      status: false,
      message: "Activity is not a properly formatted dictionary",
    };
  }
  if (!validateAllowedFields(activityAllowedFields, activity)) {
    return {
      status: false,
      message: "Activity | Some field is incorrect. ",
    };
  }

  if (!activity.id) {
    return {
      status: false,
      message: "Id field must be present in an Activity",
    };
  }
  if ("definition" in activity) {
    let isValidateActivity = validateActivityDefinition(activity.definition);
    if (isValidateActivity.status === false) {
      return isValidateActivity;
    }
  }
  return {
    status: true,
  };
};

const validateActivityDefinition = (definition) => {
  if (!_.isObject(definition)) {
    return {
      status: false,
      message: "Activity definition is not a properly formatted dictionary",
    };
  }
  if (!validateAllowedFields(actDefAllowedFields, definition)) {
    return {
      status: false,
      message: "Activity definition | Some field is incorrect. ",
    };
  }
  if ("name" in definition) {
    if (!_.isObject(definition.name)) {
      return {
        status: false,
        message:
          "Activity definition name is not a properly formatted dictionary",
      };
    }
    const langMap = Object.keys(definition.name);
    const isValidate = validateLanguageMap(langMap);
    if (isValidate.status === false) {
      return isValidate;
    }
  }
  if ("description" in definition) {
    if (!_.isObject(definition.description)) {
      return {
        status: false,
        message:
          "Activity definition description is not a properly formatted dictionary",
      };
    }
    const langMap = Object.keys(definition.description);
    const isValidate = validateLanguageMap(langMap);
    if (isValidate.status === false) {
      return isValidate;
    }
  }

  if ("type" in definition) {
    const isValidate = validateIRI(definition.type);
    if (isValidate.status === false) {
      return isValidate;
    }
  }

  if ("moreInfo" in definition) {
    const isValidate = validateIRI(definition.moreInfo);
    if (isValidate.status === false) {
      return isValidate;
    }
  }

  let interactionType;
  if (definition.interactionType) {
    if (!_.isString(definition.interactionType)) {
      return {
        status: false,
        message: "Activity definition interactionType must be a string",
      };
    }
    const scorm_interaction_types = [
      "true-false",
      "choice",
      "fill-in",
      "long-fill-in",
      "matching",
      "performance",
      "sequencing",
      "likert",
      "numeric",
      "other",
    ];
    if (!scorm_interaction_types.includes(definition.interactionType)) {
      return {
        status: false,
        message: "Activity definition interactionType is not valid",
      };
    }
  }
  interactionType = definition.interactionType;

  if (definition.correctResponsesPattern) {
    if (_.isEmpty(interactionType)) {
      // console.log("22222222", interactionType);
      return {
        status: false,
        message: "Activity definition interactionType is not valid",
      };
    }
    if (!_.isArray(definition.correctResponsesPattern)) {
      return {
        status: false,
        message: "Activity definition correctResponsesPattern is not valid",
      };
    }
    for (let answer of definition.correctResponsesPattern) {
      if (!_.isString(answer)) {
        return {
          status: false,
          message:
            "Activity definition correctResponsesPattern answers must all be strings",
        };
      }
    }
    if (
      (definition.choicses ||
        definition.scale ||
        definition.source ||
        definition.target ||
        definition.steps) &&
      _.isEmpty(interactionType)
    ) {
      return {
        status: false,
        message:
          "interactionType must be given when using interaction components",
      };
    }
  }
  return {
    status: true,
  };
};

const validateVerb = (verb, stmt_object = null) => {
  if (!_.isObject(verb)) {
    return {
      status: false,
      message: "Verb is not a properly formatted dictionary",
    };
  }
  if (!validateAllowedFields(verbAllowedFields, verb)) {
    return {
      status: false,
      message: "Verb | Some field is incorrect. ",
    };
  }
  if (!verb.id) {
    return {
      status: false,
      message: "Verb must be contain an id",
    };
  }
  if (verb.id === "http://adlnet.gov/expapi/verbs/voided") {
    if (stmt_object.objectType) {
      if (stmt_object.objectType !== "StatementRef") {
        return {
          status: false,
          message:
            "Statement with voided verb must have StatementRef as objectType",
        };
      }
    } else {
      return {
        status: false,
        message:
          "Statement with voided verb must have StatementRef as objectType",
      };
    }
  }
  if (verb.display) {
    if (!_.isObject(verb.display)) {
      return {
        status: false,
        message: "Verb display is not a properly formatted dictionary",
      };
    }
    if (!validateDictValues(verb.display)) {
      return {
        status: false,
        message: "Verb display contains a null value",
      };
    }

    const langMap = Object.keys(verb.display);
    const isValidate = validateLanguageMap(langMap);
    if (isValidate.status === false) {
      return isValidate;
    }
  }
  return {
    status: true,
  };
};

const validateDictValues = (object) => {
  for (let key in object) {
    if (!object.hasOwnProperty(key)) continue;
    if (_.isEmpty(object[key])) {
      return false;
    }
  }
  return true;
};

const validateAgent = (agent, placement) => {
  // console.log("gaet ==>", agent);
  // console.log("placement ==>", placement);
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
  }
  let ifis = [];

  for (let item of agent_ifis_can_only_be_one) {
    if (agent[item]) {
      ifis.push(item);
    }
  }
  if (agent.objectType === "Agent" && ifis.length !== 1) {
    return {
      status: false,
      message: "One and only one of agent lists may be supplied with an Agent",
    };
  }
  if (agent.objectType === "Group" && ifis.length > 1) {
    return {
      status: false,
      message:
        "None or one and only one of agent lists may be supplied with a Group",
    };
  }

  if (agent.objectType == "Agent") {
    if ("name" in agent && !_.isString(agent.name)) {
      return {
        status: false,
        message: "If name is given in Agent, it must be a string",
      };
    }
    const isValidateIfi = validateIfi(ifis[0], agent[ifis[0]]);
    if (isValidateIfi.status === false) {
      return isValidateIfi;
    }
  } else {
    if ("name" in agent && !_.isString(agent.name)) {
      return {
        status: false,
        message: "If name is given in Group, it must be a string",
      };
    }
    if (_.isEmpty(ifis)) {
      if (agent.member) {
        return validateMembers(agent);
      } else {
        return {
          status: false,
          message: "Anonymous groups must contain member",
        };
      }
    } else {
      const isValidateIfi = validateIfi(ifis[0], agent[ifis[0]]);
      if (isValidateIfi.status === false) {
        return isValidateIfi;
      }
      if (agent.member) {
        return validateMembers(agent);
      }
    }
  }

  return {
    status: true,
  };
};

const validateMembers = (agent) => {
  const member = agent.member;
  if (!_.isArray(member)) {
    return {
      status: false,
      message: "member is not a properly formatted array",
    };
  }
  if (_.isEmpty(member)) {
    return {
      status: false,
      message: "Member property must contain agents",
    };
  }
  for (let agent of member) {
    return validateAgent(agent, "member");
  }
};

const validateIfi = (ifis, ifisValue) => {
  let validated = { status: true };
  if (ifis === "mbox") {
    validated = { ...validateEmail(ifisValue) };
  } else if (ifis === "mbox_sha1sum") {
    validated = { ...validateEmailSha1sum(ifisValue) };
  } else if (ifis === "openid") {
    // Need to improve
    validated = {
      status: true,
    };
  } else if (ifis === "account") {
    validated = { ...validateAccount(ifisValue) };
  }
  return validated;
};

const validateAccount = (account) => {
  if (!_.isObject(account)) {
    return {
      status: false,
      message: "Account is not a properly formatted dictionary",
    };
  }
  if (!validateAllowedFields(accountFields, account)) {
    return {
      status: false,
      message: "Account | Some field is incorrect. ",
    };
  }
  if (!validateRequiredFields(accountFields, account)) {
    return {
      status: false,
      message: "Account | Some field is incorrect. ",
    };
  }
  if (!_.isString(account.name)) {
    return {
      status: false,
      message: "account name must be a string ",
    };
  }
  return { status: true };
};

const validateEmail = (email) => {
  if (_.isString(email)) {
    if (email.startsWith("mailto:")) {
      const re = /[^@]+@[^@]+\.[^@]+/;
      if (!re.test(email)) {
        return {
          status: false,
          message: "mbox value is not a valid email",
        };
      }
    } else {
      return {
        status: false,
        message: "mbox value did not start with mailto:",
      };
    }
  } else {
    return {
      status: false,
      message: "mbox value must be a string",
    };
  }
  return {
    status: true,
  };
};

const validateEmailSha1sum = (sha1sum) => {
  if (_.isString(sha1sum)) {
    const re = /([a-fA-F\d]{40}$)/;
    if (!re.test(sha1sum)) {
      return {
        status: false,
        message: "mbox_sha1sum value is not valid",
      };
    }
  } else {
    return {
      status: false,
      message: "mbox_sha1sum value must be a string",
    };
  }
  return {
    status: true,
  };
};

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

const validateIRI = (IRI) => {
  // console.log("IRI ==>", IRI);
  if (_.isString(IRI)) {
    const parseUri = URI.parse(IRI);
    // console.log("uri parse ==>", parseUri);
  } else {
    return {
      status: false,
      message: "IRI must be a string type",
    };
  }
  return { status: true };
};

module.exports = {
  async create(ctx) {
    const request = parseRequest(ctx.request);
    const statements = { ...request.body };
    const validate = validateStatements(statements);
    if (validate.status !== true) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Statement Validate - Error",
          message: validate.message,
        })
      );
    }
    let entity;
    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.statement.create(data, { files });
    } else {
      entity = await strapi.services.statement.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.models.statement });
  },
  async find(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.statement.search(ctx.query);
    } else {
      entities = await strapi.services.statement.find(ctx.query);
    }
    if (_.isEmpty(entities)) {
      ctx.status = 204;
    }
    return entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models.statement })
    );
  },
  async about(ctx) {
    return {
      status: true,
    };
  },
  async update(ctx) {
    // const { id } = ctx.params;
    const cid = ctx.query.StatementId;
    const request = parseRequest(ctx.request);
    const statements = { ...request.body };
    const validate = validateStatements(statements);
    if (validate.status !== true) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Statement Validate - Error",
          message: validate.message,
        })
      );
    }
    let entity;
    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.statement.update({ cid }, data, {
        files,
      });
    } else {
      entity = await strapi.services.statement.update(
        { cid },
        ctx.request.body
      );
    }

    return sanitizeEntity(entity, { model: strapi.models.statement });
  },
};
