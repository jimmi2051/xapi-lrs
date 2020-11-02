const _ = require("lodash");
// const uuid = require("uuid");
const { validateAllowedFields } = require("./helpers");
const scoreAllowedFields = ["scaled", "raw", "min", "max"];
const resultAllowedFields = [
  "score",
  "success",
  "completion",
  "response",
  "duration",
  "extensions",
];

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

module.exports = { validateResult };
