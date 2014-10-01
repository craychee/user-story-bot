var restclient = require('node-restclient');
var Twit = require('twit');
var conf = require('nconf');
var app = require('express').createServer();

// I deployed to Nodejitsu, which requires an application to respond to HTTP requests
// If you're running locally you don't need this, or express at all.
app.get('/', function(req, res){
    res.send('Hello world.');
});
app.listen(3000);

conf.use('file', { file: './keys.json' });
conf.load();

// Twitter app info here.
var T = new Twit({
  consumer_key:         conf.get('consumer_key'),
  consumer_secret:      conf.get('consumer_secret'),
  access_token:         conf.get('access_token'),
  access_token_secret:  conf.get('access_token_secret'),
});

var statement =   "";

// Wordnik API info here.
var getNounsURL = "http://api.wordnik.com/v4/words.json/randomWords?" +
                  "minCorpusCount=1000&minDictionaryCount=10&" +
                  "excludePartOfSpeech=proper-noun,proper-noun-plural,proper-noun-posessive,suffix,family-name,idiom,affix&" +
                  "hasDictionaryDef=true&includePartOfSpeech=noun&limit=2&maxLength=12&" +
                  "api_key=" +
                  conf.get('wordnik_key');

var getIntVerbURL =  "http://api.wordnik.com/v4/words.json/randomWords?" +
                  "hasDictionaryDef=true&includePartOfSpeech=verb-transitive&limit=2&" +
                  "minCorpusCount=100&api_key=" +
                  conf.get('wordnik_key');

var getVerbURL =  "http://api.wordnik.com/v4/words.json/randomWords?" +
                  "hasDictionaryDef=true&includePartOfSpeech=verb&limit=2&" +
                  "minCorpusCount=100&api_key=" +
                  conf.get('wordnik_key');

function makeUserStory() {
  statement = "As a bot, I want to ";

  restclient.get(getIntVerbURL,
      function(data) {
        statement += data[0].word + " ";
      }
    ,"json");

  restclient.get(getNounsURL,
  function(data) {
    noun = data[0].word.substr(0,1);
    article = "a";
    if (noun === 'a' ||
        noun === 'e' ||
        noun === 'i' ||
        noun === 'o' ||
        noun === 'u') {
      article = "an";
    }
    statement += article + " " + data[0].word + " ";

  }
  ,"json");

  statement += "so that ";
  restclient.get(getNounsURL,
  function(data) {
    noun = data[0].word.substr(0,1);
    article = "a";
    if (noun === 'a' ||
        noun === 'e' ||
        noun === 'i' ||
        noun === 'o' ||
        noun === 'u') {
      article = "an";
    }
    statement += article + " " + data[0].word + " ";

  }
  ,"json");

  restclient.get(
      getVerbURL,
      function(data) {
        statement += data[0].word;
        console.log(statement);
        T.post('statuses/update', { status: statement}, function(err, reply) {
          console.log("error: " + err);
          console.log(err);
          console.log("reply: " + reply);
        });
      }
    ,"json");

}

function favRTs () {
  T.get('statuses/retweets_of_me', {}, function (e,r) {
    for(var i=0;i<r.length;i++) {
      T.post('favorites/create/'+r[i].id_str,{},function(){});
    }
    console.log('harvested some RTs');
  });
}

// Every 2 minutes, make and tweet a user story.
// Wrapped in a try/catch in case Twitter is unresponsive.
// We don't really care about error handling. It just won't tweet.
setInterval(function() {
  try {
    makeUserStory();
  }
 catch (e) {
    console.log(e);
  }
},120000);

// Every 5 hours, check for people who have RTed a user story and favorite that user story.
setInterval(function() {
  try {
    favRTs();
  }
 catch (e) {
    console.log(e);
  }
},60000*60*5);
