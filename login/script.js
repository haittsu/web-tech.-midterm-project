const form = document.querySelector('.signin-form');
const email = document.querySelector('#email');
const password = document.querySelector('#password');
const status = document.querySelector('#login-status');
const togglePassword = document.querySelector('#toggle-password');

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

    document.querySelector(`#${input.id}-error`).textContent = message;
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

    status.textContent = 'Signed in.';
});

[email, password].forEach((input) => {
    input.addEventListener('input', () => {
        if (form.classList.contains('was-validated')) validateInput(input);
        status.textContent = '';
    });
});
