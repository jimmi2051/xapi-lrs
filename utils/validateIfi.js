const _ = require("lodash");
const { validateAllowedFields, validateRequiredFields } = require("./helpers");
const URI = require("uri-js");
const accountFields = ["homePage", "name"];
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
const validateIRI = (IRI) => {
  if (_.isString(IRI)) {
    const parseUri = URI.parse(IRI);
    if (_.isEmpty(parseUri)) {
      return {
        status: false,
        message: "IRI invalid. ",
      };
    }
  } else {
    return {
      status: false,
      message: "IRI must be a string type",
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
module.exports = { validateIfi, validateIRI };
