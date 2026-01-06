function toggleFields() {
    const type = document.getElementById('type').value;
    const progressiveFields = document.getElementById('progressive-fields');
    const targetInput = document.getElementById('target');

    if (type === 'progressive') {
        progressiveFields.style.display = 'block';
        targetInput.required = true;
    } else {
        progressiveFields.style.display = 'none';
        targetInput.required = false;
        if (type === 'binary') targetInput.value = 1;
    }
}

// Run on load
document.addEventListener('DOMContentLoaded', toggleFields);