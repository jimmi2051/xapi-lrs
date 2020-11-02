const _ = require("lodash");
const { validateAllowedFields } = require("./helpers");
const { validateLanguageMap } = require("./validateLanguage");
const verbAllowedFields = ["id", "display"];

const validateDictValues = (object) => {
  for (let key in object) {
    if (!object.hasOwnProperty(key)) continue;
    if (_.isEmpty(object[key])) {
      return false;
    }
  }
  return true;
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
module.exports = { validateVerb };
