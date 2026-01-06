document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;

    const dates = JSON.parse(ctx.dataset.dates);
    const values = JSON.parse(ctx.dataset.values);
    const habitType = ctx.dataset.type;
    const color = ctx.dataset.color;
    const target = parseFloat(ctx.dataset.target);

    new Chart(ctx.getContext('2d'), {
        type: habitType === 'progressive' ? 'bar' : 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Log Value',
                data: values,
                backgroundColor: color,
                borderColor: color,
                borderWidth: 2,
                tension: 0.3,
                fill: habitType === 'binary' ? {target: 'origin', above: color + '33'} : false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {color: '#f0f0f0'},
                    suggestedMax: target * 1.2
                },
                x: {
                    grid: {display: false}
                }
            },
            plugins: {
                legend: {display: false},
                tooltip: {
                    backgroundColor: '#333',
                    titleFont: {size: 13},
                    bodyFont: {size: 14},
                }
            }
        }
    });
});