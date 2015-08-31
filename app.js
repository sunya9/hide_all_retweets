var fs = require('fs');
var twitter = require('twitter');
var async = require('async');
var settings = require('./settings');

var client = new twitter(settings);

var BACKUP_PATH = 'backup/';

async.waterfall([mkdir, backup, getFriendIds, updateFriendships], result);

function result(err, res){
  if(err) return console.error(err);
}

function mkdir(callback){
  fs.mkdir(BACKUP_PATH, function(err){
    callback();
  });
}

function backup(callback){
  client.get('friendships/no_retweets/ids', {stringify_ids: true}, function(err, body){
    if(err) return callback(err);
    fs.writeFile(BACKUP_PATH + Date.now() + '.json', JSON.stringify(body), 'utf8', function(err){
      callback(err);
    });
  });
}

function getFriendIds(callback){
  var cursor = -1;
  var res = [];
  function condition(){
    return cursor !== '0';
  }
  function loop(loopCallback){
    client.get('friends/ids', {stringify_ids: true ,cursor: cursor}, function(err, body){
      if(err) return loopCallback(err);
      Array.prototype.push.apply(res, body.ids);
      cursor = body.next_cursor_str;
      loopCallback(null);
    });
  }
  function end(err){
    callback(err, res);
  }
  async.whilst(condition, loop, end);
}

function updateFriendships(ids, callback){
  var i = 0;
  var limit = 100;
  function updateFriendship(id, updateFriendshipCallback){
    client.post('friendships/update', {user_id: id, retweets: false}, function(err, body){
      if(err) return updateFriendshipCallback(err);
      console.log('[%d/%d] hide %s\'s retweets.', ++i, ids.length, id);
      updateFriendshipCallback(null);
    });
  }
  async.eachLimit(ids, limit, updateFriendship, callback);
}