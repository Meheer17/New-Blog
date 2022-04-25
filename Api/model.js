const mongoose = require('mongoose'); 
const {Schema} = mongoose;
const {marked} = require('marked');
const slugify = require('slugify');
const createDomPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const dompurify = createDomPurify(new JSDOM().window);

const BlogCom = new Schema({
  comment: String, 
  date: {type: Date, default: Date.now()}
})

const Sub = new Schema({
  subject: String
})

const BlogSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  sub: String, 
  author: String ,
  description: {
    type: String
  },
  markdown: {
    type: String,
    required: true
  },
  date: {
    type: Date, default: Date.now()
  },
  comment: [BlogCom],
  slug: {
    type: String,
    required: true,
    unique: true
  },
  safeHtml: {
    type: String,
    required: true
  }
})

BlogSchema.pre('validate', function(next) {
  if (this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true })
  }

  if (this.markdown) {
    this.safeHtml = dompurify.sanitize(marked(this.markdown))
  }

  next()
})

const blog = mongoose.model("blog", BlogSchema)
const sub = mongoose.model("sub", Sub)
const com = mongoose.model('com', BlogCom)

exports.Blog = blog
exports.Com = com
exports.Sub = sub