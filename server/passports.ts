import * as passport from 'passport';
import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth';

const google = (expressServer) => {
  passport.use(new GoogleStrategy(
    {
      clientID: '1063667965503-20nlg5beqq5vokph0htvm6rvq4q2vmfj.apps.googleusercontent.com',
      clientSecret: 'OjJGhznBq81OYUKUaUhnV5Ic',
      callbackURL: `http://localhost:${process.env.PORT}/auth/google/callback`,
    },
    (token, tokenSecret, profile, done) => {
      console.log(profile, token, tokenSecret);
    },
  ));
  
  expressServer.get(
    '/auth/google',
    passport.authenticate('google', { scope: 'https://www.googleapis.com/auth/plus.login' }),
  );
  
  expressServer.get(
    '/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/');
    },
  );
};

const passports = (expressServer) => {
  google(expressServer);
};

export default passports;
