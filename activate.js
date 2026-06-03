const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');
db.run("UPDATE workflow_entity SET active=true WHERE id='4HcFkqU1PrNCpFLR'", (err) => {
    if (err) console.error(err);
    else console.log('Successfully activated workflow');
});
