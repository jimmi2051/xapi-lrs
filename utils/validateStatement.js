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
