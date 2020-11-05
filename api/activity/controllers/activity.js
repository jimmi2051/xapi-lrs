"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async getState(ctx) {
    ctx.status = 400;
    return ctx;
  },
  async createState(ctx) {
    ctx.status = 204;
    return ctx;
  },
  async deleteState(ctx) {
    ctx.status = 400;
    return ctx;
  },
  async updateState(ctx) {
    ctx.status = 400;
    return ctx;
  },
  async getActivityByProfile(ctx) {
    ctx.status = 400;
    return ctx;
  },
  async createActivityByProfile(ctx) {
    ctx.status = 204;
    return ctx;
  },
  async updateActivityByProfile(ctx) {
    ctx.status = 400;
    return ctx;
  },
  async deleteActivityByProfile(ctx) {
    ctx.status = 400;
    return ctx;
  },
};
