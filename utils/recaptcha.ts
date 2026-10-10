export const validatedHuman = async (token: unknown) => {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret || typeof token !== 'string' || token.length === 0) {
        return false;
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token }),
    });
    const data = await response.json();
    return data.success === true;
};
