const _ = require("lodash");

const replaceIdToCid = (object) => {
  for (let key in object) {
    // skip loop if the property is from prototype
    if (!object.hasOwnProperty(key)) continue;

    if (key === "id") {
      object.cid = object.id;
      delete object.id;
    }
    if (_.isObject(object[key])) {
      replaceIdToCid(object[key]);
    }
  }
};
module.exports = (strapi) => {
  return {
    // can also be async
    initialize() {
      strapi.app.use(async (ctx, next) => {
        // await someAsyncCode()
        let body = ctx.request.body;
        replaceIdToCid(body);
        // deepdash.eachDeep(ctx.request.body, (value, key, parent, context) => {
        //   console.log(
        //     _.repeat("  ", context.depth) +
        //       key +
        //       ":" +
        //       (value === null ? "null" : typeof value),
        //     context.parent && context.parent.path && " @" + context.parent.path
        //   );
        //   // console.log("value", value);
        //   // console.log("key", key);
        //   // console.log("parent ==>", parent);
        //   // if (context.parent.id) {
        //   //   context.parent.cid = context.parent.id;
        //   //   delete context.parent.id;
        //   // }
        // });
        if (ctx.request.body.id) {
          ctx.request.body.cid = ctx.request.body.id;
          delete ctx.request.body.id;
        }
        await next();

        // await someAsyncCode()
      });
    },
  };
};
