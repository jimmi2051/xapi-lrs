"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  find(params, populate) {
    console.log("parsm ==>", params);
    if (params.agent) {
      const agent = JSON.parse(params.agent);
      params.name = agent.name;
      params.objectType = agent.objectType;
      params.account = agent.account;
      delete params.agent;
    }
    return strapi.query("agent").find(params, populate);
  },
};
