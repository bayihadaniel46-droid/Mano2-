const express = require("express");
const path = require("path");
const db = require("./database/db");
const fs = require("fs");
const session = require("express-session");

const app = express();

const PORT = 5000;

// ===========================
// Configuration
// ===========================
app.set("view engine", "ejs");

app.set(
    "views",
    path.join(__dirname, "../frontend/views")
);

app.use(session({

    secret: "Mano2-secret",

    resave: false,

    saveUninitialized: false

}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/css", express.static(path.join(__dirname, "../frontend/css")));
app.use("/js", express.static(path.join(__dirname, "../frontend/js")));
app.use("/images", express.static(path.join(__dirname, "../frontend/images")));

// ===========================
// Pages
// ===========================
app.get("/", (req,res)=>{

    db.get("SELECT COUNT(*) AS totalUsers FROM users",(err,userResult)=>{

        db.get("SELECT COUNT(*) AS totalReviews, ROUND(AVG(note),1) AS averageRating FROM reviews",(err,reviewResult)=>{

            db.get("SELECT COUNT(DISTINCT ville) AS totalCities FROM users",(err,cityResult)=>{

                res.render("index",{

                    user:req.session.user,

                    totalUsers:userResult.totalUsers || 0,

                    totalReviews:reviewResult.totalReviews || 0,

                    averageRating:reviewResult.averageRating || 0,

                    totalCities:cityResult.totalCities || 0

                });

            });

        });

    });

});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

// ======================
// Connexion
// ======================

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    db.get(

        "SELECT * FROM users WHERE email = ?",

        [email],

        (err, user) => {

            if (err) {

                console.log(err);
                return res.send("Erreur serveur");

            }

            if (!user) {

                return res.send("Adresse email inconnue.");

            }

            if (user.password !== password) {

                return res.send("Mot de passe incorrect.");

            }

            req.session.user = {

                id: user.id,

                nom: user.nom,

                email: user.email

            };

            res.redirect("/");

        }

    );

});

// ===========================
// PAGE INSCRIPTION
// ===========================

app.get("/register", (req, res) => {

    res.render("register", {
        user: req.session.user || null
    });

});

app.get("/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/profile.html"));
});

app.get("/search", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/search.html"));
});
app.get("/edit-profile", (req, res) => {

    if (!req.session.user) {

        return res.redirect("/login");

    }

    db.get(

        "SELECT * FROM users WHERE id=?",

        [req.session.user.id],

        (err, user) => {

            if (err || !user) {

                return res.send("Utilisateur introuvable");

            }

            res.render("edit-profile", {

                user

            });

        }

    );

});

// ==================================
// Recherche de professionnels
// ==================================

app.get("/search-results", (req, res) => {

    const metier = req.query.metier || "";
    const ville = req.query.ville || "";

    db.all(

        `
        SELECT *
        FROM users
        WHERE metier LIKE ?
        AND ville LIKE ?
        ORDER BY nom
        `,

        [
            `%${metier}%`,
            `%${ville}%`
        ],

        (err, rows) => {

            if (err) {

                console.log(err);

                return res.send("Erreur de recherche");

            }

            let html = `

            <!DOCTYPE html>

            <html lang="fr">

            <head>

                <meta charset="UTF-8">

                <title>Résultats</title>

                <script src="https://cdn.tailwindcss.com"></script>

            </head>

            <body class="bg-gray-100">

            <div class="max-w-6xl mx-auto py-12">

            <h1 class="text-4xl font-bold mb-8">

            Résultats de la recherche

            </h1>

            <a
            href="/"
            class="bg-blue-600 text-white px-5 py-3 rounded-xl">

            ← Retour à l'accueil

            </a>

            <div class="grid md:grid-cols-3 gap-6 mt-8">

            `;

            if(rows.length === 0){

                html += `

                <div class="bg-white rounded-3xl p-10 shadow">

                Aucun professionnel trouvé.

                </div>

                `;

            }

            rows.forEach(user=>{

                html += `

                <div class="bg-white rounded-3xl shadow p-6">

                    <div class="text-6xl text-center">

                        👤

                    </div>

                    <h2 class="text-2xl font-bold text-center mt-4">

                        ${user.nom}

                    </h2>

                    <p class="text-center text-blue-600 mt-2">

                        ${user.metier}

                    </p>

                    <p class="mt-4">

                        📍 ${user.ville}

                    </p>

                    <p>

                        📞 ${user.telephone || "-"}

                    </p>

                    <a

                    href="/profil/${user.id}"

                    class="block text-center mt-6 bg-blue-600 text-white py-3 rounded-xl">

                    Voir le profil

                    </a>

                </div>

                `;

            });

            html += `

            </div>

            </div>

            </body>

            </html>

            `;

            res.send(html);

        }

    );

});

// ===============================
// Liste des catégories
// ===============================

app.get("/categories", (req, res) => {

    db.all(
        `
        SELECT
            metier,
            COUNT(*) total
        FROM users
        GROUP BY metier
        ORDER BY total DESC
        `,
        [],
        (err, rows) => {

            if(err){
                return res.json([]);
            }

            res.json(rows);

        }
    );

});


// ===============================
// Tous les professionnels
// ===============================

app.get("/professionnels", (req,res)=>{

    db.all(

        "SELECT * FROM users ORDER BY nom",

        [],

        (err,users)=>{

            if(err){

                return res.send("Erreur");

            }

            let html=`

            <!DOCTYPE html>

            <html>

            <head>

            <meta charset="UTF-8">

            <script src="https://cdn.tailwindcss.com"></script>

            <title>Mano2</title>

            </head>

            <body class="bg-gray-100">

            <div class="max-w-7xl mx-auto py-12">

            <h1 class="text-4xl font-bold mb-10">

            Tous les professionnels

            </h1>

            <div class="grid md:grid-cols-3 gap-8">

            `;

            users.forEach(user=>{

                html+=`

                <div class="bg-white rounded-3xl shadow-lg p-8">

                    <div class="text-7xl text-center">

                    👤

                    </div>

                    <h2 class="text-center text-2xl font-bold mt-5">

                    ${user.nom}

                    </h2>

                    <p class="text-center text-blue-600 mt-2">

                    ${user.metier}

                    </p>

                    <p class="mt-5">

                    📍 ${user.ville}

                    </p>

                    <p>

                    📞 ${user.telephone || "-"}

                    </p>

                    <a

                    href="/profil/${user.id}"

                    class="block text-center mt-6 bg-blue-600 text-white py-3 rounded-xl">

                    Voir le profil

                    </a>

                </div>

                `;

            });

            html+=`

            </div>

            </div>

            </body>

            </html>

            `;

            res.send(html);

        }

    );

});


// ===============================
// Profil complet
// ===============================

app.get("/profil/:id",(req,res)=>{

    const id=req.params.id;

    db.get(

        "SELECT * FROM users WHERE id=?",

        [id],

        (err,user)=>{

            if(err || !user){

                return res.send("Utilisateur introuvable");

            }

            db.all(

                "SELECT * FROM reviews WHERE user_id=? ORDER BY id DESC",

                [id],

                (err,reviews)=>{

                    let moyenne=0;

                    if(reviews.length){

                        moyenne=reviews.reduce((a,b)=>a+b.note,0)/reviews.length;

                    }

                    let html=`

                    <!DOCTYPE html>

                    <html>

                    <head>

                    <meta charset="UTF-8">

                    <script src="https://cdn.tailwindcss.com"></script>

                    <title>${user.nom}</title>

                    </head>

                    <body class="bg-gray-100">

                    <div class="max-w-5xl mx-auto py-12">

                    <div class="bg-white rounded-3xl shadow-lg p-10">

                    <div class="text-center">

                    <div class="text-8xl">

                    👤

                    </div>

                    <h1 class="text-5xl font-bold mt-5">

                    ${user.nom}

                    </h1>

                    <p class="text-2xl text-blue-600 mt-3">

                    ${user.metier}

                    </p>

                    <p class="mt-5">

                    📍 ${user.ville}

                    </p>

                    <p>

                    📞 ${user.telephone}

                    </p>
                    
                    <br><br>

                    <a
                    href="/message/${user.id}"
                    class="bg-green-600 text-white px-6 py-3 rounded-xl">

                    💬 Envoyer un message

                    </a>
                    
                    <p>

                    ✉ ${user.email}

                    </p>

                    <div class="mt-6 text-yellow-500 text-2xl">

                    ⭐ ${moyenne.toFixed(1)}

                    (${reviews.length} avis)

                    </div>

                    </div>

                    <hr class="my-10">

                    <h2 class="text-3xl font-bold">

                    Description

                    </h2>

                    <p class="mt-4 text-gray-700">

                    ${user.description}

                    </p>

                    <hr class="my-10">

                    <h2 class="text-3xl font-bold mb-6">

                    Laisser un avis

                    </h2>

                    <form action="/review" method="POST">

                    <input type="hidden" name="user_id" value="${user.id}">

                    <input
                    type="text"
                    name="auteur"
                    required
                    placeholder="Votre nom"
                    class="w-full border rounded-xl p-3 mb-4">

                    <select
                    name="note"
                    class="w-full border rounded-xl p-3 mb-4">

                    <option value="5">⭐⭐⭐⭐⭐</option>
                    <option value="4">⭐⭐⭐⭐</option>
                    <option value="3">⭐⭐⭐</option>
                    <option value="2">⭐⭐</option>
                    <option value="1">⭐</option>

                    </select>

                    <textarea
                    name="commentaire"
                    required
                    rows="5"
                    placeholder="Votre avis..."
                    class="w-full border rounded-xl p-3"></textarea>

                    <button
                    class="mt-6 bg-blue-600 text-white px-8 py-3 rounded-xl">

                    Publier l'avis

                    </button>

                    </form>

                    <hr class="my-10">

                    <h2 class="text-3xl font-bold mb-8">

                    Avis des utilisateurs

                    </h2>

                    `;

                    reviews.forEach(r=>{

                        html+=`

                        <div class="bg-gray-100 rounded-2xl p-6 mb-5">

                        <h3 class="font-bold text-xl">

                        ${r.auteur}

                        </h3>

                        <p class="text-yellow-500">

                        ${"⭐".repeat(r.note)}

                        </p>

                        <p class="mt-3">

                        ${r.commentaire}

                        </p>

                        <p class="text-sm text-gray-500 mt-3">

                        ${r.date}

                        </p>

                        </div>

                        `;

                    });
                    
                    let boutonSupprimer = "";

                    if (
                        req.session.user &&
                        Number(req.session.user.id) === Number(user.id)
                    ) {

                        boutonSupprimer = `
                        <form
                            action="/delete-user/${user.id}"
                            method="POST">

                            <button
                                onclick="return confirm('Voulez-vous vraiment supprimer votre profil ?')"
                                class="bg-red-600 text-white px-8 py-3 rounded-xl">

                                🗑 Supprimer mon profil

                            </button>

                        </form>
                        `;

                    }

                    html+=`

                    <div class="flex gap-4 mt-8">

                    <a
                    href="/professionnels"
                    class="bg-gray-900 text-white px-8 py-3 rounded-xl">

                    ← Retour

                    </a>
                    
                    <a
                    href="/boite/${user.id}"
                    class="bg-green-600 text-white px-6 py-3 rounded-xl">

                    📥 Ma boîte de réception

                    </a>
                    
                    ${boutonSupprimer}


                    </div>

                    </div>

                    </div>

                    </body>

                    </html>

                    `;

                    res.send(html);

                }

            );

        }

    );

});
// ======================
// Inscription
// ======================

app.post("/register", (req,res)=>{

    const {

        nom,
        metier,
        ville,
        telephone,
        description,
        email,
        password

    } = req.body;

    console.log("========== NOUVEAU PROFESSIONNEL ==========");

    console.log(nom);
    console.log(metier);
    console.log(ville);
    console.log(telephone);
    console.log(email);

    db.run(

        `
        INSERT INTO users

        (nom,metier,ville,telephone,description,email,password)

        VALUES(?,?,?,?,?,?,?)

        `,

        [

            nom,
            metier,
            ville,
            telephone,
            description,
            email,
            password

        ],

        function(err){

            if(err){

                console.log(err.message);

                return res.send("Cette adresse email existe déjà.");

            }

            req.session.user = {
                id: this.lastID,
                nom: nom
            };

            console.log(req.session.user);

            res.redirect("/");

        }

    );

});
// ======================
// Ajouter un avis
// ======================

app.post("/review", (req, res) => {

    const {
        user_id,
        auteur,
        note,
        commentaire
    } = req.body;

    const date = new Date().toLocaleDateString("fr-FR");

    db.run(

        `
        INSERT INTO reviews
        (user_id, auteur, note, commentaire, date)
        VALUES (?, ?, ?, ?, ?)
        `,

        [
            user_id,
            auteur,
            note,
            commentaire,
            date
        ],

        function(err){

            if(err){

                console.log(err);

                return res.send("Erreur lors de l'ajout de l'avis");

            }

            console.log("Nouvel avis ajouté.");

            res.redirect("/profil/" + user_id);

        }

    );

});

// ======================
// Supprimer un professionnel
// ======================
app.post("/delete-user/:id", (req, res) => {

    if (!req.session.user) {

        return res.redirect("/login");

    }

    if (req.session.user.id != req.params.id) {

        return res.status(403).send("Accès interdit");

    }

    db.run(
        "DELETE FROM users WHERE id=?",
        [req.params.id],
        (err) => {

            if (err) {

                return res.send("Erreur");

            }

            req.session.destroy(() => {

                res.redirect("/");

            });

        }
    );

});
// =========================
// Recevoir des demandes
// =========================
app.get("/demandes",(req,res)=>{

res.send(`

<!DOCTYPE html>

<html lang="fr">

<head>

<meta charset="UTF-8">

<title>Recevoir des demandes</title>

<script src="https://cdn.tailwindcss.com"></script>

</head>

<body class="bg-gray-100">

<div class="max-w-6xl mx-auto py-12">

<h1 class="text-5xl font-bold text-center mb-4">

📨 Comment recevoir des demandes ?

</h1>

<p class="text-center text-gray-600 text-xl">

Suivez ces étapes pour obtenir vos premiers clients.

</p>

<div class="grid md:grid-cols-2 gap-8 mt-12">

<div class="bg-white rounded-3xl shadow-lg p-8">

<div class="text-5xl mb-5">👤</div>

<h2 class="text-2xl font-bold">

1. Complétez votre profil

</h2>

<p class="mt-4">

Ajoutez votre métier, votre ville, votre numéro de téléphone et une description détaillée.

</p>

</div>

<div class="bg-white rounded-3xl shadow-lg p-8">

<div class="text-5xl mb-5">📸</div>

<h2 class="text-2xl font-bold">

2. Ajoutez une photo

</h2>

<p class="mt-4">

Les profils avec photo inspirent davantage confiance.

</p>

</div>

<div class="bg-white rounded-3xl shadow-lg p-8">

<div class="text-5xl mb-5">⭐</div>

<h2 class="text-2xl font-bold">

3. Obtenez des avis

</h2>

<p class="mt-4">

Chaque avis positif améliore votre visibilité.

</p>

</div>

<div class="bg-white rounded-3xl shadow-lg p-8">

<div class="text-5xl mb-5">📞</div>

<h2 class="text-2xl font-bold">

4. Soyez réactif

</h2>

<p class="mt-4">

Répondez rapidement aux appels et aux messages.

</p>

</div>

</div>

<div class="bg-blue-600 rounded-3xl text-white p-10 mt-12">

<h2 class="text-3xl font-bold">

💡 Conseil Piston

</h2>

<p class="mt-5 text-lg">

Les professionnels ayant une photo, une bonne description et plusieurs avis apparaîtront plus haut dans les recherches.

</p>

</div>

<div class="text-center mt-10">

<a
href="/"
class="bg-gray-900 text-white px-8 py-4 rounded-2xl">

Retour à l'accueil

</a>

</div>

</div>

</body>

</html>

`);

});
// =========================
// Gagner de l'argent
// =========================
app.get("/argent",(req,res)=>{

res.send(`

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>Gagner de l'argent</title>

<script src="https://cdn.tailwindcss.com"></script>

</head>

<body class="bg-gray-100">

<div class="max-w-6xl mx-auto py-12">

<h1 class="text-5xl font-bold text-center">

💰 Gagner de l'argent avec Piston

</h1>

<p class="text-center text-gray-600 text-xl mt-4">

Transformez vos compétences en revenus.

</p>

<div class="grid md:grid-cols-3 gap-8 mt-12">

<div class="bg-white rounded-3xl shadow-lg p-8">

<div class="text-5xl">🎯</div>

<h2 class="text-2xl font-bold mt-5">

Soyez visible

</h2>

<p class="mt-4">

Plus votre profil est complet, plus vous recevez de demandes.

</p>

</div>

<div class="bg-white rounded-3xl shadow-lg p-8">

<div class="text-5xl">🤝</div>

<h2 class="text-2xl font-bold mt-5">

Construisez votre réputation

</h2>

<p class="mt-4">

Accumulez des avis positifs pour gagner la confiance des futurs clients.

</p>

</div>

<div class="bg-white rounded-3xl shadow-lg p-8">

<div class="text-5xl">🚀</div>

<h2 class="text-2xl font-bold mt-5">

Développez votre activité

</h2>

<p class="mt-4">

Utilisez Piston pour trouver de nouveaux clients chaque semaine.

</p>

</div>

</div>

<div class="mt-14 bg-green-600 rounded-3xl text-white p-10">

<h2 class="text-3xl font-bold">

Exemple

</h2>

<ul class="mt-6 space-y-3 text-lg">

<li>✔ Un plombier reçoit 5 demandes par semaine.</li>

<li>✔ Un développeur trouve des missions à distance.</li>

<li>✔ Un professeur donne des cours particuliers.</li>

<li>✔ Un graphiste trouve des clients partout au Cameroun.</li>

</ul>

</div>

<div class="mt-12 bg-yellow-100 rounded-3xl p-8">

<h2 class="text-2xl font-bold">

Notre objectif

</h2>

<p class="mt-4 text-lg">

Piston veut permettre à chacun de vivre de ses compétences, qu'il soit artisan, étudiant, freelance ou entreprise.

</p>

</div>

<div class="text-center mt-10">

<a
href="/"
class="bg-gray-900 text-white px-8 py-4 rounded-2xl">

Retour à l'accueil

</a>

</div>

</div>

</body>

</html>

`);

});
// =====================
// Guide Recherche
// =====================
app.get("/guide-recherche",(req,res)=>{

res.send(`

<html>

<head>

<title>Recherche rapide</title>

<script src="https://cdn.tailwindcss.com"></script>

<link rel="stylesheet"
href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">

</head>

<body class="bg-gray-100">

<div class="max-w-6xl mx-auto py-12">

<div class="bg-white rounded-3xl shadow-xl p-12">

<div class="text-center">

<div class="text-7xl">

🔎

</div>

<h1 class="text-5xl font-bold mt-4">

Recherche rapide

</h1>

<p class="text-gray-500 mt-4 text-xl">

Trouvez un professionnel en moins d'une minute.

</p>

</div>

<div class="grid md:grid-cols-2 gap-8 mt-14">

<div class="bg-blue-50 rounded-3xl p-8">

<h2 class="text-2xl font-bold">

① Choisissez un métier

</h2>

<p class="mt-4">

Exemple :

Développeur,

Électricien,

Maçon,

Avocat,

Médecin...

</p>

</div>

<div class="bg-blue-50 rounded-3xl p-8">

<h2 class="text-2xl font-bold">

② Choisissez une ville

</h2>

<p class="mt-4">

Douala,

Yaoundé,

Bafoussam,

Garoua...

</p>

</div>

<div class="bg-blue-50 rounded-3xl p-8">

<h2 class="text-2xl font-bold">

③ Consultez les profils

</h2>

<p class="mt-4">

Comparez plusieurs professionnels.

</p>

</div>

<div class="bg-blue-50 rounded-3xl p-8">

<h2 class="text-2xl font-bold">

④ Contactez

</h2>

<p class="mt-4">

Appelez directement le professionnel.

</p>

</div>

</div>

<div class="mt-14 bg-yellow-50 p-8 rounded-3xl">

<h2 class="text-3xl font-bold">

💡 Conseils

</h2>

<ul class="list-disc ml-8 mt-6 space-y-3">

<li>Lire la description.</li>

<li>Comparer plusieurs profils.</li>

<li>Consulter les avis.</li>

<li>Choisir le plus adapté.</li>

</ul>

</div>

<div class="text-center mt-12">

<a

href="/"

class="bg-blue-600 text-white px-8 py-4 rounded-2xl">

Retour

</a>

</div>

</div>

</div>

</body>

</html>

`);

});
// =====================
// Guide Fiabilité
// =====================
app.get("/guide-fiabilite",(req,res)=>{

res.send(`

<html>

<head>

<title>Profils fiables</title>

<script src="https://cdn.tailwindcss.com"></script>

</head>

<body class="bg-gray-100">

<div class="max-w-6xl mx-auto py-12">

<div class="bg-white rounded-3xl shadow-xl p-12">

<div class="text-center">

<div class="text-7xl">

🛡️

</div>

<h1 class="text-5xl font-bold mt-5">

Profils fiables

</h1>

</div>

<div class="grid md:grid-cols-2 gap-8 mt-12">

<div class="border rounded-3xl p-8">

<h2 class="text-2xl font-bold">

Informations présentes

</h2>

<ul class="mt-6 space-y-4">

<li>✔ Nom</li>

<li>✔ Métier</li>

<li>✔ Ville</li>

<li>✔ Téléphone</li>

<li>✔ Description</li>

</ul>

</div>

<div class="border rounded-3xl p-8">

<h2 class="text-2xl font-bold">

Pourquoi faire confiance ?

</h2>

<p class="mt-5">

Chaque professionnel remplit lui-même son profil.

Les avis des utilisateurs permettent ensuite de juger la qualité de son travail.

</p>

</div>

</div>

<div class="bg-green-50 rounded-3xl p-8 mt-10">

<h2 class="text-3xl font-bold">

Conseils

</h2>

<ul class="mt-6 space-y-3">

<li>⭐ Lire les avis.</li>

<li>⭐ Comparer plusieurs profils.</li>

<li>⭐ Vérifier la description.</li>

<li>⭐ Contacter avant de payer.</li>

</ul>

</div>

<div class="text-center mt-12">

<a

href="/"

class="bg-blue-600 text-white px-8 py-4 rounded-2xl">

Retour

</a>

</div>

</div>

</div>

</body>

</html>

`);

});
// =====================
// Guide Contact
// =====================
app.get("/guide-contact",(req,res)=>{

res.send(`

<html>

<head>

<title>Contact</title>

<script src="https://cdn.tailwindcss.com"></script>

</head>

<body class="bg-gray-100">

<div class="max-w-6xl mx-auto py-12">

<div class="bg-white rounded-3xl shadow-xl p-12">

<div class="text-center">

<div class="text-7xl">

💬

</div>

<h1 class="text-5xl font-bold mt-5">

Contacter un professionnel

</h1>

</div>

<div class="mt-12">

<div class="flex items-center gap-5 mb-8">

<div class="text-4xl">

1️⃣

</div>

<div>

Choisissez un professionnel.

</div>

</div>

<div class="flex items-center gap-5 mb-8">

<div class="text-4xl">

2️⃣

</div>

<div>

Consultez son profil.

</div>

</div>

<div class="flex items-center gap-5 mb-8">

<div class="text-4xl">

3️⃣

</div>

<div>

Appelez-le ou envoyez un message.

</div>

</div>

<div class="flex items-center gap-5 mb-8">

<div class="text-4xl">

4️⃣

</div>

<div>

Expliquez votre besoin.

</div>

</div>

<div class="flex items-center gap-5">

<div class="text-4xl">

5️⃣

</div>

<div>

Convenez d'un rendez-vous.

</div>

</div>

</div>

<div class="bg-blue-50 rounded-3xl p-8 mt-12">

<h2 class="text-3xl font-bold">

Bonnes pratiques

</h2>

<ul class="mt-6 space-y-3">

<li>✔ Soyez poli.</li>

<li>✔ Décrivez clairement votre besoin.</li>

<li>✔ Demandez un devis.</li>

<li>✔ Confirmez le rendez-vous.</li>

</ul>

</div>

<div class="text-center mt-12">

<a

href="/"

class="bg-blue-600 text-white px-8 py-4 rounded-2xl">

Retour

</a>

</div>

</div>

</div>

</body>

</html>

`);

});
app.get("/communaute-whatsapp", (req, res) => {

    const whatsappLink = "https://chat.whatsapp.com/KyRQx3TAsyk4ymprn3oWod?mode=gi_t";

    res.redirect(whatsappLink);

});
// ==========================
// Boîte de réception
// ==========================
app.post("/message",(req,res)=>{

const{
    expediteur,
    destinataire,
    message
}=req.body;

const date=new Date().toLocaleString("fr-FR");

db.run(

`
INSERT INTO messages
(
expediteur,
expediteur_email,
destinataire_id,
sujet,
message,
date
)
VALUES(?,?,?,?,?,?)
`,

[
expediteur,
"",
destinataire,
"Message",
message,
date
],

function(err){

if(err){
console.log(err);
return res.send(err.message);
}

res.redirect("/boite/"+destinataire);

}

);

});
app.get("/boite/:id",(req,res)=>{

const id=req.params.id;

db.all(

"SELECT * FROM messages WHERE destinataire_id=? ORDER BY id DESC",

[id],

(err,rows)=>{
    
    if (err) {
        console.log(err);
        return res.send(err.message);
    }

    let html = `

<html>

<head>

<title>Boîte de réception</title>

<script src="https://cdn.tailwindcss.com"></script>

</head>

<body class="bg-gray-100">

<div class="max-w-5xl mx-auto py-12">

<h1 class="text-4xl font-bold mb-8">

📥 Boîte de réception

</h1>
`;
if(rows.length===0){

html+=`
<div class="bg-white rounded-3xl p-10 text-center shadow">

<div class="text-7xl">
📭
</div>

<h2 class="text-3xl font-bold mt-6">

Aucun message

</h2>

<p class="mt-4 text-gray-500">

Votre boîte de réception est vide.

</p>

</div>
`;

}
rows.forEach(m=>{

html+=`

<div class="bg-white rounded-3xl shadow p-6 mb-6">

<div class="flex justify-between">

<h2 class="font-bold text-xl">

${m.expediteur}

</h2>

<span>

${m.date}

</span>

</div>

<p class="text-blue-600 mt-2">

${m.expediteur_email}

</p>

<h3 class="mt-5 text-xl font-bold">

${m.sujet}

</h3>

<p class="mt-4">

${m.message}

</p>

<div class="mt-6">

<button

onclick="window.location='/repondre/${m.id}'"

class="bg-blue-600 text-white px-5 py-2 rounded-xl">

Répondre

</button>

</div>

</div>

`;

});

html+=`

</div>

</body>

</html>

`;

res.send(html);

});

});
app.get("/message/:id",(req,res)=>{

const id=req.params.id;

db.get(
"SELECT * FROM users WHERE id=?",
[id],

(err,user)=>{

if(err||!user){

return res.send("Professionnel introuvable");

}

res.send(`

<html>

<head>

<title>Envoyer un message</title>

<script src="https://cdn.tailwindcss.com"></script>

</head>

<body class="bg-gray-100">

<div class="max-w-3xl mx-auto mt-12">

<div class="bg-white rounded-3xl shadow-xl p-10">

<div class="text-center">

<div class="text-7xl">

👤

</div>

<h1 class="text-4xl font-bold mt-5">

${user.nom}

</h1>

<p class="text-blue-600 text-xl">

${user.metier}

</p>

</div>

<form action="/message" method="POST">

<input
type="hidden"
name="destinataire"
value="${user.id}">

<div class="mt-10">

<label>

Votre nom

</label>

<input

type="text"

name="expediteur"

class="w-full border rounded-xl p-3"

required>

</div>

<div class="mt-6">

<label>

Votre message

</label>

<textarea

name="message"

rows="8"

class="w-full border rounded-xl p-3"

required>

</textarea>

</div>

<button

class="mt-8 bg-blue-600 text-white px-8 py-4 rounded-xl w-full">

Envoyer

</button>

</form>

</div>

</div>

</body>

</html>

`);

});

});

app.get("/wallet", (req, res) => {

    res.send(`

    <html>

    <head>

    <title>Mon solde</title>

    <script src="https://cdn.tailwindcss.com"></script>

    </head>

    <body class="bg-gray-100">

    <div class="max-w-5xl mx-auto py-12">

        <div class="bg-white rounded-3xl shadow-xl p-10">

            <h1 class="text-4xl font-bold mb-8">

                💰 Mon Solde

            </h1>

            <div class="bg-green-100 rounded-3xl p-8 text-center">

                <p class="text-gray-600">

                    Solde disponible

                </p>

                <h2 class="text-5xl font-bold text-green-700 mt-3">

                    0 FCFA

                </h2>

            </div>

            <div class="grid md:grid-cols-2 gap-6 mt-10">

                <button
                onclick="alert('Fonction bientôt disponible')"
                class="bg-blue-600 text-white p-5 rounded-2xl">

                    ➕ Déposer de l'argent

                </button>

                <button
                onclick="alert('Fonction bientôt disponible')"
                class="bg-green-600 text-white p-5 rounded-2xl">

                    💸 Retirer de l'argent

                </button>

            </div>

            <div class="mt-10">

                <h2 class="text-2xl font-bold mb-4">

                    Historique

                </h2>

                <div class="bg-gray-100 rounded-2xl p-6 text-center text-gray-500">

                    Aucun mouvement pour le moment.

                </div>

            </div>

            <button
            onclick="window.location='/'"
            class="mt-10 bg-gray-900 text-white px-8 py-4 rounded-2xl">

                Retour

            </button>

        </div>

    </div>

    </body>

    </html>

    `);

});
app.get("/logout",(req,res)=>{

req.session.destroy(()=>{

res.redirect("/");

});

});
app.get("/settings", (req, res) => {

    res.render("settings");

});
app.get("/notifications", (req, res) => {

    res.render("notifications",{

        user:req.session.user

    });

});
app.get("/workspace", (req, res) => {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    db.get(
        "SELECT * FROM users WHERE id = ?",
        [req.session.user.id],
        (err, user) => {

            if (err || !user) {
                return res.redirect("/");
            }

            res.render("workspace", {
                user
            });

        }
    );

});
app.post("/update-profile", (req, res) => {

    if (!req.session.user) {

        return res.redirect("/login");

    }

    const {

        nom,
        metier,
        ville,
        telephone,
        email,
        description

    } = req.body;

    db.run(

        `UPDATE users
        SET
        nom=?,
        metier=?,
        ville=?,
        telephone=?,
        email=?,
        description=?
        WHERE id=?`,

        [

            nom,
            metier,
            ville,
            telephone,
            email,
            description,
            req.session.user.id

        ],

        function(err){

            if(err){

                console.log(err);

                return res.send("Erreur.");

            }

            req.session.user.nom = nom;

            res.redirect("/");

        }

    );

});
app.listen(PORT,()=>{

    console.log("");

    console.log("==============================");

    console.log("Mano2 est lancé.");

    console.log("http://localhost:"+PORT);

    console.log("==============================");

});