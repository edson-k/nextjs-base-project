export const validatetHuman = async (token: string) => {
    const secret = process.env.NEXT_PUBLIC_RECAPTCHA_SECRET_KEY;
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify?secret=' + secret + '&response=' + token, {
        method: 'POST',
    });
    const data = await response.json();
    return data.success;
};