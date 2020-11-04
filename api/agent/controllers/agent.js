"use strict";
const _ = require("lodash");
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async find(ctx) {
    let entities;
    if (!ctx.query.agent) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Agents - Error",
          message: "Can't get agent without param agent",
        })
      );
    } else {
      const agent = JSON.parse(ctx.query.agent);
      let isValidate = true;
      if (agent.name) {
        ctx.query.name = agent.name;
      } else {
        isValidate = false;
      }
      if (agent.objectType) {
        ctx.query.objectType = agent.objectType;
      } else {
        isValidate = false;
      }
      if (agent.account) {
        ctx.query.account = agent.account;
      } else {
        isValidate = false;
      }
      if (isValidate === false) {
        return ctx.badRequest(
          null,
          formatError({
            id: "Agents - Error",
            message: "Can't get agent invalid agent",
          })
        );
      }
      delete params.agent;
    }
    if (ctx.query._q) {
      entities = await strapi.services.agent.search(ctx.query);
    } else {
      entities = await strapi.services.agent.find(ctx.query);
    }
    if (_.isEmpty(entities)) {
      ctx.status = 204;
    }
    return entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models.agent })
    );
  },
  async getProfile(ctx) {
    ctx.status = 200;
    return ctx;
  },
  async createProfile(ctx) {
    ctx.status = 204;
    return ctx;
  },
  async deleteProfile(ctx) {
    ctx.status = 400;
    return ctx;
  },
  async updateProfile(ctx) {
    ctx.status = 400;
    return ctx;
  },
};
