"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const _ = require("lodash");
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const { parseRequest } = require("../../../utils/parseRequest");
const { validateStatements } = require("../../../utils/validateStatement");
const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
  async create(ctx) {
    const request = parseRequest(ctx.request);
    const statements = { ...request.body };
    const validate = validateStatements(statements);
    if (validate.status !== true) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Statement Validate - Error",
          message: validate.message,
        })
      );
    }
    let entity;
    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.statement.create(data, { files });
    } else {
      entity = await strapi.services.statement.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.models.statement });
  },
  async find(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.statement.search(ctx.query);
    } else {
      entities = await strapi.services.statement.find(ctx.query);
    }
    if (_.isEmpty(entities)) {
      ctx.status = 204;
    }
    return entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models.statement })
    );
  },
  async about(ctx) {
    return {
      status: true,
    };
  },
  async update(ctx) {
    const cid = ctx.query.StatementId;
    const request = parseRequest(ctx.request);
    const statements = { ...request.body };
    const validate = validateStatements(statements);
    if (validate.status !== true) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Statement Validate - Error",
          message: validate.message,
        })
      );
    }
    let entity;
    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.statement.update({ cid }, data, {
        files,
      });
    } else {
      entity = await strapi.services.statement.update(
        { cid },
        ctx.request.body
      );
    }
    ctx.status = 204;
    return sanitizeEntity(entity, { model: strapi.models.statement });
  },
};
