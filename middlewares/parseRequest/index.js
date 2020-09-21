const _ = require("lodash");

const moment = require("moment"); // require
const IF_MATCH = "http_if_match";
const IF_NONE_MATCH = "http_if_none_match";

const parseRequest = (request, moreId = null) => {
  const rObj = {};

  rObj.headers = getHeaders(request.headers);

  rObj.params = {};
  if (request.method === "POST" && request.query.method) {
    // parse CORS
    parseCorsRequest(request, rObj);
  } else {
    // Parse normal
    parseNormalRequest(request, rObj);
  }
  rObj["domain"] = request.headers.host;
  rObj.scheme = request.secure ? "https" : "http";
  request = { ...request, ...rObj };
};

const parseCorsRequest = (request, rObj) => {
  try {
    rObj.method = request.query.method.toLowerCase();
  } catch {
    return "Could not find method parameter for CORS request";
  }
  if (Object.keys(request.query).length > 1) {
    return "CORS must only include method in query string parameters";
  }
  rObj.body = request.body;
  rObj.params = request.body;
};

const parseNormalRequest = (request, rObj) => {
  if (request.method === "POST" || request.method === "PUT") {
    if (rObj.headers.contentType) {
      if (rObj.headers.contentType.includes("multipart/mixed")) {
        // process parse attactment
      } else {
        rObj.rawBody = request.body;
      }
    }
  } else if (request.method === "DELETE") {
    if (request.body !== "") {
      rObj.params = request.body;
    }
  }
  rObj.params = request.query;
  rObj.method = request.method;
};

const getHeaders = (headers) => {
  let headerObj = {};
  if (headers.http_updated) {
    try {
      headerObj.updated = moment(popObject(headers, "http_updated")).format(
        "DD-MM-YYYY"
      );
    } catch {}
  } else if (headers.updated) {
    try {
      headerObj.updated = moment(popObject(headers, "updated")).format(
        "DD-MM-YYYY"
      );
    } catch {}
  }
  headerObj.contentType = popObject(headers, "content_type");
  if (
    (!headerObj.contentType || headerObj.contentType === "") &&
    headers["content-type"]
  ) {
    headerObj.contentType = popObject(headers, "content-type");
  }
  if (headerObj.contentType && headerObj.contentType !== "") {
    if (
      headerObj.contentType.includes(";") &&
      !headerObj.contentType.includes("boundary")
    ) {
      headerObj.contentType = headerObj.contentType.split(";")[0];
    }
  }
  headerObj.etag = getEtagInfo(headers);

  if ("http_authorization" in headers) {
    headerObj.authorization = headers["http_authorization"];
  } else if ("authorization" in headers) {
    headerObj.authorization = headers["authorization"];
  }

  if ("accept_language" in headers) {
    headerObj.language = popObject(headers, "accept_language");
  } else if ("accept-language" in headers) {
    headerObj.language = popObject(headers, "accept-language");
  } else if ("http_accept_language" in headers) {
    headerObj.language = popObject(headers, "http_accept_language");
  }
  if (headers["x-experience-api-version"]) {
    headerObj["x-experience-api-version"] = popObject(
      headers,
      "x-experience-api-version"
    );
  }
  return headerObj;
};

const getEtagInfo = (headers) => {
  const etag = {};
  etag[IF_MATCH] = headers[IF_MATCH];
  if (_.isNull(etag[IF_MATCH])) {
    etag[IF_MATCH] = headers["if_match"];
  }
  if (_.isNull(etag[IF_MATCH])) {
    etag[IF_MATCH] = headers["if-match"];
  }
  etag[IF_NONE_MATCH] = headers[IF_NONE_MATCH];
  if (_.isNull(etag[IF_NONE_MATCH])) {
    etag[IF_NONE_MATCH] = headers["if_none_match"];
  }
  if (_.isNull(etag[IF_NONE_MATCH])) {
    etag[IF_NONE_MATCH] = headers["if-none-match"];
  }
  etag[IF_MATCH] = etag[IF_MATCH] ? etag[IF_MATCH] : null;
  etag[IF_NONE_MATCH] = etag[IF_NONE_MATCH] ? etag[IF_NONE_MATCH] : null;
  return etag;
};

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
        const path = ctx.request.url;
        if (path.includes("statement")) {
          // await someAsyncCode()
          // console.log("ctx ==>", ctx.request);

          parseRequest(ctx.request);

          if (path[path.length - 1] === "/") {
            path = path.splice(path[path.length - 1], 1);
          }
          if (path.includes("more")) {
            //Need to process cutoff more_id
          }
        }

        let body = ctx.request.body;
        replaceIdToCid(body);
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
