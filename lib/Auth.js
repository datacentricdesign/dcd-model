"use strict";

const jwkToPem = require("jwk-to-pem");
const jwt = require("jsonwebtoken");
const auth = require("jsonwebtoken");
const fetch = require("node-fetch");
const qs = require("querystring");
const url = require("url");
const SimpleOauth = require("simple-oauth2");

// Load environment variables
const TOKEN_URL = url.parse(process.env.OAUTH2_TOKEN_URL);
const REVOKE_URL = url.parse(process.env.OAUTH2_REVOKE_URL);
const KETO_URL = process.env.KETO_URL;
const API_URL = process.env.API_URL;

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd-model:lib:auth]");
logger.level = process.env.LOG_LEVEL || "INFO";

/**
 * This class handle Authentication and Authorisation processes
 * when interacting with the DCD Hub.
 */
class Auth {
  constructor() {
    this.token = null;
    this.jwtTokenMap = [];
    const params = {
      client: {
        id: process.env.OAUTH2_CLIENT_ID,
        secret: process.env.OAUTH2_CLIENT_SECRET
      },
      auth: {
        tokenHost: "http://" + TOKEN_URL.host,
        tokenPath: TOKEN_URL.path,
        revokePath: REVOKE_URL.path
      },
      http: {
        headers: {
          Accept: "application/json"
        }
      },
      options: {
        bodyFormat: "form"
      }
    };
    if (process.env.HTTPS !== undefined) {
      params.http.headers["X-Forwarded-Proto"] = "https";
      // params.auth.tokenHost = "https://" + TOKEN_URL.host;
    }
    this.oauth2 = SimpleOauth.create(params);
  }

  /**
   * @param {String} token
   * @return {Promise<any>}
   */
  introspect(token) {
    logger.debug("introspect");
    const body = {token: token};
    const url = process.env.OAUTH2_INTROSPECT_URL;
    return this.authorisedRequest(
      "POST",
      url,
      body,
      "application/x-www-form-urlencoded"
    )
      .then(body => {
        if (!body.active) {
          return Promise.reject(new Error("Bearer token is not active"));
        } else if (body.token_type && body.token_type !== "access_token") {
          return Promise.reject(
            new Error("Bearer token is not an access token")
          );
        }
        return Promise.resolve(body);
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  /**
   * Generate a Json Web Token (JWT) out of a private key
   * @param {String} privateKey
   * @returns {*}
   */
  generateJWT(privateKey) {
    logger.debug("## generate JWT");
    const currentTime = Math.floor(Date.now() / 1000);
    const token = {
      iat: currentTime - 3600,
      exp: currentTime + 10 * 31557600, // 10 years
      aud: process.env.API_URL
    };
    const algorithm = "RS256";
    return auth.sign(token, privateKey, {algorithm: algorithm});
  }

  /**
   * Generate a set of private/public keys out of a JWK managed by Hydra.
   * @param set
   * @param body
   * @returns {Promise}
   */
  generateJWK(set, body) {
    logger.debug("generate jwk " + JSON.stringify(body));
    const url = process.env.HYDRA_ADMIN_URL + "/keys/" + set;
    return this.authorisedRequest("POST", url, body)
      .then(result => {
        logger.debug("result to key");
        const jwk = result.keys[0];
        jwk.dp = "";
        jwk.dq = "";
        jwk.qi = "";
        const privateKey = jwkToPem(jwk, {private: true});
        // Convert the JWK into a public key
        this.jwtTokenMap[set] = jwkToPem(jwk);

        const keySet = {
          algorithm: jwk.alg,
          privateKey: privateKey
        };
        return Promise.resolve(keySet);
      })
      .catch(error => {
        logger.error(error);
        return Promise.reject({error: "Not allowed"});
      });
  }

  /**
   * Retrieves the key set for the given key ID from Hydra,
   * then extract the public key and caches it in the map of keys.
   * @param {String} setId
   * @returns {Promise<String|Error>}
   */
  getJWK(setId) {
    logger.debug("get jwk " + setId);
    const url = process.env.HYDRA_ADMIN_URL + "/keys/" + setId;
    return this.authorisedRequest("GET", url)
      .then(result => {
        const jwk = result.keys[0];
        // Convert the JWK into a public key
        const publicKey = jwkToPem(jwk);
        this.jwtTokenMap[setId] = publicKey;
        return Promise.resolve(publicKey);
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  checkJWT(acp, entity) {
    if (!this.jwtTokenMap.hasOwnProperty(entity)) {
      return this.refresh()
        .then(() => {
          return this.getJWK(entity)
            .then(() => {
              return this.checkJWT(acp, entity);
            })
            .catch(() => {
              return Promise.reject({error: "Unknown key set"});
            });
        })
        .catch(error => {
          logger.error(error);
          return Promise.reject(error);
        });
    }
    const introspectionToken = jwt.verify(acp.token, this.jwtTokenMap[entity]);
    const currentTime = new Date().getTime() / 1000;
    if (
      introspectionToken.aud !== undefined &&
      introspectionToken.aud === API_URL &&
      introspectionToken.exp !== undefined &&
      introspectionToken.exp > currentTime
    ) {
      return this.wardenSubject(acp);
    } else {
      return Promise.reject({error: "Token expired"});
    }
  }

  checkJWTAuth(token, entity) {
    if (!this.jwtTokenMap.hasOwnProperty(entity)) {
      return this.refresh()
        .then(() => {
          return this.getJWK(entity)
            .then(() => {
              return this.checkJWTAuth(token, entity);
            })
            .catch(() => {
              return Promise.reject({error: "Unknown key set"});
            });
        })
        .catch(error => {
          logger.error(error);
          return Promise.reject(error);
        });
    }
    return jwt.verify(
      token.toString(),
      this.jwtTokenMap[entity],
      {},
      (error, introspectionToken) => {
        if (error) {
          logger.error(error);
          return Promise.reject(error);
        }
        const currentTime = new Date().getTime() / 1000;
        if (
          introspectionToken.aud !== undefined &&
          introspectionToken.aud === API_URL &&
          introspectionToken.exp !== undefined &&
          introspectionToken.exp > currentTime
        ) {
          return Promise.resolve(introspectionToken);
        } else {
          return Promise.reject({error: "Token expired"});
        }
      }
    );
  }

  wardenSubject(acp) {
    const url = process.env.KETO_URL + "/engines/acp/ory/regex/allowed";
    logger.debug("ketoRequest() => " + url);
    const options = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      method: "POST"
    };
    logger.debug("HTTPS: " + process.env.HTTPS);
    if (process.env.HTTPS !== undefined) {
      logger.debug("HTTPS on, adding XFP header");
      options.headers["X-Forwarded-Proto"] = "https";
    }
    const bodyStr = JSON.stringify(acp);
    options.headers["Content-Length"] = bodyStr.length;
    options.body = bodyStr;
    return fetch(url, options)
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        return Promise.reject(new Error(res.statusText));
      })
      .then(body => {
        if (!body.allowed) {
          return Promise.reject(new Error("Request was not allowed"));
        }
        return Promise.resolve(body);
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  refresh() {
    logger.debug("Refresh");
    if (this.token) {
      logger.debug("refresh: token exist");
      if (this.token.expired()) {
        logger.debug("refresh: token expired, get a new one");
        return this.requestNewToken();
      }
      logger.debug("refresh: token still valid");
      return Promise.resolve();
    }

    logger.debug("refresh: no token yet, getting one");
    return this.requestNewToken();
  }

  requestNewToken() {
    return this.oauth2.clientCredentials
      .getToken({scope: "openid offline"})
      .then(result => {
        logger.debug("refresh: new token, result:");
        logger.debug(result);
        this.token = this.oauth2.accessToken.create(result);
        return Promise.resolve();
      })
      .catch(error => {
        logger.error(error);
        return Promise.reject(error);
      });
  }

  /**
   * Refresh the Authentication token.
   * @return {Promise<T>}
   */
  // refreshToken() {
  //   const params = {};
  //   if (process.env.HTTPS !== undefined) {
  //     params.headers = {
  //       "X-Forwarded-Proto": "https"
  //     };
  //   }
  //   return this.token
  //     .refresh(params)
  //     .then(t => {
  //       logger.debug("refresh: token refreshed: ");
  //       logger.debug(t);
  //       this.token = t;
  //       return Promise.resolve();
  //     })
  //     .catch(error => {
  //       logger.debug("refresh: token failed to refresh: ");
  //       logger.error(error);
  //       return Promise.reject(error);
  //     });
  // }

  getBearer() {
    return "bearer " + qs.escape(this.token.token.access_token);
  }

  /**
   * Build HTTP request with token and return the result
   * @param {String} method
   * @param {String} url
   * @param {Object} body (optional)
   * @param {String} type (default: application/json)
   * @returns {Promise}
   */
  authorisedRequest(method, url, body = null, type = "application/json") {
    logger.debug("authorisedRequest() => " + url);
    const options = {
      headers: {
        Authorization: this.getBearer(),
        "Content-Type": type,
        Accept: "application/json"
      },
      method: method,
      timeout: 15000
    };
    logger.debug("HTTPS: " + process.env.HTTPS);
    if (process.env.HTTPS !== undefined) {
      logger.debug("HTTPS on, adding XFP header");
      options.headers["X-Forwarded-Proto"] = "https";
    }
    if (body !== null) {
      let bodyStr = "";
      if (type === "application/x-www-form-urlencoded") {
        bodyStr = qs.stringify(body);
      } else {
        bodyStr = JSON.stringify(body);
      }
      options.headers["Content-Length"] = bodyStr.length;
      options.body = bodyStr;
    }
    return fetch(url, options)
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        return Promise.reject(new Error(res.statusText));
      })
      .catch(error => {
        logger.error(error);
        return Promise.reject(error);
      });
  }
}

module.exports = Auth;
