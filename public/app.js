// Vérification automatique du statut de connexion au chargement de la page
async function checkUserStatus() {
    const navContainer = document.getElementById('user-nav');
    if (!navContainer) return; 

    try {
        const response = await fetch('/api/check-auth');
        const data = await response.json();

        if (data.loggedIn) {
            // Mise à jour de l'en-tête avec le nom et la déconnexion
            navContainer.innerHTML = `
                <span style="color: #fff; margin-right: 15px; font-size: 1rem;">
                    Bonjour, <strong>${data.user.name.split(' ')[0]}</strong>
                </span>
                <a href="/api/logout" style="color: #c68a4c; text-decoration: none; font-size: 0.95rem; border: 1px solid #c68a4c; padding: 6px 12px; border-radius: 6px; font-weight: bold;">Déconnexion</a>
            `;
            
            // S'assurer que le champ name existe sur la page avant de le remplir
            const nameField = document.getElementById('name');
            if (nameField) {
                nameField.value = data.user.name;
                document.getElementById('email').value = data.user.email;
                document.getElementById('phone').value = data.user.phone;
                
                // Lecture seule
                nameField.readOnly = true;
                document.getElementById('email').readOnly = true;
                document.getElementById('phone').readOnly = true;
            }
        }
    } catch (error) {
        console.error("Erreur lors de la vérification d'authentification:", error);
    }
}

// Exécution de la vérification de l'utilisateur au chargement
document.addEventListener("DOMContentLoaded", checkUserStatus);

// Gestion de la réservation
const reservationForm = document.getElementById('reservation-form');
if (reservationForm) {
    reservationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const guests = parseInt(document.getElementById('guests').value);
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;

        const messageDiv = document.getElementById('form-message');

        // CONDITION : Si le nombre de couverts > 20, redirection vers la page de contact/privatisation avec compte à rebours
        if (guests > 20) {
            let countdown = 5;
            messageDiv.style.color = "#c68a4c";
            
            // Compte à rebours dynamique
            const timer = setInterval(() => {
                messageDiv.innerHTML = `
                    <div style="font-size: 1.25rem; font-weight: bold; margin-bottom: 10px; color: #b83232;">
                        ⚠️ Le nombre de couverts est supérieur à 20.
                    </div>
                    Pour les groupes de plus de 20 personnes, un repas de groupe est envisageable (avec possibilité de privatisation).<br>
                    Redirection vers le formulaire de contact dans <strong>${countdown}</strong> secondes...
                `;
                countdown--;
                if (countdown < 0) {
                    clearInterval(timer);
                    window.location.href = `privatisation.html?type=privatisation`;
                }
            }, 1000);

            return;
        }

        // Sinon, traitement classique de la réservation
        const submitBtn = reservationForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = "Envoi en cours...";
        }

        messageDiv.style.color = "blue";
        messageDiv.innerText = "Envoi de votre demande de réservation...";

        try {
            const response = await fetch('/api/reservation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, guests, date, time })
            });

            const result = await response.json();

            if (result.success) {
                messageDiv.style.color = "green";
                messageDiv.innerText = result.message;
                reservationForm.reset();
                // Re-vérifier le statut pour réinsérer les inputs read-only si connectés
                checkUserStatus();
            } else {
                messageDiv.style.color = "red";
                messageDiv.innerText = result.message;
            }
        } catch (err) {
            console.error("Erreur:", err);
            messageDiv.style.color = "red";
            messageDiv.innerText = "Impossible de contacter le serveur.";
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Envoyer la demande de réservation";
            }
        }
    });
}

// ANIMATIONS AU SCROLL (Apparition fluide)
document.addEventListener("DOMContentLoaded", () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.card-section').forEach(section => {
        section.classList.add('fade-in');
        observer.observe(section);
    });
});
