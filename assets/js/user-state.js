(() => {
    const storageKey = 'crysplay:user';

    function getUser() {
        try {
            const user = JSON.parse(localStorage.getItem(storageKey));
            return user && typeof user.name === 'string' && user.name.trim()
                ? { name: user.name } : null;
        } catch {
            return null;
        }
    }

    function renderUser() {
        const user = getUser();
        const loginUrl = document.documentElement.dataset.loginUrl;
        if (!user && loginUrl) {
            window.location.replace(loginUrl);
            return;
        }
        const name = user ? user.name : 'Guest';
        const initial = Array.from(name)[0].toLocaleUpperCase();
        document.querySelectorAll('.profile-avatar, [data-user-avatar]').forEach(avatar => {
            avatar.textContent = initial;
            avatar.setAttribute('aria-label', user ? `${name}'s profile` : 'Sign in');
            avatar.title = user ? name : 'Sign in';
        });
        document.querySelectorAll('[data-user-name]').forEach(element => {
            element.textContent = name;
        });
        document.querySelectorAll('[data-user-handle]').forEach(element => {
            element.textContent = user ? `@${name}` : 'Sign in to personalize your studio';
        });
    }

    function signIn(email) {
        const name = email.trim().split('@')[0];
        if (!name) return false;
        try {
            localStorage.setItem(storageKey, JSON.stringify({ name }));
            renderUser();
            return true;
        } catch {
            return false;
        }
    }

    window.CrysPlayUser = { getUser, signIn };
    window.addEventListener('storage', event => {
        if (event.key === storageKey || event.key === null) renderUser();
    });
    window.addEventListener('pageshow', renderUser);
    renderUser();
})();
