// frontend/js/events.js
(function() {
    if (sessionStorage.getItem('eventsShown')) {
        console.log("Events already shown this session. Skipping notifications.");
        return;
    }
    console.log("MapNexus Event Notification System Initialized");

    let toastContainer = null;
    let seenEventIds = new Set();

    function initToastContainer() {
        if (document.getElementById('event-toast-container')) return;
        toastContainer = document.createElement('div');
        toastContainer.id = 'event-toast-container';
        toastContainer.className = 'event-toast-container';
        document.body.appendChild(toastContainer);
    }

    async function fetchActiveEvents() {
        try {
            const res = await fetch('/api/event/active');
            const data = await res.json();
            
            if (data.status === "success" && data.events) {
                data.events.forEach(event => {
                    // Only show if we haven't seen it in this session
                    if (!seenEventIds.has(event.id)) {
                        showEventToast(event);
                        seenEventIds.add(event.id);
                    }
                });
                // Set flag so we don't show again in this session (even on refresh)
                if (data.events.length > 0) {
                    sessionStorage.setItem('eventsShown', 'true');
                }
            }
        } catch (error) {
            console.warn("Could not fetch city events:", error);
        }
    }

    function showEventToast(event) {
        initToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `event-toast ${event.category || ''}`;
        
        toast.innerHTML = `
            <button class="event-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
            <div class="event-icon">
                <i class="fa-solid ${event.icon || 'fa-star'}"></i>
            </div>
            <div class="event-content">
                <h4>${event.name}</h4>
                <p>${event.description}</p>
                <div class="event-time">
                    <i class="fa-regular fa-clock"></i> ${event.startTime} - ${event.endTime} น.
                </div>
            </div>
        `;

        // Click to go to map or details
        toast.onclick = (e) => {
            if (e.target.closest('.event-close')) return;
            // Highlight location on map if we are on map page?
            console.log("Event clicked:", event.name);
        };

        toastContainer.appendChild(toast);

        // Auto remove after 8 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'toastFadeOut 0.5s forwards';
                setTimeout(() => toast.remove(), 500);
            }
        }, 8000);
    }

    // Initial load
    initToastContainer();
    fetchActiveEvents();

    // Check every 30 seconds for new events
    setInterval(fetchActiveEvents, 30000);

})();
