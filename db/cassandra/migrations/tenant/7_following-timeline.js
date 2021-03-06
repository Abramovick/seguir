var async = require('async');

function apply (keyspace, api, next) {
  var addFollowingTimeliCql = [
    'CREATE TABLE ' + keyspace + '.following_timeline (follow uuid, user_follower uuid, user uuid, is_private boolean, is_personal boolean, is_public boolean, time timeuuid, since timestamp, PRIMARY KEY (user_follower, time)) WITH CLUSTERING ORDER BY (time DESC)',
    'CREATE INDEX ON ' + keyspace + '.following_timeline(follow)',
    'CREATE INDEX ON ' + keyspace + '.following_timeline(user)',
    'CREATE INDEX ON ' + keyspace + '.following_timeline(is_private)',
    'CREATE INDEX ON ' + keyspace + '.following_timeline(is_personal)',
    'CREATE INDEX ON ' + keyspace + '.following_timeline(is_public)'
  ];

  async.series(
    [
      function (cb) {
        async.mapSeries(addFollowingTimeliCql, api.client.execute, cb);
      },
      function (cb) {
        var write = 0;
        var read = 0;
        var done = false;
        var selectQuery = 'SELECT follow, user, user_follower, time, since, is_private, is_personal, is_public FROM ' + keyspace + '.followers_timeline;';
        var insertQuery = 'INSERT INTO ' + keyspace + '.following_timeline (follow, user_follower, user, time, since, is_private, is_personal, is_public) VALUES(?, ?, ?, ?, ?, ?, ?, ?);';
        api.client._client.eachRow(selectQuery, [], {autoPage: true}, function (index, row) {
          read++;

          api.client.execute(insertQuery, [row.follow, row.user_follower, row.user, row.time, row.since, row.is_private, row.is_personal, row.is_public], {prepare: true}, function (err) {
            if (err) {
              throw err;
            }
            if (read === ++write && done) {
              cb();
            }
          });
        }, function () {
          done = true;
        });
      }
    ], next);
}

function rollback (keyspace, api, next) {
  next();
}

module.exports = {
  apply: apply,
  rollback: rollback
};
