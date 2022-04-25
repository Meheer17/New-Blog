'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;
const app = express();
const path = require('path')
const cookieParser = require('cookie-parser');
const Blog =  require('./model.js').Blog;
const Sub =  require('./model.js').Sub;
const Com =  require('./model.js').Com;

module.exports = function(app) {
    
    app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: true,
      saveUninitialized: true,
    //   store: store,
      cookie: { secure: false },
      key: 'express.sid'
    }));
    
    app.use(passport.initialize());
    app.use(passport.session());
    
    
    myDB(async (client) => {
      const adn = await client.db('new').collection('LS');
    
      app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
        res.redirect('/blogs');
      });
    
    
      app.route('/logout').get((req, res) => {
        req.logout();
        res.redirect('/');
      });
    
      app.route('/register').post(
        (req, res, next) => {
          const hash = bcrypt.hashSync(req.body.password, 12);
          adn.findOne({ username: req.body.username }, function (err, user) {
            if (err) {
              next(err);
            } else if (user) {
              res.redirect('/');
            } else {
              adn.insertOne({ username: req.body.username, password: hash, isAdmin: false}, (err, doc) => {
                if (err) {
                  res.redirect('/');
                } else {
                  next();
                }
              });
            }
          });
        },
        passport.authenticate('local', { failureRedirect: '/' }),
        (req, res, next) => {
          res.redirect('/blogs');
        }
      );
      
      passport.serializeUser((user, done) => {
          done(null, user._id);
      });
    
      passport.deserializeUser((id, done) => {
          adn.findOne({ _id: new ObjectID(id) }, (err, doc) => {
              done(null, doc);
          });
      });   
    
      passport.use(new LocalStrategy(
          (username, password, done) => {
              adn.findOne({username: username}, (err, user) => {
                  console.log("User " + username + " attempted to login");
                  if (err) {return done(err); }
                  if (!user) {return done(null, false);}
                  if (!bcrypt.compareSync(password, user.password)) {return done(null, false);}
                  return done(null, user)
              });
          }
      ));
    
      // authentication routes. Compulsory batch
    
      app.post('/blogs/', ensureAuthenticated, async (req, res, next) => {
        req.blog = new Blog() 
        let check = req.body.subject
        if (await Sub.findOne({subject: check}).count() > 0) {
          console.log("num1")
          let blog = req.blog
          blog.title = req.body.title
          blog.description =  req.body.description
          blog.markdown =  req.body.markdown
          blog.sub = req.body.subject
          blog.author = req.user._id
          blog.date = new Date().toLocaleDateString()
          try {
            blog = await blog.save()
            res.redirect(`/blogs/read/${blog.slug}`)
          } catch (e) {
              console.log(e)
              res.render('new', {blog: blog , error: "Make sure to fill all the fields"})
          }
      
        }  else {
      
          const newSub = new Sub({subject: req.body.subject})
          newSub.save(async(err, data) => {
            console.log("num2")  
            let blog = req.blog
            blog.title = req.body.title
            blog.description =  req.body.description
            blog.markdown =  req.body.markdown
            blog.sub = req.body.subject
            blog.author = req.user._id
            blog.date = new Date().toLocaleDateString()
            try {
              blog = await blog.save()
              res.redirect(`/blogs/read/${blog.slug}`)
            } catch (e) {
                console.log(e)
                res.render('new', {blog: blog , error: "Make sure to fill all the fields"})
            }
      
          })
      
        }
      })
    
      app.put('/blogs/:id', ensureAuthenticated, async(req, res , next) => {
        req.blog = await Blog.findOne({slug: req.params.id})
        next()
      }, saveAndRedirect('edit'))
      
      app.delete('/blogs/delete/:id', ensureAuthenticated, async (req,res) => {
        await Blog.findByIdAndDelete(req.params.id)
        res.redirect('/blogs')
      })
      
      app.delete('/blogs/delete/com/:bid/:cid', ensureAuthenticated, async (req,res) => {
        await Blog.updateOne({"_id": req.params.bid}, {$pull: {"comment": {"_id": req.params.cid}}})
        res.redirect(`/blogs`)
      })
    
      app.get('/blogs/new/post', ifAuthenticate, ensureAuthenticated, (req, res) => {
        res.render('new',{blog : new Blog({title: "", description: "", markdown: "", subject: ""})})
      })
      
      app.get('/blogs/edit/:slug', ifAuthenticate, ensureAuthenticated, async (req, res) => {
        const val = await Blog.findOne({slug: req.params.slug})
        if (val == null) res.redirect('/blogs')
        res.render('edit', {blog: val})
      })

      // Non Compulsory authentication


      app.get('/', ifAuthenticate, (req, res) => {
        res.render('index')
      })
      
      app.get('/login', ifAuthenticate, (req, res) => {
        res.render('login')
      })
      
      app.get('/sign-up', ifAuthenticate, (req, res) => {
        res.render('sign')
      })

      app.get('/blogs/', ifAuthenticate, async (req, res) => {
        const data = await Sub.find()
        res.render('subject', {det: data})
      })
      
      app.get('/blogs/subject/:sub', ifAuthenticate, async (req, res) => {
        const data = await Blog.find({sub: req.params.sub})
        res.render('blogs',{det: data})
      })
      
      app.get('/blogs/read/:slug',  async (req, res) => {
        if (req.isAuthenticated()) {
          const data = await Blog.findOne({slug: req.params.slug}) 
          if(data == null) res.redirect('/blogs')
          if(req.user.isAdmin) {
            res.render('show', {blog: data, user: true, suser: true})
          } else if(req.user._id == data.author) {
            res.render('show', {blog: data, user : true, suser: true})
          } else {
            res.render('show', {blog: data, user: true})
          }
        } else {
          const data = await Blog.findOne({slug: req.params.slug}) 
          if(data == null) res.redirect('/blogs')
          res.render('show', {blog: data})
        }
        
      })
    
      // all authentication routes above this.

    
    }).catch((e) => {
      app.route('/').get((req, res) => {
        res.render('index');
      });
    });
    
    function ensureAuthenticated(req, res, next) {
      if (req.isAuthenticated()) {
        return next();
      }
      res.redirect('/');
    }
    
    function saveAndRedirect() {
      return async (req, res) => {
          let blog = req.blog
          blog.title = req.body.title
          blog.description =  req.body.description
          blog.markdown =  req.body.markdown
          blog.date = new Date().toLocaleDateString()
          try {
              blog = await blog.save()
              res.redirect(`/blogs/read/${blog.slug}`)
          } catch (e) {
              console.log(e)
              res.render('new', {blog: blog , error: "Make sure to fill all the fields"})
          }
      }
    }

    function ifAuthenticate(req, res, next) {
      if(req.isAuthenticated()){
        res.locals.user = true
        next()
      } else {
        return next()
      } 
    }
  
  
}