const mysql = require('mysql2');
const con = mysql.createConnection({
    host: 'node31902-mekiman.app.ruk-com.cloud',
    user: 'root',
    password:"XSIlxb27671",
    database:"newpro",
    port:'11341'
})
con.connect(function(err) {
    if (err) throw err;
      console.log("connect success");
});
module.exports = con;