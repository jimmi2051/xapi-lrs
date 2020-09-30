"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

const _ = require("lodash");

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

const validateNotNullVer2 = (object) => {
  for (let key in object) {
    // skip loop if the property is from prototype
    if (!object.hasOwnProperty(key)) continue;
    if (_.isNull(object[key])) {
      return false;
    }
  }
  return true;
};

const validateNotNull = (object) => {
  console.log("log ===>", object);
  let check = true;
  for (let key in object) {
    // skip loop if the property is from prototype
    if (!object.hasOwnProperty(key)) continue;
    if (key === "extensions") continue;
    if (check === false) continue;
    if (_.isObject(object[key])) {
      // console.log("111", key);
      check = validateNotNull(object[key]);
    } else {
      // console.log("222", _.isNull(object[key]));
      if (_.isNull(object[key])) {
        check = false;
      }
    }

    // return true;
  }
  return check;
  // return true;
  // for (let key in object.actor) {
  //   // skip loop if the property is from prototype
  //   if (!object.actor.hasOwnProperty(key)) continue;
  //   if (object.actor[key] === null || object.actor[key] === undefined) {
  //     return false;
  //   }
  // }
  // for (let key in object.verb) {
  //   // skip loop if the property is from prototype
  //   if (!object.verb.hasOwnProperty(key)) continue;
  //   if (object.verb[key] === null || object.verb[key] === undefined) {
  //     return false;
  //   }
  // }
  // for (let key in object.object) {
  //   // skip loop if the property is from prototype
  //   if (!object.object.hasOwnProperty(key)) continue;
  //   if (object.object[key] === null || object.object[key] === undefined) {
  //     return false;
  //   }
  // }
  // return true;
};

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
  "full_statement",
  "cid",
];
const statementRequiredFields = ["actor", "verb", "object"];
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
const validateStatement = (statement) => {
  if (!_.isObject(statement)) {
    return {
      status: false,
      message: "Statement is not a properly formatted dictionary.",
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
  if (statement.version) {
    if (_.isString(statement.version)) {
      //
    } else {
      return {
        status: false,
        message: "Version must be a string.",
      };
    }
  }

  if (
    !validateNotNull(statement.actor) ||
    !validateNotNull(statement.verb) ||
    !validateNotNull(statement.object) ||
    !validateNotNull(statement.context)
  ) {
    return {
      status: false,
      message: "Data not allow null.",
    };
  }
  return {
    status: true,
  };
};

module.exports = {
  async create(data, { files } = {}) {
    const validated = validateStatement(data);
    if (validated.status === false) {
      return validated;
    }
    if (data.actor) {
      const { actor } = data;
      const entryActor = await strapi.query("agent").create(actor);
      data.actor._id = entryActor.id;
    }
    if (data.object) {
      const statementObjectData = data.object;
      if (
        statementObjectData.objectType === "Group" ||
        statementObjectData.objectType === "Agent"
      ) {
        const agent = await strapi.query("agent").create(statementObjectData);
        data.object_agent = agent;
      }
      if (statementObjectData.objectType === "Activity") {
        const queryActivity = await strapi
          .query("activity")
          .findOne({ activity_id: statementObjectData.cid });
        if (queryActivity && queryActivity._id) {
          data.object_activity = queryActivity;
        } else {
          statementObjectData.activity_id = statementObjectData.cid;
          statementObjectData.canonical_data = { ...statementObjectData };
          const activity = await strapi
            .query("activity")
            .create(statementObjectData);
          data.object_activity = activity;
        }
      }
      if (statementObjectData.objectType === "SubStatement") {
        // Continue process with substatement
        const subStatement = await strapi
          .query("substatement")
          .create(statementObjectData);
        data.object_substatement = subStatement;
      }
      if (statementObjectData.objectType === "StatementRef") {
        data.object_statementref = statementObjectData.cid;
      }
      delete data.object;
    }

    if (data.verb) {
      let { verb } = data;
      const queryVerb = await strapi
        .query("verb")
        .findOne({ verb_id: verb.cid });
      if (queryVerb) {
        data.verb._id = queryVerb.id;
      } else {
        verb = { verb_id: verb.cid, caninical_data: { ...verb } };
        const entryVerb = await strapi.query("verb").create(verb);
        data.verb._id = entryVerb.id;
      }
    }
    //Process case Context
    if (data.context) {
      const { context } = data;
      for (let key in context) {
        // skip loop if the property is from prototype
        if (!context.hasOwnProperty(key)) continue;

        let obj = context[key];
        data["context_" + key] = obj;
      }
      if (data.context_instructor) {
        const context_instructor = await strapi
          .query("agent")
          .create(data.context_instructor);
        data.context_instructor = context_instructor;
      }
      if (data.context_team) {
        const context_team = await strapi
          .query("agent")
          .create(data.context_team);
        data.context_team = context_team;
      }
      if (data.context_statement) {
        data.context_statement = data.context_statement.cid;
      }
    }
    // Case have result
    if (data.result) {
      const { result } = data;
      for (let key in result) {
        // skip loop if the property is from prototype
        if (!result.hasOwnProperty(key)) continue;
        let obj = result[key];
        data["result_" + key] = obj;
      }
      if (data.result_score) {
        for (let result_score in data) {
          // skip loop if the property is from prototype
          if (!result.hasOwnProperty(result_score)) continue;
          let obj = data[result_score];
          data["result_score_" + result_score] = obj;
        }
        delete data.result.score;
        delete data.result_core;
      }
    }
    // // Context Acitvites ==>
    // if (data.context_contextActivities) {
    //   const con_act_data = popObject(data, "context_contextActivities");
    //   delete data.objectType;
    //   const subStatement = await strapi.query("substatement").create(data);
    //   if(!_.isEmpty(con_act_data))
    //   {
    //     for (let key in con_act_data) {
    //       // skip loop if the property is from prototype
    //       if (!con_act_data.hasOwnProperty(key)) continue;
    //       let obj = con_act_data[key];
    //       if(_.isArray(obj[1]))
    //       {
    //         for(let i = 0; i < obj[1].length ; i++)
    //         {
    //           let con_act = obj[1][i];
    //           act =
    //         }
    //       }
    //     }
    //   }
    //   data.object_substatement = subStatement;
    // }
    // data.full_statement = { ...data };
    const entry = await strapi.query("statement").create(data);

    if (files) {
      // automatically uploads the files based on the entry and the model
      await strapi.entityService.uploadFiles(entry, files, {
        model: "statement",
        // if you are using a plugin's model you will have to add the `source` key (source: 'users-permissions')
      });
      return this.findOne({ id: entry.id });
    }

    return entry;
  },
  find(params, populate) {
    if (params.statementId) {
      params.cid = params.statementId;
      delete params.statementId;
    }
    return strapi.query("statement").find(params, populate);
  },
};
