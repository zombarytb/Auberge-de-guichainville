const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Gestion de la base de données JSON locale
const USERS_FILE = path.join(__dirname, '../users.json');

function readUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
        return [];
    }
    const data = fs.readFileSync(USERS_FILE);
    return JSON.parse(data);
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Configuration des sessions
app.use(session({
    secret: 'aubergeSecretKey123',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ==========================================
// GESTION DES COMPTES (INSCRIPTION / CONNEXION)
// ==========================================

app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/api/register', async (req, res) => {
    const { name, email, phone, password } = req.body;
    const users = readUsers();

    const userExists = users.find(u => u.email === email);
    if (userExists) {
        return res.status(400).json({ success: false, message: 'Cet e-mail est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = { name, email, phone, password: hashedPassword };
    users.push(newUser);
    saveUsers(users);

    return res.status(200).json({ success: true, message: 'Compte créé avec succès. Redirection...' });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const users = readUsers();

    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(400).json({ success: false, message: 'E-mail ou mot de passe incorrect.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ success: false, message: 'E-mail ou mot de passe incorrect.' });
    }

    req.session.user = { name: user.name, email: user.email, phone: user.phone };
    return res.status(200).json({ success: true, message: 'Connexion réussie.' });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Erreur lors de la déconnexion');
        }
        res.redirect('/');
    });
});

// ==========================================
// ROUTES DE RÉSERVATION ET MESSAGERIE
// ==========================================

app.post('/api/reservation', (req, res) => {
    const { name, email, phone, guests, date, time } = req.body;

    const encodedName = encodeURIComponent(name);
    const encodedDate = encodeURIComponent(date);
    const encodedTime = encodeURIComponent(time);

    const urlAccepter = `http://localhost:${PORT}/api/action?decision=accepter&email=${email}&name=${encodedName}&date=${encodedDate}&time=${encodedTime}`;
    const urlRefuser = `http://localhost:${PORT}/api/action?decision=refuser&email=${email}&name=${encodedName}`;
    const urlHorairePage = `http://localhost:${PORT}/api/action?decision=horaire-page&email=${email}&name=${encodedName}&date=${encodedDate}&time=${encodedTime}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_RECEIVER,
        subject: `🔔 [À VALIDER] Demande de table - ${name}`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; border-bottom: 2px solid #f1f1f1; padding-bottom: 10px;">Nouvelle demande de réservation</h2>
                <p><strong>Nom du client :</strong> ${name}</p>
                <p><strong>E-mail :</strong> ${email}</p>
                <p><strong>Téléphone :</strong> ${phone}</p>
                <p><strong>Couverts :</strong> ${guests} personnes</p>
                <p><strong>Date demandée :</strong> ${date}</p>
                <p><strong>Heure demandée :</strong> ${time}</p>
                
                <p style="margin-top: 30px; font-weight: bold; color: #555;">Quelle décision souhaitez-vous prendre ?</p>
                <div style="margin-top: 15px;">
                    <a href="${urlAccepter}" style="background-color: #28a745; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-right: 10px;">🟢 Accepter</a>
                    <a href="${urlHorairePage}" style="background-color: #ffc107; color: black; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-right: 10px;">🟡 Demander un autre horaire</a>
                    <a href="${urlRefuser}" style="background-color: #dc3545; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">🔴 Refuser</a>
                </div>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Erreur d'envoi au restaurateur :", error);
            return res.status(500).json({ success: false, message: "Une erreur interne est survenue." });
        }
        return res.status(200).json({ success: true });
    });
});

app.get('/api/action', (req, res) => {
    const { decision, email, name, date, time } = req.query;

    if (decision === 'horaire-page') {
        return res.send(`
            <div style="font-family: Arial, sans-serif; max-width: 450px; margin: 60px auto; padding: 30px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                <h2 style="color: #333; margin-bottom: 20px;">🕒 Proposer un autre horaire</h2>
                <p>Client : <strong>${name}</strong></p>
                <p>Date prévue : <strong>${date}</strong></p>
                <p>Horaire initial demandé : <span style="text-decoration: line-through; color: red;">${time}</span></p>
                
                <form action="/api/action-horaire-confirme" method="POST" style="margin-top: 25px;">
                    <input type="hidden" name="email" value="${email}">
                    <input type="hidden" name="name" value="${name}">
                    <input type="hidden" name="date" value="${date}">
                    
                    <label for="nouvel_horaire" style="display:block; margin-bottom:10px; font-weight:bold; color: #555;">Sélectionnez le nouvel horaire à proposer :</label>
                    <select id="nouvel_horaire" name="nouvelHoraire" style="width:100%; padding:12px; margin-bottom:25px; border-radius:4px; border:1px solid #ccc; font-size:1rem; background-color: #fff;">
                        <option value="12h00">12h00</option>
                        <option value="12h30">12h30</option>
                        <option value="13h00">13h00</option>
                        <option value="13h30">13h30</option>
                        <option value="19h00">19h00</option>
                        <option value="19h30">19h30</option>
                        <option value="20h00">20h00</option>
                        <option value="20h30">20h30</option>
                        <option value="21h00">21h00</option>
                        <option value="21h30">21h30</option>
                    </select>
                    
                    <button type="submit" style="background-color: #ffc107; color: black; border: none; padding: 12px 20px; font-weight: bold; border-radius: 4px; cursor: pointer; width: 100%; font-size: 1rem;">Envoyer la proposition au client</button>
                </form>
            </div>
        `);
    }

    let clientSubject = "";
    let clientText = "";
    let confirmationMessageVisuel = "";

    if (decision === 'accepter') {
        clientSubject = `✅ Votre réservation est validée ! - L'Auberge de Guichainville`;
        clientText = `Bonjour ${name},\n\nNous avons le plaisir de vous informer que votre demande de réservation pour le ${date} à ${time} a été acceptée et confirmée.\n\nNous vous attendons avec impatience !\n\nCordialement,\nL'Auberge de Guichainville\nTéléphone : 02 32 xx xx xx`;
        confirmationMessageVisuel = `<h1 style="color: #28a745;">🟢 Réservation acceptée !</h1><p>Le client (<strong>${name}</strong>) vient de recevoir son e-mail de confirmation.</p>`;
    } 
    else if (decision === 'refuser') {
        clientSubject = `❌ Votre demande de réservation - L'Auberge de Guichainville`;
        clientText = `Bonjour ${name},\n\nNous sommes au regret de vous informer que nous ne pourrons pas valider votre demande de réservation pour cette date.\n\nEn espérant vous revoir une prochaine fois.\n\nCordialement,\nL'Auberge de Guichainville\nTéléphone : 02 32 xx xx xx`;
        confirmationMessageVisuel = `<h1 style="color: #dc3545;">🔴 Réservation refusée</h1><p>Un e-mail de refus courtois a été envoyé à <strong>${name}</strong>.</p>`;
    }

    const mailOptionsClient = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: clientSubject,
        text: clientText
    };

    transporter.sendMail(mailOptionsClient, (error, info) => {
        if (error) {
            console.error("Erreur réponse client :", error);
            return res.status(500).send("<h1>Erreur</h1><p>The server failed to notify the client.</p>");
        }
        return res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                ${confirmationMessageVisuel}
                <br>
                <a href="/" style="text-decoration:none; color:#007bff; font-weight:bold;">← Retourner sur le site</a>
            </div>
        `);
    });
});

app.post('/api/action-horaire-confirme', (req, res) => {
    const { email, name, date, nouvelHoraire } = req.body;

    const mailOptionsClient = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `⚠️ Concernant votre demande de réservation - L'Auberge de Guichainville`,
        text: `Bonjour ${name},\n\nVotre demande de réservation pour le ${date} ne peut malheureusement pas être acceptée pour l'horaire initial.\n\nNous vous proposons à la place l'horaire suivant : ${nouvelHoraire}.\n\nMerci de répondre directement à ce mail ou de nous appeler pour nous confirmer si ce créneau vous convient.\n\nCordialement,\nL'Auberge de Guichainville\nTéléphone : 02 32 xx xx xx`
    };

    transporter.sendMail(mailOptionsClient, (error, info) => {
        if (error) {
            console.error("Erreur lors de l'envoi de la proposition d'horaire :", error);
            return res.status(500).send("<h1>Erreur</h1><p>Le serveur n'a pas pu envoyer la proposition d'horaire au client.</p>");
        }
        return res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                <h1 style="color: #ffc107;">🟡 Proposition envoyée !</h1>
                <p>Un e-mail a été envoyé à <strong>${name}</strong> pour lui proposer le créneau de <strong>${nouvelHoraire}</strong>.</p>
                <br>
                <a href="/" style="text-decoration:none; color:#007bff; font-weight:bold;">← Retourner sur le site</a>
            </div>
        `);
    });
});

app.post('/api/privatisation', (req, res) => {
    const { email, subject, message } = req.body;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_RECEIVER,
        replyTo: email,
        subject: `✉️ [Site Web] ${subject}`,
        text: `Nouveau message reçu depuis le formulaire de contact du site :\n\n` +
              `📧 Adresse e-mail du client : ${email}\n` +
              `📌 Objet : ${subject}\n\n` +
              `💬 Message du client :\n` +
              `----------------------------------------\n` +
              `${message}\n` +
              `----------------------------------------`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Erreur lors de l'envoi du message :", error);
            return res.status(500).json({ success: false, message: "Erreur serveur." });
        }
        return res.status(200).json({ success: true, message: "Votre message a bien été transmis au restaurant !" });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Le site du resto tourne en local sur : http://localhost:${PORT}`);
    console.log(`📧 Connecté avec le compte d'envoi : ${process.env.EMAIL_USER}`);
});
