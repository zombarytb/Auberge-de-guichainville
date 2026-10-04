document.addEventListener("DOMContentLoaded", () => {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    const discordWebhookUrl = "REMPLACE_PAR_TON_URL_PROXY";
    const discordGuildId = "1342602738604773436";

    // =========================================================================
    // A. GESTION DU PRELOADER (SI PRÉSENT SUR LA PAGE)
    // =========================================================================
    const preloader = document.querySelector(".cyber-preloader");
    if (preloader) {
        document.body.style.overflow = "hidden";
        setTimeout(() => {
            preloader.classList.add("fade-out");
            document.body.style.overflow = "";
        }, 1300);
    } else {
        document.body.style.overflow = "";
    }

    const localLinks = document.querySelectorAll(".nav-links a, .hero-action-group a");
    localLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");

            if (href && !href.startsWith("#") && !link.getAttribute("target")) {
                e.preventDefault();
                if (preloader) {
                    preloader.classList.remove("fade-out");
                    preloader.classList.add("fade-in");

                    setTimeout(() => {
                        window.location.href = href;
                    }, 450);
                } else {
                    window.location.href = href;
                }
            }
        });
    });

    // =========================================================================
    // B. ANIMATIONS DE SCROLL (INTERSECTION OBSERVER)
    // =========================================================================
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("reveal-active");
            }
        });
    }, {
        threshold: 0.05,
        rootMargin: "0px 0px -20px 0px"
    });

    document.querySelectorAll(".scroll-reveal").forEach(element => {
        revealObserver.observe(element);
    });

    // =========================================================================
    // C. CHARGEMENT DU PLANNING DEPUIS planning.json
    // =========================================================================
    fetch("planning.json")
        .then(response => {
            if (!response.ok) throw new Error("Impossible de charger planning.json");
            return response.json();
        })
        .then(data => {
            const nextLiveEl = document.getElementById("next-live-text");
            if (nextLiveEl && data.nextLiveDate) {
                nextLiveEl.textContent = data.nextLiveDate;
            }

            if (data.counters) {
                const counterMap = {
                    twitch:  document.querySelector(".twitch-border .network-counter span"),
                    youtube: document.querySelector(".youtube-border .network-counter span"),
                    tiktok:  document.querySelector(".tiktok-border .network-counter span"),
                    discord: document.querySelector(".discord-border .network-counter span")
                };
                for (const [key, el] of Object.entries(counterMap)) {
                    if (el && data.counters[key]) {
                        el.textContent = data.counters[key];
                    }
                }
            }

            const weeklyGrid = document.getElementById("weekly-grid");
            if (weeklyGrid && data.weeklySchedule) {
                weeklyGrid.innerHTML = "";
                data.weeklySchedule.forEach(item => {
                    const isLive = item.status === "live";
                    const card = document.createElement("div");
                    card.className = `day-card-modern scroll-reveal${isLive ? " is-live-day" : ""}`;
                    card.innerHTML = `
                        <div class="day-card-header">
                            <span class="day-card-name">${item.day}</span>
                            <span class="status-badge ${isLive ? "live" : "offline"}">
                                ${isLive ? "LIVE STREAM" : "OFFLINE"}
                            </span>
                        </div>
                        <div class="day-card-body">${item.text}</div>
                    `;
                    weeklyGrid.appendChild(card);
                    revealObserver.observe(card);
                });
            }
        })
        .catch(err => {
            console.warn("planning.json non disponible :", err.message);
            const nextLiveEl = document.getElementById("next-live-text");
            if (nextLiveEl) nextLiveEl.textContent = "Consulte le Discord pour les dates !";
        });

    // =========================================================================
    // D. ENVOI DU FORMULAIRE DE CONTACT/SUGGESTIONS
    // =========================================================================
    const suggestionForm = document.getElementById("suggestion-form");
    const formFeedback = document.getElementById("form-feedback");

    if (suggestionForm && formFeedback) {
        suggestionForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const pseudo = document.getElementById("user-pseudo").value;
            const type = document.getElementById("suggestion-type").value;
            const message = document.getElementById("user-message").value;

            const discordMessage = {
                username: "Système de Transmission Zombar",
                avatar_url: "https://i.imgur.com/4M79p9f.png",
                embeds: [{
                    title: `📩 Nouvelle Transmission : ${type}`,
                    color: 15651145,
                    fields: [
                        { name: "👤 Expéditeur", value: `**${pseudo}**`, inline: true },
                        { name: "🏷️ Catégorie", value: type, inline: true },
                        { name: "📝 Contenu", value: message }
                    ],
                    footer: { text: "ZOMBAR WEB PORTAL" },
                    timestamp: new Date().toISOString()
                }]
            };

            fetch(discordWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(discordMessage)
            })
            .then(response => {
                if (!response.ok) throw new Error("Erreur réseau");

                formFeedback.innerHTML = `
                    <div class="terminal-success-box">
                        <div><i class="fa-solid fa-check"></i> <strong>[SUCCESS] TRANSMISSION ENVOYÉE.</strong></div>
                    </div>
                `;
                suggestionForm.reset();
            })
            .catch(error => {
                console.error("Erreur :", error);
                formFeedback.innerHTML = `
                    <div class="terminal-success-box" style="border-color: #ff3333; color: #ff3333;">
                        <div><i class="fa-solid fa-circle-xmark"></i> <strong>[ERREUR] ÉCHEC DE LA TRANSMISSION.</strong></div>
                    </div>
                `;
            });
        });
    }

    // =========================================================================
    // E. EFFET CONFETTIS SUR CROWN/TOTAL ABONNÉS
    // =========================================================================
    const totalBtn = document.getElementById("total-subs-btn");

    if (totalBtn) {
        totalBtn.addEventListener("click", () => {
            if (typeof confetti === "function") {
                confetti({
                    particleCount: 110,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#33ff00', '#ff6600', '#ffd700', '#00f2fe']
                });
            }

            totalBtn.style.transition = "transform 0.15s ease";
            totalBtn.style.transform = "scale(1.15) rotate(-3deg)";
            setTimeout(() => {
                totalBtn.style.transform = "scale(1) rotate(0deg)";
            }, 150);
        });
    }

    // =========================================================================
    // F. STATUT TWITCH DYNAMIQUE (BADGE LIVE)
    // =========================================================================
    const twitchBadge = document.getElementById("twitch-live-badge");

    if (twitchBadge) {
        let isLive = false; 

        if (isLive) {
            twitchBadge.classList.remove("offline");
            twitchBadge.classList.add("is-live");
            twitchBadge.querySelector(".live-text").textContent = "EN LIVE SUR TWITCH";
        }
    }

    // =========================================================================
    // G. RECUPERATION EN TEMPS RÉEL DU WIDGET DISCORD
    // =========================================================================
    const countEl = document.getElementById("discord-online-count");
    const membersListEl = document.getElementById("discord-members-list");

    if (countEl && discordGuildId) {
        fetch(`https://discord.com/api/guilds/${discordGuildId}/widget.json`)
            .then(res => res.json())
            .then(data => {
                if (data && data.presence_count !== undefined) {
                    countEl.textContent = data.presence_count;

                    if (membersListEl && data.members) {
                        membersListEl.innerHTML = "";
                        data.members.slice(0, 10).forEach(member => {
                            if (member.avatar_url) {
                                const img = document.createElement("img");
                                img.src = member.avatar_url;
                                img.alt = member.username;
                                img.title = member.username;
                                img.className = "discord-avatar-item";
                                membersListEl.appendChild(img);
                            }
                        });
                    }
                }
            })
            .catch(() => {
                countEl.textContent = "50+";
            });
    }
});