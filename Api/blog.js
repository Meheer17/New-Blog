const Blog =  require('./model.js').Blog;
const Sub =  require('./model.js').Sub;
const Com =  require('./model.js').Com;

const express = require('express');
const router = express.Router()

router.route('/com/add/:id').post(function(req, res){
  let bookid = req.params.id;
  let ucom = req.body.comment
  const text = new Com({comment: ucom})
  if(!ucom){
    res.send("missing required field comment")
    return;
  } 
  Blog.findById(bookid, (err, bdata) => {
    if(!bdata){
      res.send("no book exists")
    } else {
        bdata.comment.push(text);
        bdata.save()
        res.redirect(`/blogs/read/${bdata.slug}`)
    }
  });
})

module.exports = router