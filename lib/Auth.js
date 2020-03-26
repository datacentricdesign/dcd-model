"use strict";

const jwkToPem = require("jwk-to-pem");
const jwt = require("jsonwebtoken");
const pem2jwk = require("pem-jwk").pem2jwk;

const auth = require("jsonwebtoken");
const fetch = require("node-fetch");
const qs = require("querystring");
const url = require("url");
const SimpleOauth = require("simple-oauth2");

// Load environment variables
const TOKEN_URL = url.parse(process.env.OAUTH2_TOKEN_URL);
const REVOKE_URL = url.parse(process.env.OAUTH2_REVOKE_URL);
const API_URL = process.env.API_URL;
const HTTPS = process.env.HTTPS;

const scope = process.env.OAUTH2_SCOPE || "";

const DCDError = require("./DCDError");

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd-model:lib:auth]");
logger.level = process.env.LOG_LEVEL || "INFO";

/**
 * This class handle Authentication and Authorisation processes
 * when interacting with the DCD Hub.
 */
class Auth {
  constructor(newModel) {
    this.model = newModel;
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
    if (HTTPS !== undefined) {
      params.http.headers["X-Forwarded-Proto"] = "https";
      // params.auth.tokenHost = "https://" + TOKEN_URL.host;
    }
    this.oauth2 = SimpleOauth.create(params);
  }

  /**
   * @param {string} token
   * @param {Array<string>} requiredScope
   * @return {Promise<any>}
   */
  introspect(token, requiredScope = []) {
    logger.debug("introspect");
    logger.debug(requiredScope.join(" "));
    const body = { token: token };
    // const body = { token: token, scope: requiredScope.join(" ") };
    const url = process.env.OAUTH2_INTROSPECT_URL;
    return this.authorisedRequest(
      "POST",
      url,
      body,
      "application/x-www-form-urlencoded"
    )
      .then(body => {
        logger.debug("result introspect:");
        logger.debug(body);
        if (!body.active) {
          return Promise.reject(
            new DCDError(4031, "The bearer token is not active")
          );
        }
        if (body.token_type && body.token_type !== "access_token") {
          return Promise.reject(
            new DCDError(4031, "The bearer token is not an access token")
          );
        }
        // const scopeArray = body.scope.split(" ");
        // logger.debug("provided scope:");
        // logger.debug(scopeArray);
        // for (let index = 0; index < requiredScope.length; index++) {
        //   logger.debug("looking for required scope " + requiredScope[index]);
        //   if (!scopeArray.includes(requiredScope[index])) {
        //     logger.debug("array does not include " + requiredScope[index]);
        //     return Promise.reject(
        //       new DCDError(
        //         4031,
        //         "The bearer token does not grant access to the required scope " +
        //           requiredScope[index]
        //       )
        //     );
        //   }
        // }
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
    return auth.sign(token, privateKey, { algorithm: algorithm });
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
        const privateKey = jwkToPem(jwk, { private: true });
        // Convert the JWK into a public key
        this.jwtTokenMap[set] = jwkToPem(jwk);
        logger.debug("pub");
        logger.debug(this.jwtTokenMap[set]);
        logger.debug("pub");
        const keySet = {
          algorithm: jwk.alg,
          privateKey: privateKey
        };
        return Promise.resolve(keySet);
      })
      .catch(error => {
        return Promise.reject(new DCDError(403, error.message));
      });
  }

  /**
   * Retrieves the key set for the given key ID from Hydra,
   * then extract the public key and caches it in the map of keys.
   * @param {string} setId
   * @returns {Promise<string|DCDError>}
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

  setJWK(setId, jwk) {
    logger.debug("set jwk " + setId);
    const url = process.env.HYDRA_ADMIN_URL + "/keys/" + setId;
    return this.authorisedRequest("PUT", url, jwk)
      .then(result => {
        logger.debug("result set: ");
        logger.debug(result);
        const jwk = result.keys[0];
        // Convert the JWK into a public key, and store it for later use
        this.jwtTokenMap[setId] = jwkToPem(jwk);
        return Promise.resolve(jwk);
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  setPEM(setId, pem) {
    logger.debug("set pem " + setId);
    return this.setJWK(setId, pem2jwk(pem));
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
              return Promise.reject(new DCDError(404, "Unknown key set"));
            });
        })
        .catch(error => {
          logger.error(error);
          return Promise.reject(error);
        });
    }
    const introspectionToken = jwt.verify(acp.token, this.jwtTokenMap[entity]);
    const currentTime = Math.floor(new Date() / 1000);;
    logger.debug(introspectionToken.aud);
    logger.debug(API_URL);
    logger.debug(introspectionToken.exp);
    logger.debug(currentTime);
    if (
      introspectionToken.aud !== undefined &&
      introspectionToken.aud === API_URL &&
      introspectionToken.exp !== undefined &&
      introspectionToken.exp > currentTime
    ) {
      return this.model.policies.check(acp);
    } else {
      return Promise.reject(new DCDError(403, "Token expired"));
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
              return Promise.reject(new DCDError(404, "Unknown key set"));
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
        const currentTime = Math.floor(new Date() / 1000);;
        logger.debug(introspectionToken.aud);
        logger.debug(API_URL);
        logger.debug(introspectionToken.exp);
        logger.debug(currentTime);
        if (
          introspectionToken.aud !== undefined &&
          introspectionToken.aud === API_URL &&
          introspectionToken.exp !== undefined &&
          introspectionToken.exp > currentTime
        ) {
          return Promise.resolve(introspectionToken);
        } else {
          return Promise.reject(new DCDError(403, "Token expired"));
        }
      }
    );
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
      .getToken({ scope: scope })
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

  // /**
  //  * Refresh the Authentication token.
  //  * @return {Promise<T>}
  //  */
  // refreshToken() {
  //   const params = {};
  //   if (HTTPS !== undefined) {
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
    if (HTTPS !== undefined) {
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
        return Promise.reject(new DCDError(res.status, res.statusText));
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
}

module.exports = Auth;
