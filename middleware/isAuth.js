const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');
    if(authHeader) {
        const token = authHeader.split(' ')[1];
        let decodoedToken;
        try {
            decodoedToken = jwt.verify(token, 'secretkey');
        } catch(err) {
            err.statusCode = 500;
            throw err;
        }
        if(decodoedToken) {
            req.userId = decodoedToken.userId;
            next();
        } else {
            const error = new Error('Not authenticated');
            error.statucCode = 401;
            throw error;
        }
    } else {
        const error = new Error('Not authenticated');
        error.statucCode = 401;
        throw error;
    }

}