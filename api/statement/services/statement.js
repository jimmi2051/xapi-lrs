"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  async create(data, { files } = {}) {
    console.log("data ==>", data);

    if ("actor" in data) {
      const { actor } = data;
      const entryActor = await strapi.query("agent").create(actor);
      data.actor._id = entryActor.id;
    }

    if ("object" in data) {
      const { object } = data;
      let object_activity = {
        cid: object.cid,
        canonical_data: object.canonical_data ? object.canonical_data : {},
      };
      const entryActivity = await strapi
        .query("activity")
        .create(object_activity);
      object_activity._id = entryActivity.id;
      data.object_activity = object_activity;
      delete data.object;
    }

    if ("verb" in data) {
      let { verb } = data;
      verb = { verb_id: verb.cid, caninical_data: { ...verb } };
      const entryVerb = await strapi.query("verb").create(verb);
      data.verb._id = entryVerb.id;
    }

    console.log("========>", data);
    // if("context" in data) {
    //   const {context} = data;
    // }
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
