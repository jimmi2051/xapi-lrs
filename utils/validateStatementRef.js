const _ = require("lodash");
const uuid = require("uuid");
const { validateAllowedFields, validateRequiredFields } = require("./helpers");

const refFields = ["id", "objectType"];

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
module.exports = { validateStatementRef };
