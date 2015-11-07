var redis = require("./redis"),
  Cookie = require('cookies'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'Session'});
var loopback = require('loopback');
module.exports = (function(){
  var  sessionTTL = 60*60;
  var loopbackContext = null,loopbackActiveContext=null;
  var getCookies = function(req,res){
    return new Cookie(req,res);
  };

  var getSessionData = function(authTokenId,model,cb){
    redis.get("session:"+authTokenId,function(err,value){
      if(err){
        log.info(err,"Un-authenticated request!");
        return cb(false);
      }
      var sessionDetails = JSON.parse(value);
      if(sessionDetails!=null){
        cb(sessionDetails);
      }
      else
        initializeSession(authTokenId,model,cb);
    });
  };

  var initializeSession= function(authTokenId,model,cb){
    getUserId(model,authTokenId,function(userId){
      if(userId){
        model.app.models.Reviewer.findOne({'where':{'id':userId}},function(err,reviewer){
          saveToRedis(err,authTokenId,reviewer);
        });
      }else{
        return cb(false);
      }
    });
    var saveToRedis= function(err,authTokenId,reviewer){
      var sessionDetails = false;
      if(err){
        log.info(err,"Un-authenticated request!");
        return cb(false);
      }
      else{
        sessionDetails = JSON.stringify({"reviewer":reviewer});
      }
      redis.set("session:"+authTokenId,sessionDetails,function(err,data){
        redis.expire("session:"+authTokenId,sessionTTL);
        cb(JSON.parse(sessionDetails));
      });
    };
  };

  var getUserId = function(model,authTokenId,cb){
    if(loopbackActiveContext.accessToken && loopbackActiveContext.accessToken.userId){
      cb(loopbackActiveContext.accessToken.userId);
    }else if(authTokenId){
      loopbackActiveContext.http.req.signedCookies = {"ugcAuthToken":authTokenId};
      model.app.models.AccessToken.findForRequest(loopbackActiveContext.http.req,{cookies:["ugcAuthToken"]},function(err,token){
        if(token){
          cb(token.userId);
        }else{
          cb(null);
        }
      });
    }else{
      cb(null);
    }
  };

  var getAuthTokenId = function(){
    if(!loopbackActiveContext){
      return null;
    }
    else if(loopbackActiveContext.accessToken){
      return loopbackActiveContext.accessToken.id;
    }
    else{
      var cookies = getCookies(loopbackActiveContext.http.req,loopbackActiveContext.http.res);
      return cookies.get('ugcAuthToken');
    }
  };

  return {
    getSessionDetails: function(model,cb){
      loopbackContext = loopback.getCurrentContext();
      loopbackActiveContext = loopbackContext.active;
      var authTokenId = getAuthTokenId();
      console.log("authTokenId===="+authTokenId);
      if(!authTokenId){
        log.info("authTokenId doesn't exist!","Un-authenticated request!");
        return cb(false);
      }
      var setContext = function(sessionDetails){
        loopbackContext.set('sessionData',sessionDetails);
        cb(sessionDetails);
      };
      getSessionData(authTokenId,model,setContext);
    },
    resetSessionDetails: function(model,cb){
      if(!loopbackContext){
        loopbackContext = loopback.getCurrentContext();
        loopbackActiveContext = loopbackContext.active;
      }
      var authTokenId = getAuthTokenId();
      if(!authTokenId){
        log.info("authTokenId doesn't exist!","Un-authenticated request!");
        return cb(false);
      }
      var setContext = function(sessionDetails){
        loopbackContext.set('sessionData',sessionDetails);
        cb(sessionDetails);
      };
      initializeSession(authTokenId,model,setContext);
    }
  };
})();
