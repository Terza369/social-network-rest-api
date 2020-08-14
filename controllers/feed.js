const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');
const user = require('../models/user');

exports.getPosts = (req, res, next) => {
    console.log('GET /feed/posts');

    const currentPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;

    Post.find().countDocuments()
        .then(count => {
            totalItems = count;
            return Post.find().populate('creator').sort({ createdAt: -1 }).skip((currentPage - 1) * perPage).limit(perPage);
        })
        .then(posts => {
            res.status(200).json({
                message: 'Posts fetched successfully',
                posts: posts,
                totalItems: totalItems
            })
        })
        .catch(err => next(err));
}

exports.createPost = (req, res, next) => {
    console.log('POST /feed/post');

    const errors = validationResult(req);
    console.log(errors);

    if(errors.isEmpty()) {
        if(req.file) {
            const title = req.body.title;
            const imageUrl = req.file.filename;
            const content =  req.body.content;
            let creator;
            const post = new Post({
                title: title,
                imageUrl: imageUrl,
                content: content,
                creator: req.userId
            });
            post.save()
                .then(result => {
                    return User.findById(req.userId);
                })
                .then(user => {
                    creator = user;
                    user.posts.push(post);
                    return user.save();
                })
                .then(user => {
                    io.getIO().emit('posts', { action: 'create', post: { ...post._doc, creator: { _id: req.userId, name: user.name } }});
                    res.status(201).json({
                        message: 'Post created successfully',
                        post: post,
                        creator: { _id: creator._id, name: creator.name }
                    });
                })
                .catch(err => {
                    if(!err.statusCode) {
                        err.statusCode = 500;
                    }
                    next(err);
                });
        } else {
            const error = new Error('No image provided');
            error.statusCode = 422;
            throw error;
        }
    } else {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        throw error;
    }    
}

exports.getPost = (req, res, next) => {
    const postId = req.params.postId;

    console.log('GET /feed/post/' + postId);

    Post.findById(postId)
        .populate('creator')
        .then(post => {
            if(post) {
                res.status(200).json({
                    message: 'Post fetched',
                    post: post
                })
            } else {
                 const error = new Error('Post not found');
                 error.statusCode = 404;
                 throw error;
            }
        })
        .catch(err => next(err));
}

exports.updatePost = (req, res, next) => {
    const errors = validationResult(req);
    if(errors.isEmpty()) {
        const postId = req.params.postId;
        const title = req.body.title;
        const content = req.body.content;
        let imageUrl = req.body.image;
        if(req.file) {
            imageUrl = req.file.filename;
        }
        if(!imageUrl) {
            const error = new Error('No file picked');
            error.statusCode = 422;
            throw error;
        }
        Post.findById(postId)
            .populate('creator')
            .then(post => {
                if(post) {
                    if(post.creator._id.toString() === req.userId) {
                        if(imageUrl !== post.imageUrl) {
                            clearImage(post.imageUrl);
                        }
                        post.title = title;
                        post.imageUrl = imageUrl;
                        post.content = content;
                        return post.save();
                    } else {
                        const error = new Error('Not authorized');
                        error.statusCode = 403;
                        throw error;
                    }
                } else {
                    const error = new Error('Post not found');
                    error.statusCode = 404;
                    throw error;
                }
            })
            .then(post => {
                io.getIO().emit('posts', { action: 'update', post: post });
                res.status(200).json({
                    message: 'Post updated',
                    post: post
                })
            })
            .catch(err => next(err));
    } else {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        throw error;
    }
}

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if(post) {
                if(post.creator.toString() === req.userId) {
                    clearImage(post.imageUrl);
                    return Post.findByIdAndRemove(postId);
                } else {
                    const error = new Error('Not authorized');
                    error.statusCode = 403;
                    throw error;
                }
            } else {
                const error = new Error('Post not found');
                error.statusCode = 404;
                throw error;
            }
        })
        .then(result => {
            return User.findById(req.userId);
        })
        .then(user => {
            user.posts.pull(postId);
            return user.save();
        })
        .then(result => {
            io.getIO().emit('posts', { action: 'delete', post: postId});
            res.status(200).json({
                message: 'Post deleted'
            });
        })
        .catch(err => next(err));
}

const clearImage = filePath => {
    filePath = path.join(__dirname, '../images', filePath);
    fs.unlink(filePath, err => console.log(err));
}