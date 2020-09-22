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

module.exports = {
  async create(data, { files } = {}) {
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
        statementObjectData.activity_id = statementObjectData.cid;
        statementObjectData.canonical_data = { ...statementObjectData };
        const activity = await strapi
          .query("activity")
          .create(statementObjectData);
        data.object_activity = activity;
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
          if (!result.hasOwnProperty(key)) continue;
          let obj = data[key];
          data["result_score_" + key] = obj;
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
    data.full_statement = { ...data };
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
};
