const form = document.querySelector('.signin-form');
const email = document.querySelector('#email');
const password = document.querySelector('#password');
const status = document.querySelector('#login-status');
const togglePassword = document.querySelector('#toggle-password');
const animationDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;

$('.signin-form .invalid-feedback').hide();

togglePassword.addEventListener('click', () => {
    const showPassword = password.type === 'password';
    password.type = showPassword ? 'text' : 'password';
    togglePassword.textContent = showPassword ? 'Hide' : 'Show';
});

function validateInput(input) {
    let message = '';

    if (input.validity.valueMissing) {
        message = input === email
            ? 'Please enter your email address.'
            : 'Please enter your password.';
    } else if (input.validity.typeMismatch) {
        message = 'Please enter a valid email address.';
    }

    const feedback = $(`#${input.id}-error`);
    feedback.stop(true, true);

    if (message) {
        feedback.text(message).slideDown(animationDuration);
    }
    input.classList.toggle('is-valid', input.validity.valid);
    input.classList.toggle('is-invalid', !input.validity.valid);
}

form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = '';
    email.value = email.value.trim();

    form.classList.add('was-validated');
    [email, password].forEach(validateInput);

    if (!form.checkValidity()) {
        form.querySelector(':invalid').focus();
        return;
    }

    window.location.assign('../index.html');
});

[email, password].forEach((input) => {
    input.addEventListener('input', () => {
        if (form.classList.contains('was-validated')) validateInput(input);
        status.textContent = '';
    });
});
