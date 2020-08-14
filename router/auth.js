const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.put('/signup', [
    body('email')
        .normalizeEmail()
        .isEmail()
        .withMessage('Please enter a valid email')
        .custom((value, {req}) => {
            return User.findOne({email: value}).then(user => {
                if(user) {
                    return Promise.reject('Email address already exists');
                }
            })
        })
        .normalizeEmail(),
    body('password')
        .trim()
        .isLength({min: 5}),
    body('name')
        .trim()
        .not()
        .isEmpty()
], authController.signup);

router.post('/login', [
    body('email')
        .normalizeEmail()
], authController.login);


module.exports = router;