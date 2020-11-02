const _ = require("lodash");
const { validateAllowedFields } = require("./helpers");
const { validateLanguageMap } = require("./validateLanguage");
const { validateIRI } = require("./validateIfi");
const activityAllowedFields = ["objectType", "id", "definition"];

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

module.exports = { validateActivity };
