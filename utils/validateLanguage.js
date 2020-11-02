const _ = require("lodash");
const validateLanguageMap = (langMap) => {
  for (let lang of langMap) {
    const isValidate = validateLanguage(lang);
    if (isValidate.status === false) {
      return isValidate;
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

module.exports = { validateLanguageMap, validateLanguage };
