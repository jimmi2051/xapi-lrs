const popObject = (obj, attr) => {
  if (attr in obj) {
    const result = obj[attr];
    if (!delete obj[result]) {
      throw new Error();
    }
    return result;
  } else {
    return "";
  }
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

module.exports = { popObject, validateAllowedFields, validateRequiredFields };
