var express = require('express');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');
var time = require('time')(Date);

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

router.get('/metal_dungeons', function (req, res) {
  pad_get_schedule(function (data) {
    res.json(data);
  });
});

function pad_get_schedule(callback) {
  if (this.cache && this.cache_time && (new Date().getTime() - this.cache_time.getTime()) < 15 * 60 * 1000) {
    callback(this.cache);
    return;
  }
  var that = this;
  request('http://puzzledragonx.com', function (err, res, html) {
    if (err) {
      callback({ "status": "1" });
      return;
    }
    var schedule = pad_parse_schedule(html);
    that.cache = { "dungeons": schedule };
    that.cache_time = new Date();
    callback(that.cache);
  });
}

/**
 * Assumptions
 * - 2 dungeon at a time max
 */
function pad_parse_schedule(html) {
  var $ = cheerio.load(html);
  var groups = ['a', 'b', 'c', 'd', 'e'];
  var schedule = {};
  for (var i = 0; i < groups.length; i++) {
    schedule[groups[i]] = [];
  }
  rows = $("#metal1a table tr");
  // 2 just because
  for (var i = 2; i < rows.length; i += 2) {
    var round = rows.eq(i).children();
    var dungeons_row = rows.eq(i - 1).children();
    for (var j = 0; j < groups.length; j++) {
      // k < 2 worth?
      for (var k = 0; k < 2; k++) {
        // * 2, 3, just because
        try {
          var url = dungeons_row.eq(j * 3 + k).find("a").attr("href");
          schedule[groups[j]].push({
            "time": pad_format_time(round.eq(j * 2).text()),
            "link": pad_full_url(url),
            "image": pad_full_url(dungeons_row.eq(j * 3 + k).find("img").attr("data-original").replace("thumbnail", "book")),
            "name": db_get_dungeon_name(url, $)
          });
        } catch (ignore) { console.log(ignore);}
      }
    }
  }
  return schedule;
}

function pad_full_url(path) {
  return "http://puzzledragonx.com/" + path;
}

function pad_format_time(t) {
  var hour_minute = pad_parse_time(t);
  if (hour_minute == null) {
    return 0;
  }
  var date = new Date();
  date.setHours(hour_minute[0]);
  date.setMinutes(hour_minute[1]);
  date.setSeconds(0);
  date.setMilliseconds(0);
  date.setTimezone("America/Vancouver", true);
  return date.getTime() / 1000;
}

/**
 * Assume
 * - 3 pm
 * - 3:30 pm
 */
function pad_parse_time(t) {
  try {
    var time_ampm = t.split(" ");
    time_ampm[0] += ":00";
    var hour_minute = time_ampm[0].split(":");
    var hour = +hour_minute[0];
    var minute = +hour_minute[1];
    if (time_ampm[1] == "am") {
      if (hour == 12) {
        return [0, minute];
      }
      return [hour, minute];
    }
    if (hour == 12) {
      return [12, minute];
    }
    return [hour + 12, minute];
  } catch (e) {
    // e.g. time not out yet, will fail to parse
    return null;
  }
}

function db_log_daily_dungeon(dungeon_id, group, t) {
  return;
}

function db_log_special_dungeon(dungeon_id, start_time, end_time) {
  return;
}

function db_get_dungeon_name(url, $) {
  // first search db
  var dungeon_id = url.split("=")[1];
  var dungeon_name = $("a[href=\"" + url + "\"]").text().trim();
  // log
  return dungeon_name;
}

module.exports = router;
