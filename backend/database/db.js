const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "piston.db");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log("Base de données connectée");
    }
});

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            nom TEXT NOT NULL,
            metier TEXT NOT NULL,
            ville TEXT NOT NULL,

            email TEXT UNIQUE,
            password TEXT,

            telephone TEXT,
            whatsapp TEXT,

            description TEXT,
            photo TEXT,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP

        )
    `);
    db.run(`
            CREATE TABLE IF NOT EXISTS reviews (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            auteur TEXT NOT NULL,

            note INTEGER NOT NULL,

            commentaire TEXT NOT NULL,

            date TEXT,

            FOREIGN KEY(user_id) REFERENCES users(id)

        )
    `);
    db.run(`
            CREATE TABLE IF NOT EXISTS messages(

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            expediteur TEXT NOT NULL,

            destinataire INTEGER NOT NULL,

            message TEXT NOT NULL,

            date TEXT,

            lu INTEGER DEFAULT 0

        )
    `);
    db.run(`
            CREATE TABLE IF NOT EXISTS messages(

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            expediteur TEXT,

            expediteur_email TEXT,

            destinataire_id INTEGER,

            sujet TEXT,

            message TEXT,

            date TEXT,

            lu INTEGER DEFAULT 0

        )
    `);
    db.run(`
            CREATE TABLE IF NOT EXISTS messages(

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            expediteur TEXT,

            destinataire INTEGER,

            objet TEXT,

            message TEXT,

            date TEXT,

            lu INTEGER DEFAULT 0

        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS notifications (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            type TEXT NOT NULL,

            titre TEXT NOT NULL,

            message TEXT NOT NULL,

            lu INTEGER DEFAULT 0,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(user_id) REFERENCES users(id)

        )
    `);

});

module.exports = db;