document.addEventListener('DOMContentLoaded', function() {
    // 1. Restore Scroll Position
    var scrollPos = localStorage.getItem('scrollpos');
    if (scrollPos) window.scrollTo(0, scrollPos);

    // 2. Handle URL Parameters (Events) - Initial Load
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

    const chains = document.querySelectorAll('.chain-container');
    chains.forEach(chain => {
        chain.scrollLeft = chain.scrollWidth;
    });

    // 3. AJAX Form Handling
    const forms = document.querySelectorAll('.ajax-form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // Stop page reload

            const formData = new FormData(this);
            const habitId = this.getAttribute('data-habit-id');

            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateHabitUI(habitId, data, this); // Pass 'this' (the form) to reset it
                }
            })
            .catch(error => console.error('Error:', error));
        });
    });
});

// Save scroll position before unload
window.onbeforeunload = function() {
    localStorage.setItem('scrollpos', window.scrollY);
};

/* --- UI Update Logic --- */
function updateHabitUI(id, data, formElement) {
    const habitRow = document.getElementById(`habit-${id}`);
    
    // 1. Clear Form Input (Progressive Habits)
    if (formElement) {
        formElement.reset();
    }

    // 2. Update Header Streak Text
    const streakSpan = document.getElementById(`streak-val-${id}`);
    if (streakSpan) streakSpan.innerText = data.new_streak;

    // 3. Update Visuals (Nodes & Shields)
    
    // A) Standard Nodes (Binary/Progressive)
    const todayNode = habitRow.querySelector('.node.today');
    if (todayNode) {
        // Update Streak Number inside the node
        const nodeStreak = todayNode.querySelector('.streak-num');
        if (nodeStreak) nodeStreak.innerText = data.new_streak;

        // If completed, add the class
        if (data.is_completed) {
            todayNode.classList.add('completed');
        }

        const ring = todayNode.querySelector('circle[stroke-dasharray]');
        if (ring) {
            const offset = 283 - (283 * data.fill_percent / 100);
            ring.style.strokeDashoffset = offset;
        }

        const fillCircle = todayNode.querySelector('.fill-circle');
        if (fillCircle) {
            fillCircle.style.opacity = data.is_completed ? '1' : '0';
        }
    }

    // B) Vices (Shields)
    const shield = habitRow.querySelector('.shield');
    if (shield) {
        // Update the number inside the shield
        const shieldStreak = habitRow.querySelector('.shield-streak');
        if (shieldStreak) shieldStreak.innerText = data.new_streak;

        if (data.event === 'deflected') {
            shield.classList.add('deflecting');
            setTimeout(() => shield.classList.remove('deflecting'), 500);
        }
        
        if (data.is_completed) {
            shield.classList.add('active');
        }
    }

    // 4. Update Controls (Buttons)
    const controls = document.getElementById(`controls-${id}`);
    
    // Determine if we should replace the button
    // We replace buttons for Binary and Vices when completed.
    // We usually DO NOT replace Progressive buttons (so you can add more).
    const isProgressive = formElement.classList.contains('prog-form');

    if (data.is_completed && controls && !isProgressive) {
        if (data.event === 'deflected') {
            // Vice Completed State
            controls.innerHTML = '<button class="btn btn-vice-disabled" disabled>Shield Active</button>';
        } else {
            // Binary Completed State
            controls.innerHTML = '<button class="btn btn-disabled" disabled>Completed!</button>';
            
            // Only fire confetti for binary completion (optional)
            if (window.confetti) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#4CAF50', '#FFD700', '#2196F3']
                });
            }
        }
    } else if (isProgressive && controls) {
        // For progressive, just update the text x / y
        const progStatus = controls.previousElementSibling || controls.querySelector('.prog-status'); 
        // Note: In HTML structure, .prog-status is sibling to form, inside .log-controls or .habit-info
        // Let's try to find it within the parent .habit-info or .log-controls
        
        // Use a broader selector to find the status text in this specific habit row
        const statusText = habitRow.querySelector('.prog-status small');
        if (statusText) {
             // We need the target. Since we don't have it in 'data', we can parse the old text or just update the current value
             // The simplest way is to update just the current value part if we want to be precise, 
             // but let's assume the format "Value / Target Unit"
             let textParts = statusText.innerText.split('/');
             if(textParts.length > 1) {
                 statusText.innerText = `${parseInt(data.new_value)} /${textParts[1]}`;
             }
        }

        if (data.is_completed && window.confetti) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#4CAF50', '#FFD700', '#2196F3']
            });
        }
    }
}

/* --- Timer Logic (Existing) --- */
let timers = {};

window.toggleTimer = function(id) {
    const display = document.getElementById(`timer-display-${id}`);

    if (timers[id]) {
        clearInterval(timers[id].interval);
        delete timers[id];
        display.style.color = '#999';
    } else {
        let startTime = Date.now();
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

    if (timers[id]) {
        clearInterval(timers[id].interval);
        delete timers[id];
    }

    const inputField = document.getElementById(`input-${id}`);
    const form = document.getElementById(`form-${id}`);
    
    if(inputField && form) {
        inputField.value = minutes.toFixed(2);
        // Dispatch submit event to trigger the AJAX handler
        const submitEvent = new Event('submit', {
            'bubbles': true,
            'cancelable': true
        });
        form.dispatchEvent(submitEvent);
    }
};