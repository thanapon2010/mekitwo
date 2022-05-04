const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const dbConnection = require('./database');
const con = require('./database2');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const app = express();
const { redirect } = require('express/lib/response');
const { request } = require('http');
/*const con = mysql.createPool({
    host: "node31559-endows.app.ruk-com.cloud",
    user: "root",
    password: "MHYvsi76415",
    database: "project"
  });*/


app.use(express.urlencoded({ extended: false }));

// SET OUR VIEWS AND VIEW ENGINE
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//img
app.use(express.static(path.join(__dirname, '/public')))
// APPLY COOKIE SESSION MIDDLEWARE
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge: 3600 * 1000 // 1hr
}));

// DECLARING CUSTOM MIDDLEWARE
const ifNotLoggedin = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.render('index');
    }
    next();
}
const ifLoggedin = (req, res, next) => {
    if (req.session.status == 'admin') {
        return res.redirect('/admin');
    }
    if (req.session.isLoggedIn) {
        return res.redirect('/home');
    }
    next();
}

// END OF CUSTOM MIDDLEWARE
// ROOT PAGE
app.get('/', ifNotLoggedin, (req, res, next) => {
    con.query("SELECT `name` FROM `users` WHERE `id`=?", [req.session.userID], (err, result) => {
        res.render('home', {
            name: result[0].name

        });
    })



});// END OF ROOT PAGE
// ROOT PAGE
app.get('/register', (req, res, next) => {
    res.render('register')
})
app.get('/admin', (req, res) => {
    if (req.session.status == "admin") {

        return res.render('admin', {
            name: req.session.user_name,
        })

    }
})
app.get('/addproduct', (req, res, next) => {

    res.render('addproduct');

})

app.get('/pro', (req, res, next) => {
    //ค้างงงงงงงงงงงงงงงงงงงงงงงงงงงงงง
    con.query("SELECT users.name,users.user_id,product.product,borrow.status,borrow.date FROM borrow INNER JOIN users ON borrow.id_user = users.id INNER JOIN product ON borrow.id_product =product.id WHERE users.id = ?;",[req.session.userID],(err, result) => {
        //console.log(result[0].date);
        res.render('pro', { name: req.session.user_name ,result:result});
        
    })
})
app.get('/Status', (req, res, next) => {
    con.query("SELECT users.name,borrow.id,users.user_id,product.product,borrow.status,borrow.date FROM borrow INNER JOIN users ON borrow.id_user = users.id INNER JOIN product ON borrow.id_product =product.id ;",(err, result) => {
        //console.log(result[0].date);
        res.render('Status', { name: req.session.user_name ,result:result});
        
    })
})

app.get("/showproduct", (req, res) => {

    con.query("SELECT * FROM product", (err, result) => {
        if (err) return res.status(200).send(err);
        else return res.status(200).send(result);
    })

})

app.post('/deleteprofile', [body('user_name', '').trim().not().isEmpty(),], (req, res) => {
    const { user_name } = req.body
    dbConnection.execute("DELETE FROM `users` WHERE `name`=?", [user_name])
    res.redirect('user')

})
app.post('/deletestatus', [body('user_name', '').trim().not().isEmpty(),], (req, res) => {
    const { id } = req.body
    dbConnection.execute("DELETE FROM `borrow` WHERE `id`=?", [id])
    res.redirect('Status')

})
app.post('/borrow', [body('chek', '').trim().not().isEmpty(), body('id', '').trim().not().isEmpty(),body('birthdaytime', '').trim().not().isEmpty(),], (req, res) => {
    const { chek, id ,birthdaytime} = req.body
    if (chek == "sum") {
        con.query('INSERT INTO `borrow`(`id_user`, `id_product`, `date`, `status`) VALUES (?,?,?,?)',[req.session.userID,id, birthdaytime, "รออนุมัติ"],(err, result) => {
            res.redirect('pro')
       
     })
        
    }
})

app.post('/editstatus', [body('id', '').trim().not().isEmpty(),], (req, res) => {
    const { id } = req.body
    console.log(id)
    con.query("UPDATE `borrow` SET `status`=? WHERE id = ?",["อนุมัติ",id],(err, result) => {
        res.redirect('Status')
    })

})

// REGISTER PAGE
app.post('/register', ifLoggedin,
    // post data validation(using express-validator)
    [
        body('user_email', 'Invalid email address!').isEmail().custom((value) => {
            return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
                .then(([rows]) => {
                    if (rows.length > 0) {
                        return Promise.reject('This E-mail already in use!');
                    }
                    return true;
                });
        }),
        body('user_name', 'Username is Empty!').trim().not().isEmpty(),
        body('user_user', 'Student Id is Empty!').trim().not().isEmpty(),
        body('user_pass', 'The password must be of minimum length 6 characters').trim().isLength({ min: 6 }),
    ],// end of post data validation
    (req, res, next) => {

        const validation_result = validationResult(req);
        const { user_name, user_pass, user_user, user_email } = req.body;
        // IF validation_result HAS NO ERROR

        // password encryption (using bcryptjs)
        bcrypt.hash(user_pass, 12).then((hash_pass) => {
            // INSERTING USER INTO DATABASE
            dbConnection.execute("INSERT INTO `users`(`user_id`, `name`, `email`, `password`) VALUES (?,?,?,?)", [user_user, user_name, user_email, hash_pass])
            res.send(`<a href="/">Go to Home</a>`);
        })
            .catch(err => {
                // THROW HASING ERROR'S
                if (err) throw err;
            })

    });// END OF REGISTER PAGE


// LOGIN PAGE
app.post('/', ifLoggedin, [
    body('user_email').custom((value) => {
        return dbConnection.execute('SELECT email FROM users WHERE email=?', [value])
            .then(([rows]) => {
                if (rows.length == 1) {
                    return true;

                }
                return Promise.reject('Invalid Email Address!');

            });
    }),
    body('user_pass', 'Password is empty!').trim().not().isEmpty(),
], (req, res) => {
    const validation_result = validationResult(req);
    const { user_pass, user_email } = req.body;
    //console.log(user_email, user_pass);


    con.query('SELECT * FROM users WHERE email=?', [user_email], (err, rows) => {


        bcrypt.compare(user_pass, rows[0].password).then((result) => {
            if (rows[0].rank == "admin") {
               // console.log('yes')
                req.session.isLoggedIn = true;
                req.session.status = rows[0].rank;
                req.session.userID = rows[0].id;
                req.session.user_name = rows[0].name;
                return res.render('admin', { name: req.session.user_name });
            }
            if (result) {
                //console.log('no')
                req.session.isLoggedIn = true;
                req.session.userID = rows[0].id;
                req.session.user_name = rows[0].name;
                return res.redirect('/');

            }
            //console.log(rows);
        })
            .catch(err => {
                if (err) throw err;

            })
    }
    )




})

// END OF LOGIN PAGE

app.get('/product', (req, res) => {
    if (req.session.status == "admin") {
        //console.log('yes')
        con.query("SELECT * FROM product", (err, rows) => {
            //console.log(rows);
            res.render('product', {
                name: req.session.user_name,
                result: rows
            });
        })

    }
    //console.log('no')
})
app.get('/Status', (req, res) => {
    if (req.session.status == "admin") {
        console.log('yes')
        con.query("SELECT * FROM Status", (err, rows) => {
        console.log(rows);
            res.render('Status', {
                name: req.session.user_name,
                result: rows
            });
        })

    }
    console.log('no')
})
app.get('/user', (req, res) => {
    if (req.session.status == "admin") {
        //console.log('yes')

        con.query("SELECT * FROM users", (err, rows) => {

            //console.log(rows);
            res.render('user', {
                name: req.session.user_name,
                result: rows
            });
        })

    }
    //console.log('no')
})

//get pro
app.post('/addproducts', [
    body('product_name', '').trim().not().isEmpty(),
    body('product_stock', '').trim().not().isEmpty(),
    body('product_image', '').trim().not().isEmpty(),
], (req, res) => {

    const { product_name, product_stock, product_id, product_image } = req.body
    async function call() {
        dbConnection.execute("INSERT INTO `product`(`product`, `stock`, `img`) VALUES (?,?,?)", [product_name, product_stock, product_image])
    }
    call()
    res.redirect('product')

})


// LOGOUT
app.get('/logout', (req, res) => {
    //session destroy
    req.session = null;
    res.redirect('/');
});
app.get('/index', (req, res) => {
    //session destroy
    req.session = null;
    res.redirect('/');
});
// END OF LOGOUT

app.use('/', (req, res) => {
    res.status(404).send('<h1>404 Page Not Found!</h1>');
});

app.get("/showuser", (req, res) => {
    con.query("SELECT * FROM users", (err, result) => {
        if (err) return res.status(200).send(err);
        else return res.status(200).send(result);
    })

})


app.listen(3000, () => console.log("Server is Running..."));