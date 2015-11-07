var crypto = require("crypto"),
  _ = require('lodash'),
  request = require('request'),
  changeCase = require('change-case');
var goibiboClient = require("../lib/goibibo.js");
var session = require("../lib/session");
var loopback = require('loopback');
var bunyan = require('bunyan'),
  log = bunyan.createLogger({
    name: 'Reviewer'
  });
var promised = require("promised-io/promise");
module.exports = function(User) {
  User.validatesUniquenessOf('email');

  var getSessionDetails = function(ctx, model, next) {
    session.getSessionDetails(User, function(sessionDetails) {
      if (!sessionDetails) {
        var e = new Error('Un-authorized access');
        e.status = e.statusCode = 401;
        return next(e);
      }
      next();
    });
  }
