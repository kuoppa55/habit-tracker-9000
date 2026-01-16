let myChart = null;

// Win98 Chart Theme
const win98Theme = {
    backgroundColor: '#FFFFFF',
    gridColor: '#C0C0C0',
    textColor: '#000000',
    tooltipBg: '#FFFFE1',
    tooltipBorder: '#000000',
    font: {
        family: 'Tahoma, sans-serif',
        size: 13
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize with Week view
    switchView('week');
});

function switchView(view) {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;

    const context = window.habitContext;
    const viewData = context.data[view];
    const habitType = context.type;
    const color = context.color;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.toLowerCase().includes(view)) btn.classList.add('active');
    });

    let total = viewData.total;
    if (total % 1 !== 0) total = total.toFixed(1); // Decimals for progressive
    document.getElementById('total-display').innerText = total;

    const ring = document.getElementById('medal-ring');
    const star = document.getElementById('medal-star');
    const text = document.getElementById('medal-text');
    const container = document.getElementById('medal-container');

    const completed = viewData.completed;
    const possible = viewData.possible;

    let percent = (possible > 0) ? (completed / possible) : 0;
    if (percent > 1) percent = 1;

    const circumference = 176;
    const offset = circumference - (circumference * percent);
    ring.style.strokeDashoffset = offset;

    if (percent === 1 && possible > 0) {
        // Unlock the Star
        star.style.opacity = '1';
        star.style.filter = 'none';

        text.style.opacity = '0'; // Hide percentage

        // Simple scale, no glow for Win98
        container.style.transform = 'scale(1.1)';
        container.style.filter = 'none';

    } else {
        // Locked State (Show progress only)
        star.style.opacity = '0';
        star.style.filter = 'none';

        text.style.opacity = '1';
        text.textContent = Math.round(percent * 100) + "%";

        container.style.transform = 'scale(1)';
        container.style.filter = 'none';
    }

    let chartType = 'bar';
    let fillSetting = false;
    let tensionSetting = 0;

    if (habitType === 'progressive' && view === 'month') {
        chartType = 'line';
        fillSetting = { target: 'origin', above: color + '33' };
        tensionSetting = 0; // No smooth curves for Win98
    }

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx.getContext('2d'), {
        type: chartType,
        data: {
            labels: viewData.labels,
            datasets: [{
                label: habitType === 'binary' ? 'Completed' : 'Value',
                data: viewData.values,
                backgroundColor: color,
                borderColor: '#000000',
                borderWidth: 1,
                borderRadius: 0, // Square corners for Win98
                fill: fillSetting,
                tension: tensionSetting,
                pointRadius: chartType === 'line' ? 3 : 0,
                pointBackgroundColor: color,
                pointBorderColor: '#000000',
                pointBorderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0 // No animations for Win98
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: win98Theme.gridColor,
                        lineWidth: 1
                    },
                    border: {
                        color: '#000000',
                        width: 1
                    },
                    ticks: {
                        font: win98Theme.font,
                        color: win98Theme.textColor,
                        stepSize: (habitType !== 'progressive' && view !== 'year') ? 1 : undefined
                    },
                    suggestedMax: (habitType !== 'progressive' && view !== 'year') ? 1.2 : undefined
                },
                x: {
                    grid: {
                        display: true,
                        color: win98Theme.gridColor,
                        lineWidth: 1
                    },
                    border: {
                        color: '#000000',
                        width: 1
                    },
                    ticks: {
                        font: win98Theme.font,
                        color: win98Theme.textColor
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: win98Theme.tooltipBg,
                    titleColor: win98Theme.textColor,
                    bodyColor: win98Theme.textColor,
                    borderColor: win98Theme.tooltipBorder,
                    borderWidth: 1,
                    titleFont: win98Theme.font,
                    bodyFont: win98Theme.font,
                    cornerRadius: 0, // Square corners
                    padding: 6,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return context.raw + (habitType === 'progressive' ? ' ' + window.habitContext.unit : '');
                        }
                    }
                }
            }
        }
    });
}

window.switchView = switchView;
