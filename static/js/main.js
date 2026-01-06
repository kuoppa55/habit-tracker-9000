document.addEventListener('DOMContentLoaded', function() {
    // 1. Restore Scroll Position
    var scrollPos = localStorage.getItem('scrollpos');
    if (scrollPos) window.scrollTo(0, scrollPos);

    // 2. Handle URL Parameters (Events)
    const urlParams = new URLSearchParams(window.location.search);
    const eventType = urlParams.get('event');
    const eventId = urlParams.get('event_id');
    const dateParam = urlParams.get('date');

    if (eventType === 'completed') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#4CAF50', '#FFD700', '#2196F3']
        });
    } else if (eventType === 'deflected') {
        const shield = document.querySelector(`#habit-${eventId} .shield`);
        if (shield) {
            shield.classList.add('deflecting');
        }
    }

    // Clean URL
    if (eventType) {
        const newUrl = window.location.pathname + "?date=" + (dateParam || "");
        window.history.replaceState({}, document.title, newUrl);
    }
});

// Save scroll position before unload
window.onbeforeunload = function() {
    localStorage.setItem('scrollpos', window.scrollY);
};

/* --- Timer Logic --- */
let timers = {};

// We attach these to window so the onclick attributes in HTML can find them
window.toggleTimer = function(id) {
    const display = document.getElementById(`timer-display-${id}`);

    if (timers[id]) {
        clearInterval(timers[id].interval);
        delete timers[id];
        display.style.color = '#999';
    } else {
        let startTime = Date.now();
        
        // Parse current text to respect existing time
        let currentText = display.innerText.split(':');
        let currentSeconds = (parseInt(currentText[0]) * 60) + parseInt(currentText[1]);
        
        if (currentSeconds > 0) {
            startTime = startTime - (currentSeconds * 1000);
        }

        display.style.color = '#000';

        timers[id] = {
            interval: setInterval(() => {
                let elapsed = Math.floor((Date.now() - startTime) / 1000);
                let mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
                let secs = (elapsed % 60).toString().padStart(2, '0');
                display.innerText = `${mins}:${secs}`;
            }, 1000)
        };
    }
};

window.saveTimer = function(id) {
    const display = document.getElementById(`timer-display-${id}`).innerText;
    const parts = display.split(':');
    const minutes = parseInt(parts[0]) + (parseInt(parts[1]) / 60);

    if (minutes <= 0) return; 

    // Stop timer
    if (timers[id]) {
        clearInterval(timers[id].interval);
        delete timers[id];
    }

    // Fill form and submit
    const inputField = document.getElementById(`input-${id}`);
    const form = document.getElementById(`form-${id}`);
    
    if(inputField && form) {
        inputField.value = minutes.toFixed(2);
        form.submit();
    } else {
        console.error("Could not find form or input for ID:", id);
    }
};