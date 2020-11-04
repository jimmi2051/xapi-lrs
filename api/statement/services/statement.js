"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

const _ = require("lodash");

const replaceAll = (string, search, replace) => {
  return string.split(search).join(replace);
};

const replaceIdToCid = (object) => {
  for (let key in object) {
    // skip loop if the property is from prototype
    if (!object.hasOwnProperty(key)) continue;
    if (key === "id") {
      object.cid = object.id;
      delete object.id;
    } else {
      const newKey = replaceAll(key, ".", "_");
      if (newKey !== key) {
        object[newKey] = object[key];
        delete object[key];
      }
      if (_.isObject(object[newKey])) {
        replaceIdToCid(object[newKey]);
      }
    }
  }
};

module.exports = {
  async create(data, { files } = {}) {
    replaceIdToCid(data);
    if (data.actor) {
      const { actor } = data;
      const queryActor = await strapi
        .query("agent")
        .findOne({ name: actor.name, mbox: actor.mbox });
      if (queryActor && queryActor._id) {
        data.actor._id = queryActor.id;
      } else {
        const entryActor = await strapi.query("agent").create(actor);
        data.actor._id = entryActor.id;
      }
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
        verb = { verb_id: verb.cid, canonical_data: { ...verb } };
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
    if (data.authority) {
      const { authority } = data;

      const queryAuthor = await strapi
        .query("agent")
        .findOne({ name: authority.name, mbox: authority.mbox });
      if (queryAuthor && queryAuthor._id) {
        data.authority._id = queryAuthor.id;
      } else {
        const entryAuthor = await strapi.query("agent").create(authority);
        data.authority._id = entryAuthor.id;
      }
    }
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
    if (params.verb) {
      params["verb.verb_id"] = params.verb;
      delete params.verb;
    }
    if (params.voidedStatementId) {
      params.cid = params.voidedStatementId;
      delete params.voidedStatementId;
    }
    if (params.agent) {
      const objAgent = JSON.parse(params.agent);
      params["actor.name"] = objAgent.name;
      params["actor.mbox"] = objAgent.mbox;
      delete params.agent;
      if (params.related_agents) {
        delete params.related_agents;
      }
    }
    if (params.activity) {
      params["object_activity.activity_id"] = params.activity;
      delete params.activity;
      if (params.related_activities) {
        // params["context_ca_other.activity_id"] = params.activity
        delete params.related_activities;
      }
    }
    if (params.registration) {
      params["context_registration"] = params.registration;
      delete params.registration;
    }
    if (params.since) {
      params["stored_lt"] = params.since;
      delete params.since;
    }
    if (params.until) {
      params["stored_gt"] = params.until;
      delete params.until;
    }
    if (params.limit) {
      params["_limit"] = params.limit;
      delete params.limit;
    }
    if (params.ascending) {
      params["_sort"] = "stored:asc";
      delete params.ascending;
    }
    if (params.descending) {
      params["_sort"] = "stored:desc";
      delete params.descending;
    }
    if (params.format) {
      delete params.format;
    }
    if (params.attachments) {
      delete params.attachments;
    }

    return strapi.query("statement").find(params, populate);
  },
  async update(params, data, { files } = {}) {
    const validData = await strapi.entityValidator.validateEntityUpdate(
      strapi.models.statement,
      data
    );

    // replaceIdToCid(validData);
    if (validData.actor) {
      const { actor } = validData;
      const queryActor = await strapi
        .query("agent")
        .findOne({ name: actor.name, mbox: actor.mbox });
      if (queryActor && queryActor._id) {
        validData.actor._id = queryActor.id;
      } else {
        const entryActor = await strapi.query("agent").create(actor);
        validData.actor._id = entryActor.id;
      }
    }
    if (validData.object) {
      const statementObjectData = validData.object;
      if (
        statementObjectData.objectType === "Group" ||
        statementObjectData.objectType === "Agent"
      ) {
        const agent = await strapi.query("agent").create(statementObjectData);
        validData.object_agent = agent;
      }
      if (statementObjectData.objectType === "Activity") {
        const queryActivity = await strapi
          .query("activity")
          .findOne({ activity_id: statementObjectData.cid });
        if (queryActivity && queryActivity._id) {
          validData.object_activity = queryActivity;
        } else {
          statementObjectData.activity_id = statementObjectData.cid;
          statementObjectData.canonical_data = { ...statementObjectData };
          const activity = await strapi
            .query("activity")
            .create(statementObjectData);

          validData.object_activity = activity;
        }
      }
      if (statementObjectData.objectType === "SubStatement") {
        // Continue process with substatement
        const subStatement = await strapi
          .query("substatement")
          .create(statementObjectData);
        validData.object_substatement = subStatement;
      }
      if (statementObjectData.objectType === "StatementRef") {
        validData.object_statementref = statementObjectData.cid;
      }
      delete validData.object;
    }

    if (validData.verb) {
      let { verb } = validData;
      const queryVerb = await strapi
        .query("verb")
        .findOne({ verb_id: verb.cid });
      if (queryVerb) {
        validData.verb._id = queryVerb.id;
      } else {
        verb = { verb_id: verb.cid, canonical_data: { ...verb } };
        const entryVerb = await strapi.query("verb").create(verb);
        validData.verb._id = entryVerb.id;
      }
    }
    //Process case Context
    if (validData.context) {
      const { context } = data;
      for (let key in context) {
        // skip loop if the property is from prototype
        if (!context.hasOwnProperty(key)) continue;

        let obj = context[key];
        validData["context_" + key] = obj;
      }
      if (validData.context_instructor) {
        const context_instructor = await strapi
          .query("agent")
          .create(validData.context_instructor);
        validData.context_instructor = context_instructor;
      }
      if (validData.context_team) {
        const context_team = await strapi
          .query("agent")
          .create(validData.context_team);
        validData.context_team = context_team;
      }
      if (validData.context_statement) {
        validData.context_statement = validData.context_statement.cid;
      }
    }
    // Case have result
    if (validData.result) {
      const { result } = validData;
      for (let key in result) {
        // skip loop if the property is from prototype
        if (!result.hasOwnProperty(key)) continue;
        let obj = result[key];
        validData["result_" + key] = obj;
      }
      if (validData.result_score) {
        for (let result_score in validData) {
          // skip loop if the property is from prototype
          if (!result.hasOwnProperty(result_score)) continue;
          let obj = validData[result_score];
          validData["result_score_" + result_score] = obj;
        }
        delete validData.result.score;
        delete validData.result_core;
      }
    }
    if (validData.authority) {
      const { authority } = validData;

      const queryAuthor = await strapi
        .query("agent")
        .findOne({ name: authority.name, mbox: authority.mbox });
      if (queryAuthor && queryAuthor._id) {
        validData.authority._id = queryAuthor.id;
      } else {
        const entryAuthor = await strapi.query("agent").create(authority);
        validData.authority._id = entryAuthor.id;
      }
    }
    // console.log("params ==?", params);

    validData.object_activity = validData.object_activity._id.toString();
    // console.log("validData ==>", validData);
    const insStatement = await strapi
      .query("statement")
      .findOne({ cid: params.cid });
    const entry = await strapi
      .query("statement")
      .update({ id: insStatement.id }, validData);
    if (files) {
      await strapi.entityService.uploadFiles(entry, files, {
        model: "statement",
      });
      return this.findOne({ id: entry.id });
    }
    return entry;
  },
};
