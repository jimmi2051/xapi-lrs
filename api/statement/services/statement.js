"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  async create(data, { files } = {}) {
    // console.log(33333);
    console.log("create ==>", data);

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
        const activity = await strapi
          .query("activity")
          .create(statementObjectData);
        data.object_activity = activity;
      }
      if (statementObjectData.objectType === "SubStatement") {
        // Continue process with substatement
      }
      if (statementObjectData.objectType === "StatementRef") {
        data.object_statementref = statement_object_data.id;
      }
      delete data.object;
      // const { object } = data;
      // let object_activity = {
      //   cid: object.cid,
      //   canonical_data: object.canonical_data ? object.canonical_data : {},
      // };
      // const entryActivity = await strapi
      //   .query("activity")
      //   .create(object_activity);
      // object_activity._id = entryActivity.id;
      // data.object_activity = object_activity;
      // delete data.object;
    }

    if ("verb" in data) {
      let { verb } = data;
      const queryVerb = await strapi
        .query("verb")
        .findOne({ verb_id: verb.cid });
      if (queryVerb) {
        console.log("query ===>", queryVerb);
        data.verb._id = queryVerb.id;
      } else {
        verb = { verb_id: verb.cid, caninical_data: { ...verb } };
        const entryVerb = await strapi.query("verb").create(verb);
        data.verb._id = entryVerb.id;
      }
    }

    // console.log("========>", data);
    // if("context" in data) {
    //   const {context} = data;
    // }
    console.log("data ==>", data);
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
