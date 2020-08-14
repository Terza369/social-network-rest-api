const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');



exports.signup = (req, res, next) => {
    console.log('PUT /auth/signup');

    const errors = validationResult(req);
    if(errors.isEmpty()) {
        const email = req.body.email;
        const name = req.body.name;
        const password = req.body.password;

        bcrypt.hash(password, 12)
            .then(hashedPassword => {
                const user = new User({
                    email: email,
                    password: hashedPassword,
                    name: name
                });
                return user.save();
            })
            .then(result => {
                res.status(201).json({
                    message: 'User created successfully',
                    userId: result._id
                });
            })
            .catch(err => next(err));
    } else {
        const error = new Error('Validation failed');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
}

exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;
    User.findOne({email: email})
        .then(user => {
            if(user) {
                loadedUser = user;
                return bcrypt.compare(password, user.password);
            } else {
                const error = new Error('A user with this email could not be found');
                error.statusCode = 401;
                throw error;
            }
        })
        .then(isEqual => {
            if(isEqual) {
                const token = jwt.sign({
                    email: loadedUser.email,
                    userId: loadedUser._id.toString()
                    }, 'supertopsecretkey', { expiresIn: '1h' });
                res.status(200).json({
                    token: token,
                    userId: loadedUser._id.toString()
                });
            } else {
                const error = new Error('Invalid password');
                error.statusCode = 401;
                throw error;
            }
        })
        .catch(err => next(err));
}