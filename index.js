var express = require('express');
var passport = require('passport');
var Strategy = require('passport-twitter').Strategy;

const {
  postTweet
} = require('./oauth-utilities')

var trustProxy = false;
if (process.env.DYNO) {
  trustProxy = true;
}

var accessToken, accessTokenSecret;

main()
  .catch(err => console.err(err.message, err))

async function main() {
  passport.use(new Strategy({
    consumerKey: process.env['TWITTER_CONSUMER_API_KEY'],
    consumerSecret: process.env['TWITTER_CONSUMER_API_SECRET_KEY'],
    callbackURL: '/twitter/callback',
    proxy: trustProxy
  },
  function(token, tokenSecret, profile, cb) {
    accessToken = token
    accessTokenSecret = tokenSecret
    return cb(null, profile);
  }));

  passport.serializeUser(function(user, cb) {
    cb(null, user);
  });

  passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
  });

  var app = express();

  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');

  app.use(require('morgan')('combined'));
  app.use(require('body-parser').urlencoded({ extended: true }));
  app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/',
    function(req, res) {
      res.render('home', { user: req.user });
    });

  app.get('/login',
    function(req, res){
      res.redirect('/login/twitter')
    });

  app.get('/twitter/search', 
    require('connect-ensure-login').ensureLoggedIn(),
    async function(req, res, next){
      const data = await postTweet({accessToken, accessTokenSecret})
      
      res.render('tweets', { tweets: data });
    });

  app.get('/login/twitter',
    passport.authenticate('twitter'));

  app.get('/twitter/callback',
    passport.authenticate('twitter', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/');
    });

  app.get('/profile',
    require('connect-ensure-login').ensureLoggedIn(),
    function(req, res){
      res.render('profile', { user: req.user });
    });

  app.get('/logout',
    function(req, res){
      req.session.destroy(function (err) {
        res.redirect('/');
      });
    });

  app.listen(3000, () => console.log('listening on http://127.0.0.1:3000'))
}
