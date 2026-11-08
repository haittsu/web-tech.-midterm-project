const form = document.querySelector('.signin-form');
const email = document.querySelector('#email');
const password = document.querySelector('#password');
const status = document.querySelector('#login-status');

form.noValidate = true;

form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = '';
    email.value = email.value.trim();

    email.setCustomValidity('');
    password.setCustomValidity('');

    if (!email.value) {
        email.setCustomValidity('Please enter your email address.');
    } else if (email.validity.typeMismatch) {
        email.setCustomValidity('Please enter a valid email address.');
    }

    if (!password.value) {
        password.setCustomValidity('Please enter your password.');
    }

    if (!form.reportValidity()) return;

    status.textContent = 'Signed in.';
});

[email, password].forEach((input) => {
    input.addEventListener('input', () => {
        input.setCustomValidity('');
        status.textContent = '';
    });
});
