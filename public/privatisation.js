// Au chargement de la page, vérification de la provenance (Bouton ou Redirection automatique)
const urlParams = new URLSearchParams(window.location.search);
const type = urlParams.get('type');
const subjectSelect = document.getElementById('client-subject');

if (type === 'privatisation') {
    subjectSelect.value = "Repas groupe 20pers + (possibilité de privatisation)";
} else {
    subjectSelect.value = "Question générale";
}

// Gestion de l'envoi du formulaire de contact mixte
document.getElementById('privatisation-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const messageDiv = document.getElementById('form-message');
    messageDiv.style.color = "blue";
    messageDiv.innerText = "Envoi de votre message...";

    const clientEmail = document.getElementById('client-email').value;
    const clientSubject = subjectSelect.value;
    const clientMessage = document.getElementById('client-message').value;

    try {
        const response = await fetch('/api/privatisation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: clientEmail, subject: clientSubject, message: clientMessage })
        });

        const result = await response.json();

        if (result.success) {
            messageDiv.style.color = "green";
            messageDiv.innerText = result.message;
            document.getElementById('privatisation-form').reset();
            subjectSelect.value = clientSubject;
        } else {
            messageDiv.style.color = "red";
            messageDiv.innerText = result.message;
        }
    } catch (error) {
        console.error("Erreur de connexion :", error);
        messageDiv.style.color = "red";
        messageDiv.innerText = "Impossible de joindre le serveur.";
    }
});
