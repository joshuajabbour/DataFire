"use strict";

const nodepath = require('path');
const Response = require('./response');
const Context = require('./context');
const util = require('../util');

/**
 * Creates a new Action
 * @class Action
 * @param {Object} options
 * @param {Function} options.handler
 * @param {string} options.title
 * @param {string} options.description
 * @param {Object} options.inputSchema - JSON Schema
 * @param {Array} options.inputs
 * @param {Object} options.inputs[] - JSON Schema
 * @param {Object} outputSchema - JSON Schema
 */
const Action = module.exports = function(opts) {
  opts = opts || {};
  this.handler = opts.handler || (_ => Promise.resolve(null));
  this.id = opts.id || 'anonymous';
  this.title = opts.title || '';
  this.description = opts.description || '';
  this.outputSchema = opts.outputSchema || {};
  this.inputSchema = opts.inputSchema || {};
  this.inputs = opts.inputs || null;
  this.security = opts.security || {};

  if (opts.inputs) {
    this.inputSchema = util.schemas.getSchemaFromArray(opts.inputs);
  }
  this.ajv = opts.ajv || util.ajv.getInstance();
}

/**
 * Creates a new action by its common name, i.e. how it's referenced
 * in DataFire.yml. Names starting with './' will be treated as local
 * files, and opened relative to 'directory'. Names in the format
 * integration/action will be retrieved from the named integration.
 *
 * @param {string} name - Action common name, e.g. ./actions/foo.js or github/users.get
 * @param {string} directory - the directory relative to which local actions are referenced
 * @param {Object} integrations - a list of Integration objects, keyed by ID
 */
Action.fromName = function(name, directory, integrations={}) {
  let isFile = /^\.?\//.test(name);
  if (isFile) {
    let action = require(nodepath.join(directory, name));
    if (!(action instanceof Action)) action = new Action(action);
    return action;
  }
  let slash = name.indexOf('/');
  if (slash === -1) throw new Error("Could not find action " + name);
  let integrationName = name.substring(0, slash);
  const Integration = require('./integration');
  let integration = integrations[integrationName] || Integration.fromName(name.substring(0, slash));
  let action = integration.action(name.substring(slash + 1, name.length));
  return action;
}

/**
 * Creates a new action from an openapi definition
 * @param {string} method
 * @param {string} path
 * @param {Object} openapi - Open API specification
 * @param {Integration} integration - the integration this action is being added to
 */
Action.fromOpenAPI = require('./openapi-action');

/**
 * Runs the action's handler for the given input and context.
 *
 * @param {*} input - Input to pass to the handler
 * @param {Context} [context] - The context to pass to the handler
 */
Action.prototype.run = function(input, ctx) {
  ctx = ctx || new Context();
  if (input === undefined) input = null;
  if (this.inputs && input === null) input = {};
  if (!input && this.inputSchema.type === 'object' && !this.inputSchema.required) {
    input = {};
  }
  if (!this.validateInput) {
    // We defer schema compilation until the action is used.
    this.validateInput = this.ajv.compile(this.inputSchema);
  }
  let valid = this.validateInput(input);
  if (!valid) {
    let error = new Error(this.ajv.errorsText(this.validateInput.errors));
    error.statusCode = 400;
    return Promise.reject(error);
  }

  for (let key in this.security) {
    let sec = this.security[key];
    if (sec && !sec.optional && !ctx.accounts[key]) {
      return Promise.reject(new Error("Account " + key + " not specified for action " + this.id + ". Did you remember to pass in the 'context' object?"));
    }
  }

  return Promise.resolve().then(_ => {
    let ret = this.handler(input, ctx);
    if (ret === undefined) throw new Error("Handler must return a Promise, Response, or value");
    return ret;
  });
}

