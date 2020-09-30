const _ = require("lodash");

const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = async (ctx, next) => {
  let role;

  const store = await strapi.store({
    environment: "",
    type: "plugin",
    name: "users-permissions",
  });

  if (ctx.state.user) {
    // request is already authenticated in a different way
    return next();
  }
  try {
    const provider = "local";
    const query = { provider };
    const req = ctx.request;
    const base64Credentials = req.headers.authorization.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString(
      "ascii"
    );
    const [email, password] = credentials.split(":");
    // Check if the provided identifier is an email or not.
    query.email = email.toLowerCase();
    const user = await strapi.query("user", "users-permissions").findOne(query);
    if (!user) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.form.error.invalid",
          message: "Identifier or password invalid.",
        })
      );
    }
    if (
      _.get(await store.get({ key: "advanced" }), "email_confirmation") &&
      user.confirmed !== true
    ) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.form.error.confirmed",
          message: "Your account email is not confirmed",
        })
      );
    }

    if (user.blocked === true) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.form.error.blocked",
          message: "Your account has been blocked by an administrator",
        })
      );
    }

    // The user never authenticated with the `local` provider.
    if (!user.password) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.form.error.password.local",
          message:
            "This user never set a local password, please login with the provider used during account creation.",
        })
      );
    }

    const validPassword = strapi.plugins[
      "users-permissions"
    ].services.user.validatePassword(password, user.password);

    if (!validPassword) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.form.error.invalid",
          message: "Identifier or password invalid.",
        })
      );
    } else {
      let { request } = ctx;
      request.auth = {};
      request.auth.endpoint = request.url;
      request.oauthToken = strapi.plugins[
        "users-permissions"
      ].services.jwt.issue({
        id: user.id,
      });
      request.auth.type = "http";
      request.auth.user = user;
      request.auth.agent = user.user_agent ? user.user_agent : user;
      request.auth.define = true;
      // request.body.authority = user.user_agent ? user.user_agent : user;
      // request.body.full_statement = {
      //   authority: user,
      // };

      return next();
    }
  } catch (e) {
    console.log("[DEBUG] ERROR | ", e);
  }
  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    try {
      const { id } = await strapi.plugins[
        "users-permissions"
      ].services.jwt.getToken(ctx);

      if (id === undefined) {
        throw new Error("Invalid token: Token did not contain required fields");
      }

      // fetch authenticated user
      ctx.state.user = await strapi.plugins[
        "users-permissions"
      ].services.user.fetchAuthenticatedUser(id);
    } catch (err) {
      return handleErrors(ctx, err, "unauthorized");
    }

    if (!ctx.state.user) {
      return handleErrors(ctx, "User Not Found", "unauthorized");
    }

    role = ctx.state.user.role;

    if (role.type === "root") {
      return await next();
    }

    const store = await strapi.store({
      environment: "",
      type: "plugin",
      name: "users-permissions",
    });

    if (
      _.get(await store.get({ key: "advanced" }), "email_confirmation") &&
      !ctx.state.user.confirmed
    ) {
      return handleErrors(
        ctx,
        "Your account email is not confirmed.",
        "unauthorized"
      );
    }

    if (ctx.state.user.blocked) {
      return handleErrors(
        ctx,
        "Your account has been blocked by the administrator.",
        "unauthorized"
      );
    }
  }

  // Retrieve `public` role.
  if (!role) {
    role = await strapi
      .query("role", "users-permissions")
      .findOne({ type: "public" }, []);
  }

  const route = ctx.request.route;
  const permission = await strapi
    .query("permission", "users-permissions")
    .findOne(
      {
        role: role.id,
        type: route.plugin || "application",
        controller: route.controller,
        action: route.action,
        enabled: true,
      },
      []
    );

  if (!permission) {
    return handleErrors(ctx, undefined, "forbidden");
  }

  // Execute the policies.
  if (permission.policy) {
    return await strapi.plugins["users-permissions"].config.policies[
      permission.policy
    ](ctx, next);
  }

  // Execute the action.
  await next();
};

const handleErrors = (ctx, err = undefined, type) => {
  throw strapi.errors[type](err);
};
