let myChart = null;

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

    let chartType = 'bar';
    let fillSetting = false;
    let tensionSetting = 0;

    if (habitType === 'progressive' && view === 'month') {
        chartType = 'line';
        fillSetting = { target: 'origin', above: color + '33' }; // Add transparency
        tensionSetting = 0.3; // Smooth curves
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
                borderColor: color,
                borderWidth: chartType === 'line' ? 2 : 0,
                borderRadius: 4, // Nice rounded corners on bars
                fill: fillSetting,
                tension: tensionSetting
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { display: false }, // Cleaner look
                    // For binary week/month, max is 1. For others, let it float.
                    suggestedMax: (habitType !== 'progressive' && view !== 'year') ? 1.2 : undefined,
                    ticks: {
                        // Hide decimals for binary charts
                        stepSize: (habitType !== 'progressive' && view !== 'year') ? 1 : undefined
                    }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#333',
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